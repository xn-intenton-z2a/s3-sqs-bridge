package com.intentïon.S3SqsBridge;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.CustomResource;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.customresources.Provider;
import software.amazon.awscdk.services.dynamodb.Attribute;
import software.amazon.awscdk.services.dynamodb.AttributeType;
import software.amazon.awscdk.services.dynamodb.Table;
import software.amazon.awscdk.services.iam.ArnPrincipal;
import software.amazon.awscdk.services.iam.Effect;
import software.amazon.awscdk.services.iam.PolicyDocument;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.iam.ServicePrincipal;
import software.amazon.awscdk.services.lambda.AssetImageCodeProps;
import software.amazon.awscdk.services.lambda.DockerImageCode;
import software.amazon.awscdk.services.lambda.DockerImageFunction;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.EventType;
import software.amazon.awscdk.services.s3.IBucket;
import software.amazon.awscdk.services.s3.notifications.SqsDestination;
import software.amazon.awscdk.services.sqs.Queue;
import software.constructs.Construct;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

public class S3SqsBridgeStack extends Stack {

    public S3SqsBridgeStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public S3SqsBridgeStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        final String s3WriterArnPrinciple = getConfigValue("S3_WRITER_ARN_PRINCIPLE", "s3WriterArnPrinciple");
        final String s3WriterRoleName = getConfigValue("S3_WRITER_ROLE_NAME", "s3WriterRoleName");
        final String bucketName = getConfigValue("BUCKET_NAME", "s3BucketName");
        final String objectPrefix = getConfigValue("OBJECT_PREFIX", "s3ObjectPrefix");
        final boolean useExistingBucket = Boolean.parseBoolean(getConfigValue("USE_EXISTING_BUCKET", "s3UseExistingBucket"));
        final boolean retainBucket = Boolean.parseBoolean(getConfigValue("RETAIN_BUCKET", "s3RetainBucket"));
        final String sourceQueueName = getConfigValue("SQS_SOURCE_QUEUE_NAME", "sqsSourceQueueName");
        final String replayQueueName = getConfigValue("SQS_REPLAY_QUEUE_NAME", "sqsReplayQueueName");
        final String taskServiceName = getConfigValue("TASK_SERVICE_NAME", "taskServiceName");
        final int taskCpu = Integer.parseInt(getConfigValue("TASK_CPU", "taskCpu"));
        final int taskMemory = Integer.parseInt(getConfigValue("TASK_MEMORY", "taskMemory"));
        final int taskPort = Integer.parseInt(getConfigValue("TASK_PORT", "taskPort"));
        final String taskStartupCommand = getConfigValue("TASK_STARTUP_COMMAND", "taskStartupCommand");
        final String lambdaRuntime = getConfigValue("LAMBDA_RUNTIME", "lambdaRuntime");
        final String lambdaTarget = getConfigValue("LAMBDA_TARGET", "lambdaTarget");
        final String lambdaFormat = getConfigValue("LAMBDA_FORMAT", "lambdaFormat");
        final String lambdaEntry = getConfigValue("LAMBDA_ENTRY", "lambdaEntry");
        final String lambdaSourceFunctionName = getConfigValue("LAMBDA_SOURCE_FUNCTION_NAME", "lambdaSourceFunctionName");
        final String lambdaReplayFunctionName = getConfigValue("LAMBDA_REPLAY_FUNCTION_NAME", "lambdaReplayFunctionName");
        final String lambdaReplayBatchFunctionName = getConfigValue("LAMBDA_REPLAY_BATCH_FUNCTION_NAME", "lambdaReplayBatchFunctionName");
        final String lambdaLogLevel = getConfigValue("LAMBDA_LOG_LEVEL", "lambdaLogLevel");

        // S3 Bucket creation with versioning and appropriate removal policies.
        IBucket s3Bucket;
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

        // Create standalone IAM role with inline policy for S3 permissions
        PolicyStatement s3ObjectCrudPolicyStatement = PolicyStatement.Builder.create()
                .effect(Effect.ALLOW)
                .actions(List.of(
                        "s3:PutObject",
                        "s3:GetObject",
                        "s3:ListBucket",
                        "s3:DeleteObject"
                ))
                .resources(List.of(
                        s3Bucket.getBucketArn(),
                        s3Bucket.getBucketArn() + "/*"
                ))
                .build();
        Role s3AccessRole = Role.Builder.create(this, "S3AccessRole")
                .roleName(s3WriterRoleName)
                .assumedBy(new ArnPrincipal(s3WriterArnPrinciple))
                .inlinePolicies(java.util.Collections.singletonMap("S3AccessPolicy", PolicyDocument.Builder.create()
                        .statements(List.of(s3ObjectCrudPolicyStatement))
                        .build()))
                .build();

        // SQS Queue for actual PUT events.
        Queue sourceQueue = Queue.Builder.create(this, "SourceQueue")
                .queueName(sourceQueueName)
                .visibilityTimeout(Duration.seconds(300))
                .build();

        s3Bucket.addEventNotification(
                EventType.OBJECT_CREATED_PUT,
                new SqsDestination(sourceQueue)
        );

        // SQS Queue for replay PUT events.
        Queue replayQueue = Queue.Builder.create(this, "ReplayQueue")
                .queueName(replayQueueName)
                .visibilityTimeout(Duration.seconds(300))
                .build();

        // Create a DynamoDB table named "offsets" with the partition key 'bucketName'
        // and sort key 'objectPrefix'. The additional attributes 'source' and 'offset' will be
        // stored along with items, no explicit attribute definitions are required since DynamoDB is schemaless.
        Table offsetsTable = Table.Builder.create(this, "OffsetsTable")
                .tableName("offsets")
                .partitionKey(Attribute.builder()
                        .name("bucketName")
                        .type(AttributeType.STRING)
                        .build())
                .sortKey(Attribute.builder()
                        .name("objectPrefix")
                        .type(AttributeType.STRING)
                        .build())
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        software.amazon.awscdk.services.lambda.Runtime lambdaRuntimeEnum = software.amazon.awscdk.services.lambda.Runtime.ALL.stream()
                .filter(r -> r.toString().equalsIgnoreCase(lambdaRuntime))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid Lambda runtime: " + lambdaRuntime));
/*
        Function sourceLambda = NodejsFunction.Builder.create(this, "SQSSourceLambda")
                //.runtime(lambdaRuntimeEnum)
                .runtime(software.amazon.awscdk.services.lambda.Runtime.NODEJS_20_X)
                .entry(lambdaEntry)
                //.handler("lambda.handler")
                .bundling(BundlingOptions.builder()
                        //.bundleAwsSDK(true)
                        //.sourceMap(true)
                        //.sourcesContent(true)
                        .target(lambdaTarget)
                        //.format(OutputFormat.valueOf(lambdaFormat))
                        .format(OutputFormat.ESM)
                        //.image(Runtime.NODEJS_20_X.getBundlingImage())
                        .command(Arrays.asList("bash", "-c", "npm install && cp -R . /asset-output"))
                        //.command(Arrays.asList("bash", "-c", "npm cache clean --force && npm install && cp -R . /asset-output"))
                        //.logLevel(LogLevel.valueOf(lambdaLogLevel))
                        .logLevel(LogLevel.INFO)
                        //.keepNames(true)
                        //.mainFields(List.of("module", "main"))
                        //.externalModules(List.of("@aws-sdk/*", "cool-module"))
                        .environment(Map.of("TABLE_NAME", offsetsTable.getTableName()))
                        .build())
                .functionName(lambdaSourceFunctionName)
                //.sourceMap(true)
                //.sourcesContent(true)
                //.logLevel(LogLevel.INFO)
                //.keepNames(true)
                .build();
        offsetsTable.grantReadWriteData(sourceLambda);
        sourceLambda.addEventSource(new SqsEventSource(sourceQueue));

        Function replayLambda = NodejsFunction.Builder.create(this, "SQSReplayLambda")
                //.runtime(lambdaRuntimeEnum)
                .runtime(software.amazon.awscdk.services.lambda.Runtime.NODEJS_20_X)
                .entry(lambdaEntry)
                //.handler("lambda.handler")
                .bundling(BundlingOptions.builder()
                        //.bundleAwsSDK(true)
                        //.sourceMap(true)
                        //.sourcesContent(true)
                        .target(lambdaTarget)
                        //.format(OutputFormat.valueOf(lambdaFormat))
                        .format(OutputFormat.ESM)
                        //.image(Runtime.NODEJS_20_X.getBundlingImage())
                        .command(Arrays.asList("bash", "-c", "npm install && cp -R . /asset-output"))
                        //.command(Arrays.asList("bash", "-c", "npm cache clean --force && npm install && cp -R . /asset-output"))
                        //.logLevel(LogLevel.valueOf(lambdaLogLevel))
                        .logLevel(LogLevel.INFO)
                        //.keepNames(true)
                        //.mainFields(List.of("module", "main"))
                        //.externalModules(List.of("@aws-sdk/*", "cool-module"))
                        .environment(Map.of("TABLE_NAME", offsetsTable.getTableName()))
                        .build())
                .functionName(lambdaReplayFunctionName)
                //.sourceMap(true)
                //.sourcesContent(true)
                //.logLevel(LogLevel.INFO)
                //.keepNames(true)
                .build();
        offsetsTable.grantReadWriteData(sourceLambda);
        sourceLambda.addEventSource(new SqsEventSource(replayQueue));
*/
        // Optionally, you may add policy statements if you wish to restrict the Lambda permissions
        // even further by building and attaching custom IAM policies.

        // Refined IAM Role for ECS Tasks with least-privilege inline policies.
        PolicyStatement s3Policy = PolicyStatement.Builder.create()
                .actions(Arrays.asList("s3:GetObject", "s3:ListBucket"))
                .resources(Arrays.asList(s3Bucket.getBucketArn(), s3Bucket.getBucketArn() + "/*"))
                .build();

        PolicyStatement sqsPolicy = PolicyStatement.Builder.create()
                .actions(List.of("sqs:SendMessage"))
                .resources(List.of(replayQueue.getQueueArn()))
                .build();

        PolicyStatement logsPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList("logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"))
                .resources(List.of("*"))
                .build();

        Role ecsTaskRole = Role.Builder.create(this, "EcsTaskRole")
                .assumedBy(new ServicePrincipal("ecs-tasks.amazonaws.com"))
                .inlinePolicies(Map.of(
                        "TaskPolicy", PolicyDocument.Builder.create()
                                .statements(Arrays.asList(s3Policy, sqsPolicy, logsPolicy))
                                .build()
                ))
                .build();

        DockerImageFunction oneOffJobLambda = DockerImageFunction.Builder.create(this, "OneOffJobLambda")
                .code(DockerImageCode.fromImageAsset(".", AssetImageCodeProps.builder()
                        // Pass the build argument to set the handler for Lambda.
                        .buildArgs(Map.of("HANDLER", "src/lib/main.replayBatchLambdaHandler"))
                        .build()))
                //.code(DockerImageCode.fromImageAsset(".", (AssetImageCodeProps) DockerImageAssetOptions.builder()
                //        // Pass the build argument to set the handler for Lambda.
                //        .buildArgs(Map.of("HANDLER", "src/lib/main.replayBatchLambdaHandler"))
                //        .build()))
                .environment(Map.of(
                        "BUCKET_NAME", bucketName,
                        "OBJECT_PREFIX", objectPrefix,
                        "REPLAY_QUEUE_URL", replayQueue.getQueueArn()
                ))
                .functionName(lambdaReplayBatchFunctionName)
                .build();

        // Policy statement for bucket-level actions, for example to list objects.
        PolicyStatement listBucketPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList("s3:ListBucket","s3:ListBucketVersions"))
                .resources(Arrays.asList(s3Bucket.getBucketArn()))
                .build();

// Policy statement for object-level actions (reading objects and metadata).
        PolicyStatement getObjectPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList(
                        "s3:GetObject",
                        "s3:GetObjectVersion",
                        "s3:GetObjectTagging"
                ))
                .resources(Arrays.asList(s3Bucket.getBucketArn() + "/*"))
                .build();

// Attach both policy statements to your Lambda function's role.
        oneOffJobLambda.addToRolePolicy(listBucketPolicy);
        oneOffJobLambda.addToRolePolicy(getObjectPolicy);

        /*
        Function oneOffJobLambda2 = NodejsFunction.Builder.create(this, "SQSSourceLambda")
                //.runtime(lambdaRuntimeEnum)
                .runtime(software.amazon.awscdk.services.lambda.Runtime.NODEJS_20_X)
                .entry(lambdaEntry)
                //.handler("lambda.handler")
                //.handler("oneoff.handler")
                .bundling(BundlingOptions.builder()
                        //.bundleAwsSDK(true)
                        //.sourceMap(true)
                        //.sourcesContent(true)
                        .target(lambdaTarget)
                        //.format(OutputFormat.valueOf(lambdaFormat))
                        .format(OutputFormat.ESM)
                        //.image(Runtime.NODEJS_20_X.getBundlingImage())
                        .command(Arrays.asList("bash", "-c", "npm install && cp -R . /asset-output"))
                        //.command(Arrays.asList("bash", "-c", "npm cache clean --force && npm install && cp -R . /asset-output"))
                        //.logLevel(LogLevel.valueOf(lambdaLogLevel))
                        .logLevel(LogLevel.INFO)
                        //.keepNames(true)
                        //.mainFields(List.of("module", "main"))
                        //.externalModules(List.of("@aws-sdk/*", "cool-module"))
                        .environment(Map.of(
                                "BUCKET_NAME", bucketName,
                                "OBJECT_PREFIX", objectPrefix,
                                "REPLAY_QUEUE_URL", replayQueue.getQueueArn()
                        ))
                        .build())
                .functionName(lambdaReplayBatchFunctionName)
                //.sourceMap(true)
                //.sourcesContent(true)
                //.logLevel(LogLevel.INFO)
                //.keepNames(true)
                .build();
*/

        // Create a Lambda function for a one-off replay job
        //Function oneOffJobLambda2 = Function.Builder.create(this, "OneOffJobLambda")
        //        .runtime(Runtime.NODEJS_20_X)
        //        .handler("oneoff.handler")
        //        .code(Code.fromAsset("path/to/your/oneoff/code"))
        //        .timeout(Duration.minutes(15))
        //        .build();

        Provider oneOffJobProvider = Provider.Builder.create(this, "OneOffJobProvider")
                .onEventHandler(oneOffJobLambda)
                .build();

        CustomResource oneOffJobResource = CustomResource.Builder.create(this, "OneOffJobResource")
                .serviceToken(oneOffJobProvider.getServiceToken())
                .build();

        // Docker Image for the replay task.
        //DockerImageAsset dockerImage = DockerImageAsset.Builder.create(this, "DockerImage")
        //        .directory("./") // Project root containing Dockerfile
        //        .build();

        /*
        // ECS Cluster and Fargate Task Definition (using Spot for cost optimization).
        Cluster cluster = Cluster.Builder.create(this, "Cluster").build();

        FargateTaskDefinition taskDefinition = FargateTaskDefinition.Builder.create(this, "TaskDefinition")
                .cpu(taskCpu)
                .memoryLimitMiB(taskMemory)
                .taskRole(ecsTaskRole)
                .build();

        ContainerDefinition container = taskDefinition.addContainer("ReplayContainer",
                ContainerDefinitionOptions.builder()
                        .image(ContainerImage.fromDockerImageAsset(dockerImage))
                        .command(Collections.singletonList(taskStartupCommand))
                        .logging(LogDriver.awsLogs(AwsLogDriverProps.builder()
                                .streamPrefix(taskServiceName)
                                .build()))
                        .environment(Map.of(
                                "BUCKET_NAME", bucketName,
                                "OBJECT_PREFIX", objectPrefix,
                                "REPLAY_QUEUE_URL", replayQueue.getQueueArn()
                        ))
                        .build());

        container.addPortMappings(PortMapping.builder()
                .containerPort(taskPort)
                .protocol(Protocol.TCP)
                .build());

        // Fargate Service using Spot Instances for replay job.
        ApplicationLoadBalancedFargateService replayService = ApplicationLoadBalancedFargateService.Builder.create(this, "ReplayService")
                .cluster(cluster)
                .serviceName(taskServiceName)
                .cpu(taskCpu)
                .memoryLimitMiB(taskMemory)
                .taskDefinition(taskDefinition)
                .desiredCount(1) // Start with 0; scale when needed.
                .capacityProviderStrategies(List.of(
                        CapacityProviderStrategy.builder()
                                .capacityProvider("FARGATE_SPOT")
                                .weight(1)
                                .build()
                ))
                .publicLoadBalancer(false)
                .build();

        // Grant the ECS task role permission to send messages and read the bucket.
        sourceQueue.grantSendMessages(ecsTaskRole);
        s3Bucket.grantRead(ecsTaskRole);
*/

        /*
        List<Object> imageEnvironmentVariables = List.of(
                Map.of("name", "BUCKET_NAME", "value", s3Bucket.getBucketName()),
                Map.of("name", "OBJECT_PREFIX", "value", objectPrefix),
                Map.of("name", "REPLAY_QUEUE_URL", "value", replayQueue.getQueueUrl()),
        );

        // Create an App Runner service for the consumer container
        CfnService.ImageConfigurationProperty imageConfiguration = CfnService.ImageConfigurationProperty.builder()
                .port(String.valueOf(taskPort))
                .runtimeEnvironmentVariables(imageEnvironmentVariables)
                .build();

        CfnService.ImageRepositoryProperty imageRepository = CfnService.ImageRepositoryProperty.builder()
                .imageIdentifier(dockerImage.getImageUri())
                .imageRepositoryType("ECR")
                .imageConfiguration(imageConfiguration)
                .build();

        Role appRunnerEcrAccessRole = Role.Builder.create(this, "AppRunnerEcrAccessRole")
                .assumedBy(new ServicePrincipal("build.apprunner.amazonaws.com"))
                .managedPolicies(List.of(
                        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSAppRunnerServicePolicyForECRAccess")
                ))
                .build();

        CfnService.SourceConfigurationProperty sourceConfiguration = CfnService.SourceConfigurationProperty.builder()
                .imageRepository(imageRepository)
                .authenticationConfiguration(CfnService.AuthenticationConfigurationProperty.builder()
                        .accessRoleArn(appRunnerEcrAccessRole.getRoleArn())
                        .build())
                .autoDeploymentsEnabled(true)
                .build();

        CfnService appRunnerService = CfnService.Builder.create(this, "ConsumerService")
                .serviceName(taskServiceName)
                .sourceConfiguration(sourceConfiguration)
                .instanceConfiguration(CfnService.InstanceConfigurationProperty.builder()
                        .cpu(String.valueOf(taskCpu))
                        .memory(String.valueOf(taskMemory))
                        .build())
                .build();
*/

        // Outputs for post-deployment verification.
        CfnOutput.Builder.create(this, "BucketArn")
                .value(s3Bucket.getBucketArn())
                .build();

        CfnOutput.Builder.create(this, "S3AccessRoleArn")
                .value(s3AccessRole.getRoleArn())
                .build();

        CfnOutput.Builder.create(this, "SourceQueueUrl")
                .value(sourceQueue.getQueueUrl())
                .build();

        CfnOutput.Builder.create(this, "ReplayQueueUrl")
                .value(replayQueue.getQueueUrl())
                .build();

        CfnOutput.Builder.create(this, "OneOffJobLambdaArn")
                .value(oneOffJobLambda.getFunctionArn())
                .build();

        //CfnOutput.Builder.create(this, "SourceLambdaArn")
        //        .value(sourceLambda.getFunctionArn())
        //        .build();

        //CfnOutput.Builder.create(this, "ReplayLambdaArn")
        //        .value(replayLambda.getFunctionArn())
        //        .build();

        //CfnOutput.Builder.create(this, "FargateTaskDefinitionArn")
        //        .value(taskDefinition.getTaskDefinitionArn())
        //        .build();

        //CfnOutput.Builder.create(this, "EcsClusterArn")
        //        .value(cluster.getClusterArn())
        //        .build();

        //CfnOutput.Builder.create(this, "AppRunnerServiceArn")
        //        .value(appRunnerService.getAttrServiceArn())
        //        .build();

        CfnOutput.Builder.create(this, "TaskRoleArn")
                .value(ecsTaskRole.getRoleArn())
                .build();

        CfnOutput.Builder.create(this, "OffsetsTableArn")
                .value(offsetsTable.getTableArn())
                .build();
    }

    private String getConfigValue(String key) {
        Object value = null;
        try {
            value = this.getNode().tryGetContext(key);
        }catch (Exception e) {
            // NOP
        }
        if (value == null || value.toString().isEmpty()) {
            throw new IllegalArgumentException("Missing required context key: " + key);
        }
        return value.toString();
    }

    private String getConfigValue(String envVarName, String contextKey) {
        String value = System.getenv(envVarName);
        if (value == null || value.isEmpty()) {
            Object contextValue = null;
            try {
                contextValue = this.getNode().tryGetContext(contextKey);
            }catch (Exception e) {
                // NOP
            }
            if (contextValue != null && !contextValue.toString().isEmpty()) {
                //if (!contextValue.toString().isEmpty()) {
                CfnOutput.Builder.create(this, contextKey)
                        .value(contextValue.toString() + " (Source: CDK context.)")
                        .build();
                return contextValue.toString();
            } else {
                throw new IllegalArgumentException("No value found for " + envVarName + " or context key " + contextKey);
            }
        }
        CfnOutput.Builder.create(this, contextKey)
                .value(value + " (Source: environment variable " + envVarName + ".)")
                .build();
        return value;
    }
}
