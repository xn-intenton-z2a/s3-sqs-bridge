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
import software.amazon.awscdk.services.lambda.AssetImageCodeProps;
import software.amazon.awscdk.services.lambda.DockerImageCode;
import software.amazon.awscdk.services.lambda.DockerImageFunction;
import software.amazon.awscdk.services.lambda.eventsources.SqsEventSource;
import software.amazon.awscdk.services.lambda.eventsources.SqsEventSourceProps;
import software.amazon.awscdk.services.logs.LogGroup;
import software.amazon.awscdk.services.logs.LogGroupProps;
import software.amazon.awscdk.services.logs.RetentionDays;
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

        // Load configuration

        final String s3WriterArnPrinciple = getConfigValue("S3_WRITER_ARN_PRINCIPLE", "s3WriterArnPrinciple");
        final String s3WriterRoleName = getConfigValue("S3_WRITER_ROLE_NAME", "s3WriterRoleName");
        final String bucketName = getConfigValue("BUCKET_NAME", "s3BucketName");
        final String objectPrefix = getConfigValue("OBJECT_PREFIX", "s3ObjectPrefix");
        final boolean useExistingBucket = Boolean.parseBoolean(getConfigValue("USE_EXISTING_BUCKET", "s3UseExistingBucket"));
        final boolean retainBucket = Boolean.parseBoolean(getConfigValue("RETAIN_BUCKET", "s3RetainBucket"));
        final String sourceQueueName = getConfigValue("SQS_SOURCE_QUEUE_NAME", "sqsSourceQueueName");
        final String replayQueueName = getConfigValue("SQS_REPLAY_QUEUE_NAME", "sqsReplayQueueName");
        final String offsetsTableName = getConfigValue("OFFSETS_TABLE_NAME", "offsetsTableName");
        final String projectionsTableName = getConfigValue("PROJECTIONS_TABLE_NAME", "projectionsTableName");
        final String lambdaEntry = getConfigValue("LAMBDA_ENTRY", "lambdaEntry");
        final String replayLambdaFunctionName = getConfigValue("REPLAY_LAMBDA_FUNCTION_NAME", "replayLambdaFunctionName");
        final String sourceLambdaFunctionName = getConfigValue("SOURCE_LAMBDA_FUNCTION_NAME", "sourceLambdaFunctionName");
        final String replayBatchLambdaFunctionName = getConfigValue("REPLAY_BATCH_LAMBDA_FUNCTION_NAME", "replayBatchLambdaFunctionName");
        final String replayBatchLambdaHandlerFunctionName = getConfigValue("REPLAY_BATCH_LAMBDA_HANDLER_FUNCTION_NAME", "replayBatchLambdaHandlerFunctionName");
        final String sourceLambdaHandlerFunctionName = getConfigValue("SOURCE_LAMBDA_HANDLER_FUNCTION_NAME", "sourceLambdaHandlerFunctionName");
        final String replayLambdaHandlerFunctionName = getConfigValue("REPLAY_LAMBDA_HANDLER_FUNCTION_NAME", "replayLambdaHandlerFunctionName");

        // CDK Resource creation

        IBucket eventsBucket;
        if (useExistingBucket) {
            eventsBucket = Bucket.fromBucketName(this, "EventsBucket", bucketName);
        } else {
            eventsBucket = Bucket.Builder.create(this, "EventsBucket")
                    .bucketName(bucketName)
                    .versioned(true)
                    .removalPolicy(retainBucket ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY)
                    .autoDeleteObjects(!retainBucket)
                    .build();
        }

        PolicyStatement eventsObjectCrudPolicyStatement = PolicyStatement.Builder.create()
                .effect(Effect.ALLOW)
                .actions(List.of(
                        "s3:PutObject",
                        "s3:GetObject",
                        "s3:ListBucket",
                        "s3:DeleteObject"
                ))
                .resources(List.of(
                        eventsBucket.getBucketArn(),
                        eventsBucket.getBucketArn() + "/*"
                ))
                .build();
        Role s3AccessRole = Role.Builder.create(this, "EventsS3AccessRole")
                .roleName(s3WriterRoleName)
                .assumedBy(new ArnPrincipal(s3WriterArnPrinciple))
                .inlinePolicies(java.util.Collections.singletonMap("S3AccessPolicy", PolicyDocument.Builder.create()
                        .statements(List.of(eventsObjectCrudPolicyStatement))
                        .build()))
                .build();

        Queue sourceQueue = Queue.Builder.create(this, "SourceQueue")
                .queueName(sourceQueueName)
                .visibilityTimeout(Duration.seconds(300))
                .build();

        eventsBucket.addEventNotification(
                EventType.OBJECT_CREATED_PUT,
                new SqsDestination(sourceQueue)
        );

        Queue replayQueue = Queue.Builder.create(this, "ReplayQueue")
                .queueName(replayQueueName)
                .visibilityTimeout(Duration.seconds(300))
                .build();

        Table offsetsTable = Table.Builder.create(this, "OffsetsTable")
                .tableName(offsetsTableName)
                .partitionKey(Attribute.builder()
                        .name("id") // bucketName/objectPrefix | projectionsTableName
                        .type(AttributeType.STRING)
                        .build())
                .sortKey(Attribute.builder()
                        .name("offset") // lastModified
                        .type(AttributeType.STRING)
                        .build())
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        // Incoming object:  events/branches/main.json  (id=events/branches/main, resourceName=main)
        Table projectionsTable = Table.Builder.create(this, "ProjectionsTable")
                .tableName(projectionsTableName)
                .partitionKey(Attribute.builder()
                        .name("id")
                        .type(AttributeType.STRING)
                        .build())
                .sortKey(Attribute.builder()
                        .name("lastModified")
                        .type(AttributeType.STRING)
                        .build())
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        PolicyStatement listBucketPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList("s3:ListBucket","s3:ListBucketVersions"))
                .resources(Arrays.asList(eventsBucket.getBucketArn()))
                .build();

        PolicyStatement getObjectPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList(
                        "s3:GetObject",
                        "s3:GetObjectVersion",
                        "s3:GetObjectTagging"
                ))
                .resources(Arrays.asList(eventsBucket.getBucketArn() + "/" + objectPrefix + "*"))
                .build();

        PolicyStatement sqsSendMessagePolicy = PolicyStatement.Builder.create()
                .actions(List.of("sqs:SendMessage"))
                .resources(List.of(replayQueue.getQueueArn()))
                .build();

        //PolicyStatement logsPolicy = PolicyStatement.Builder.create()
        //        .actions(Arrays.asList("logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"))
        //        .resources(List.of("*"))
        //        .build();

        DockerImageFunction replayBatchLambda = DockerImageFunction.Builder.create(this, "ReplayBatchLambda")
                .code(DockerImageCode.fromImageAsset(".", AssetImageCodeProps.builder()
                        .buildArgs(Map.of("HANDLER", lambdaEntry + replayBatchLambdaHandlerFunctionName))
                        .build()))
                .environment(Map.of(
                        "BUCKET_NAME", bucketName,
                        "OBJECT_PREFIX", objectPrefix,
                        "REPLAY_QUEUE_URL", replayQueue.getQueueUrl(),
                        "OFFSETS_TABLE_NAME", offsetsTable.getTableName()
                ))
                .functionName(replayBatchLambdaFunctionName)
                .reservedConcurrentExecutions(1)
                .timeout(Duration.seconds(900))
                .build();
        LogGroup replayBatchLambdaLogGroup = new LogGroup(this, "ReplayBatchLambdaLogGroup", LogGroupProps.builder()
                .logGroupName("/aws/lambda/" + replayBatchLambda.getFunctionName())
                .retention(RetentionDays.THREE_DAYS)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build());
        replayBatchLambda.addToRolePolicy(listBucketPolicy);
        replayBatchLambda.addToRolePolicy(getObjectPolicy);
        replayBatchLambda.addToRolePolicy(sqsSendMessagePolicy);
        offsetsTable.grantReadWriteData(replayBatchLambda);
        Provider replayBatchOneOffJobProvider = Provider.Builder.create(this, "ReplayBatchOneOffJobProvider")
                .onEventHandler(replayBatchLambda)
                .build();

        CustomResource ReplayBatchOneOffJobResource = CustomResource.Builder.create(this, "ReplayBatchOneOffJobResource")
                .serviceToken(replayBatchOneOffJobProvider.getServiceToken())
                .build();

        DockerImageFunction sourceLambda = DockerImageFunction.Builder.create(this, "SourceLambda")
                .code(DockerImageCode.fromImageAsset(".", AssetImageCodeProps.builder()
                        .buildArgs(Map.of("HANDLER", lambdaEntry + sourceLambdaHandlerFunctionName))
                        .build()))
                .environment(Map.of(
                        "PROJECTIONS_TABLE_NAME", projectionsTable.getTableName()
                ))
                .functionName(sourceLambdaFunctionName)
                .reservedConcurrentExecutions(1)
                .timeout(Duration.seconds(1))
                .build();
        LogGroup sourceLambdaLogGroup = new LogGroup(this, "SourceLambdaLogGroup", LogGroupProps.builder()
                .logGroupName("/aws/lambda/" + sourceLambda.getFunctionName())
                .retention(RetentionDays.THREE_DAYS)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build());
        sourceLambda.addToRolePolicy(getObjectPolicy);
        projectionsTable.grantReadWriteData(sourceLambda);
        sourceLambda.addEventSource(new SqsEventSource(sourceQueue, SqsEventSourceProps.builder()
                .batchSize(1)
                .maxBatchingWindow(Duration.seconds(0))
                .build()));

        DockerImageFunction replayLambda = DockerImageFunction.Builder.create(this, "ReplayLambda")
                .code(DockerImageCode.fromImageAsset(".", AssetImageCodeProps.builder()
                        .buildArgs(Map.of("HANDLER", lambdaEntry + replayLambdaHandlerFunctionName))
                        .build()))
                .environment(Map.of(
                        "PROJECTIONS_TABLE_NAME", projectionsTable.getTableName()
                ))
                .functionName(replayLambdaFunctionName)
                .reservedConcurrentExecutions(1)
                .timeout(Duration.seconds(1))
                .build();
        LogGroup replayLambdaLogGroup = new LogGroup(this, "ReplayLambdaLogGroup", LogGroupProps.builder()
                .logGroupName("/aws/lambda/" + replayLambda.getFunctionName())
                .retention(RetentionDays.THREE_DAYS)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build());
        replayLambda.addToRolePolicy(getObjectPolicy);
        projectionsTable.grantReadWriteData(replayLambda);
        replayLambda.addEventSource(new SqsEventSource(replayQueue, SqsEventSourceProps.builder()
                .batchSize(10)
                .maxBatchingWindow(Duration.seconds(0))
                .build()));

        // Outputs post-deployment

        CfnOutput.Builder.create(this, "EventsBucketArn")
                .value(eventsBucket.getBucketArn())
                .build();

        CfnOutput.Builder.create(this, "EventsS3AccessRoleArn")
                .value(s3AccessRole.getRoleArn())
                .build();

        CfnOutput.Builder.create(this, "SourceQueueUrl")
                .value(sourceQueue.getQueueUrl())
                .build();

        CfnOutput.Builder.create(this, "ReplayQueueUrl")
                .value(replayQueue.getQueueUrl())
                .build();

        CfnOutput.Builder.create(this, "OffsetsTableArn")
                .value(offsetsTable.getTableArn())
                .build();

        CfnOutput.Builder.create(this, "ProjectionsTableArn")
                .value(projectionsTable.getTableArn())
                .build();

        CfnOutput.Builder.create(this, "ReplayBatchLambdaArn")
                .value(replayBatchLambda.getFunctionArn())
                .build();

        CfnOutput.Builder.create(this, "ReplayBatchLambdaLogGroupArn")
                .value(replayBatchLambdaLogGroup.getLogGroupArn())
                .build();

        CfnOutput.Builder.create(this, "ReplayBatchOneOffJobResourceRef")
                .value(ReplayBatchOneOffJobResource.getRef())
                .build();

        CfnOutput.Builder.create(this, "SourceLambdaArn")
                .value(sourceLambda.getFunctionArn())
                .build();

        CfnOutput.Builder.create(this, "SourceLambdaLogGroupArn")
                .value(sourceLambdaLogGroup.getLogGroupArn())
                .build();

        CfnOutput.Builder.create(this, "ReplayLambdaArn")
                .value(replayLambda.getFunctionArn())
                .build();

        CfnOutput.Builder.create(this, "ReplayLambdaLogGroupArn")
                .value(replayLambdaLogGroup.getLogGroupArn())
                .build();
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
