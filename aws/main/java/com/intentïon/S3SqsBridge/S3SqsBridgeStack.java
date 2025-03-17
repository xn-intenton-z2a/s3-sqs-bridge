package com.intentïon.S3SqsBridge;

import software.amazon.awscdk.*;
import software.amazon.awscdk.services.ecr.assets.DockerImageAsset;
import software.amazon.awscdk.services.ecs.*;
import software.amazon.awscdk.services.ecs.patterns.ApplicationLoadBalancedFargateService;
import software.amazon.awscdk.services.iam.*;
import software.amazon.awscdk.services.iam.PolicyDocument;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.s3.*;
import software.amazon.awscdk.services.sqs.Queue;
import software.constructs.Construct;

import java.util.*;

public class S3SqsBridgeStack extends Stack {

    public S3SqsBridgeStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        final String bucketName = getConfigValue("s3BucketName");
        final boolean useExistingBucket = Boolean.parseBoolean(getConfigValue("s3UseExistingBucket"));
        final boolean retainBucket = Boolean.parseBoolean(getConfigValue("s3RetainBucket"));
        final String queueName = getConfigValue("sqsQueueName");
        final String taskServiceName = getConfigValue("taskServiceName");
        final int taskCpu = Integer.parseInt(getConfigValue("taskCpu"));
        final int taskMemory = Integer.parseInt(getConfigValue("taskMemory"));
        final int taskPort = Integer.parseInt(getConfigValue("taskPort"));

        // S3 Bucket creation with versioning and appropriate removal policies.
        Bucket s3Bucket;
        if (useExistingBucket) {
            s3Bucket = Bucket.fromBucketName(this, "ExistingBucket", bucketName);
        } else {
            s3Bucket = Bucket.Builder.create(this, "EventBucket")
                    .bucketName(bucketName)
                    .versioned(true)
                    .removalPolicy(retainBucket ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY)
                    .autoDeleteObjects(!retainBucket)
                    .build();
        }

        // SQS Queue for events.
        Queue eventQueue = Queue.Builder.create(this, "EventQueue")
                .queueName(queueName)
                .visibilityTimeout(Duration.seconds(300))
                .build();

        // Refined IAM Role for ECS Tasks with least-privilege inline policies.
        PolicyStatement s3Policy = PolicyStatement.Builder.create()
                .actions(Arrays.asList("s3:GetObject", "s3:ListBucket"))
                .resources(Arrays.asList(s3Bucket.getBucketArn(), s3Bucket.getBucketArn() + "/*"))
                .build();

        PolicyStatement sqsPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList("sqs:SendMessage"))
                .resources(Arrays.asList(eventQueue.getQueueArn()))
                .build();

        PolicyStatement logsPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList("logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"))
                .resources(Arrays.asList("*"))
                .build();

        Role ecsTaskRole = Role.Builder.create(this, "EcsTaskRole")
                .assumedBy(new ServicePrincipal("ecs-tasks.amazonaws.com"))
                .inlinePolicies(Map.of(
                        "TaskPolicy", PolicyDocument.Builder.create()
                                .statements(Arrays.asList(s3Policy, sqsPolicy, logsPolicy))
                                .build()
                ))
                .build();

        // Docker Image for the reseed task.
        DockerImageAsset dockerImage = DockerImageAsset.Builder.create(this, "DockerImage")
                .directory("./") // Project root containing Dockerfile
                .build();

        // ECS Cluster and Fargate Task Definition (using Spot for cost optimization).
        Cluster cluster = Cluster.Builder.create(this, "Cluster").build();

        FargateTaskDefinition taskDefinition = FargateTaskDefinition.Builder.create(this, "TaskDefinition")
                .cpu(taskCpu)
                .memoryLimitMiB(taskMemory)
                .taskRole(ecsTaskRole)
                .build();

        ContainerDefinition container = taskDefinition.addContainer("ReseedContainer",
                ContainerDefinitionOptions.builder()
                        .image(ContainerImage.fromDockerImageAsset(dockerImage))
                        .logging(LogDriver.awsLogs(AwsLogDriverProps.builder()
                                .streamPrefix(taskServiceName)
                                .build()))
                        .environment(Map.of(
                                "BUCKET_NAME", bucketName,
                                "QUEUE_URL", eventQueue.getQueueUrl(),
                                "AWS_REGION", this.getRegion()
                        ))
                        .build());

        container.addPortMappings(PortMapping.builder()
                .containerPort(taskPort)
                .protocol(Protocol.TCP)
                .build());

        // Fargate Service using Spot Instances for reseed job.
        ApplicationLoadBalancedFargateService reseedService = ApplicationLoadBalancedFargateService.Builder.create(this, "ReseedService")
                .cluster(cluster)
                .serviceName(taskServiceName)
                .cpu(taskCpu)
                .memoryLimitMiB(taskMemory)
                .taskDefinition(taskDefinition)
                .desiredCount(0) // Start with 0; scale when needed.
                .capacityProviderStrategies(List.of(
                        CapacityProviderStrategy.builder()
                                .capacityProvider("FARGATE_SPOT")
                                .weight(1)
                                .build()
                ))
                .publicLoadBalancer(false)
                .build();

        // Grant the ECS task role permission to send messages and read the bucket.
        eventQueue.grantSendMessages(ecsTaskRole);
        s3Bucket.grantRead(ecsTaskRole);

        // Outputs for post-deployment verification.
        CfnOutput.Builder.create(this, "BucketName")
                .value(s3Bucket.getBucketName())
                .build();

        CfnOutput.Builder.create(this, "QueueUrl")
                .value(eventQueue.getQueueUrl())
                .build();

        CfnOutput.Builder.create(this, "EcsClusterArn")
                .value(cluster.getClusterArn())
                .build();

        CfnOutput.Builder.create(this, "TaskRoleArn")
                .value(ecsTaskRole.getRoleArn())
                .build();
    }

    private String getConfigValue(String key) {
        Object value = this.getNode().tryGetContext(key);
        if (value == null || value.toString().isEmpty()) {
            throw new IllegalArgumentException("Missing required context key: " + key);
        }
        return value.toString();
    }
}
