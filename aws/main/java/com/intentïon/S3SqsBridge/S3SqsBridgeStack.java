package com.intentïon.S3SqsBridge;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.CustomResource;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.customresources.Provider;
import software.amazon.awscdk.services.cloudtrail.S3EventSelector;
import software.amazon.awscdk.services.cloudtrail.Trail;
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
import software.amazon.awscdk.services.sqs.DeadLetterQueue;
import software.amazon.awscdk.services.sqs.IQueue;
import software.amazon.awscdk.services.sqs.Queue;
import software.constructs.Construct;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

public class S3SqsBridgeStack extends Stack {

    public IBucket eventsBucket;
    public LogGroup eventsBucketLogGroup;
    public Trail eventsBucketTrail;
    public Role s3AccessRole;
    public Queue sourceDLQ;
    public Queue sourceQueue;
    public Queue replayQueueDLQ;
    public Queue replayQueue;
    public IQueue digestQueue;
    public Queue digestQueueDLQ;
    public Table offsetsTable;
    public Table projectionsTable;
    public DockerImageFunction replayBatchLambda;
    public LogGroup replayBatchLambdaLogGroup;
    public CustomResource replayBatchOneOffJobResource;
    public DockerImageFunction sourceLambda;
    public LogGroup sourceLambdaLogGroup;
    public DockerImageFunction replayLambda;
    public LogGroup replayLambdaLogGroup;

    public static class Builder {
        // TODO: Add default values for the builder properties
        public Construct scope;
        public String id;
        public StackProps props;
        public String s3WriterArnPrinciple;
        public String s3WriterRoleName;
        public String s3BucketName;
        public String s3ObjectPrefix;
        public boolean s3UseExistingBucket;
        public boolean s3RetainBucket;
        public String sqsSourceQueueName;
        public String sqsReplayQueueName;
        public String sqsDigestQueueName;
        public String sqsDigestQueueArn;
        public boolean sqsUseExistingDigestQueue;
        public boolean sqsRetainDigestQueue;
        public String offsetsTableName;
        public String projectionsTableName;
        public String lambdaEntry;
        public String replayBatchLambdaFunctionName;
        public String replayBatchLambdaHandlerFunctionName;
        public String sourceLambdaFunctionName;
        public String sourceLambdaHandlerFunctionName;
        public String replayLambdaFunctionName;
        public String replayLambdaHandlerFunctionName;

        public Builder(Construct scope, String id, StackProps props) {
            this.scope = scope;
            this.id = id;
            this.props = props;
        }

        public static Builder create(Construct scope, String id) {
            Builder builder = new Builder(scope, id, null);
            return builder;
        }

        public static Builder create(Construct scope, String id, StackProps props) {
            Builder builder = new Builder(scope, id, props);
            return builder;
        }

        public Builder s3WriterArnPrinciple(String s3WriterArnPrinciple) {
            this.s3WriterArnPrinciple = s3WriterArnPrinciple;
            return this;
        }

        public Builder s3WriterRoleName(String s3WriterRoleName) {
            this.s3WriterRoleName = s3WriterRoleName;
            return this;
        }

        public Builder s3BucketName(String s3BucketName) {
            this.s3BucketName = s3BucketName;
            return this;
        }

        public Builder s3ObjectPrefix(String s3ObjectPrefix) {
            this.s3ObjectPrefix = s3ObjectPrefix;
            return this;
        }

        public Builder s3UseExistingBucket(boolean s3UseExistingBucket) {
            this.s3UseExistingBucket = s3UseExistingBucket;
            return this;
        }

        public Builder s3RetainBucket(boolean s3RetainBucket) {
            this.s3RetainBucket = s3RetainBucket;
            return this;
        }

        public Builder sqsSourceQueueName(String sqsSourceQueueName) {
            this.sqsSourceQueueName = sqsSourceQueueName;
            return this;
        }

        public Builder sqsReplayQueueName(String sqsReplayQueueName) {
            this.sqsReplayQueueName = sqsReplayQueueName;
            return this;
        }

        public Builder sqsDigestQueueName(String sqsDigestQueueName) {
            this.sqsDigestQueueName = sqsDigestQueueName;
            return this;
        }

        public Builder sqsDigestQueueArn(String sqsDigestQueueArn) {
            this.sqsDigestQueueArn = sqsDigestQueueArn;
            return this;
        }

        public Builder sqsUseExistingDigestQueue(boolean sqsUseExistingDigestQueue) {
            this.sqsUseExistingDigestQueue = sqsUseExistingDigestQueue;
            return this;
        }

        public Builder sqsRetainDigestQueue(boolean sqsRetainDigestQueue) {
            this.sqsRetainDigestQueue = sqsRetainDigestQueue;
            return this;
        }

        public Builder offsetsTableName(String offsetsTableName) {
            this.offsetsTableName = offsetsTableName;
            return this;
        }

        public Builder projectionsTableName(String projectionsTableName) {
            this.projectionsTableName = projectionsTableName;
            return this;
        }

        public Builder lambdaEntry(String lambdaEntry) {
            this.lambdaEntry = lambdaEntry;
            return this;
        }

        public Builder replayBatchLambdaFunctionName(String replayBatchLambdaFunctionName) {
            this.replayBatchLambdaFunctionName = replayBatchLambdaFunctionName;
            return this;
        }

        public Builder replayBatchLambdaHandlerFunctionName(String replayBatchLambdaHandlerFunctionName) {
            this.replayBatchLambdaHandlerFunctionName = replayBatchLambdaHandlerFunctionName;
            return this;
        }

        public Builder sourceLambdaFunctionName(String sourceLambdaFunctionName) {
            this.sourceLambdaFunctionName = sourceLambdaFunctionName;
            return this;
        }

        public Builder sourceLambdaHandlerFunctionName(String sourceLambdaHandlerFunctionName) {
            this.sourceLambdaHandlerFunctionName = sourceLambdaHandlerFunctionName;
            return this;
        }

        public Builder replayLambdaFunctionName(String replayLambdaFunctionName) {
            this.replayLambdaFunctionName = replayLambdaFunctionName;
            return this;
        }

        public Builder replayLambdaHandlerFunctionName(String replayLambdaHandlerFunctionName) {
            this.replayLambdaHandlerFunctionName = replayLambdaHandlerFunctionName;
            return this;
        }

        public S3SqsBridgeStack build() {
            S3SqsBridgeStack stack = new S3SqsBridgeStack(this.scope, this.id, this.props, this);
            return stack;
        }

    }

    public S3SqsBridgeStack(Construct scope, String id, S3SqsBridgeStack.Builder builder) {
        this(scope, id, null, builder);
    }

    public S3SqsBridgeStack(Construct scope, String id, StackProps props, S3SqsBridgeStack.Builder builder) {
        super(scope, id, props);

        String s3BucketName = this.getConfigValue(builder.s3BucketName, "s3BucketName");
        String s3ObjectPrefix = this.getConfigValue(builder.s3ObjectPrefix, "s3ObjectPrefix");
        boolean s3UseExistingBucket = Boolean.parseBoolean(this.getConfigValue(Boolean.toString(builder.s3UseExistingBucket), "s3UseExistingBucket"));
        boolean s3RetainBucket = Boolean.parseBoolean(this.getConfigValue(Boolean.toString(builder.s3RetainBucket), "s3RetainBucket"));
        String s3WriterRoleName = this.getConfigValue(builder.s3WriterRoleName, "s3WriterRoleName");
        String s3WriterArnPrinciple = this.getConfigValue(builder.s3WriterArnPrinciple, "s3WriterArnPrinciple");
        String sqsSourceQueueName = this.getConfigValue(builder.sqsSourceQueueName, "sqsSourceQueueName");
        String sqsReplayQueueName = this.getConfigValue(builder.sqsReplayQueueName, "sqsReplayQueueName");
        String sqsDigestQueueName = this.getConfigValue(builder.sqsDigestQueueName, "sqsDigestQueueName");
        String sqsDigestQueueArn = this.getConfigValue(builder.sqsDigestQueueArn, "sqsDigestQueueArn");
        boolean sqsUseExistingDigestQueue = Boolean.parseBoolean(this.getConfigValue(Boolean.toString(builder.sqsUseExistingDigestQueue), "sqsUseExistingDigestQueue"));
        boolean sqsRetainDigestQueue = Boolean.parseBoolean(this.getConfigValue(Boolean.toString(builder.sqsRetainDigestQueue), "sqsRetainDigestQueue"));
        String offsetsTableName = this.getConfigValue(builder.offsetsTableName, "offsetsTableName");
        String projectionsTableName = this.getConfigValue(builder.projectionsTableName, "projectionsTableName");
        String lambdaEntry = this.getConfigValue(builder.lambdaEntry, "lambdaEntry");
        String sourceLambdaHandlerFunctionName = this.getConfigValue(builder.sourceLambdaHandlerFunctionName, "sourceLambdaHandlerFunctionName");
        String sourceLambdaFunctionName = this.getConfigValue(builder.sourceLambdaFunctionName, "sourceLambdaFunctionName");
        String replayBatchLambdaHandlerFunctionName = this.getConfigValue(builder.replayBatchLambdaHandlerFunctionName, "replayBatchLambdaHandlerFunctionName");
        String replayBatchLambdaFunctionName = this.getConfigValue(builder.replayBatchLambdaFunctionName, "replayBatchLambdaFunctionName");
        String replayLambdaHandlerFunctionName = this.getConfigValue(builder.replayLambdaHandlerFunctionName, "replayLambdaHandlerFunctionName");
        String replayLambdaFunctionName = this.getConfigValue(builder.replayLambdaFunctionName, "replayLambdaFunctionName");

        if (s3UseExistingBucket) {
            this.eventsBucket = Bucket.fromBucketName(this, "EventsBucket", s3BucketName);
        } else {
            this.eventsBucket = Bucket.Builder.create(this, "EventsBucket")
                    .bucketName(s3BucketName)
                    .versioned(true)
                    .removalPolicy(s3RetainBucket ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY)
                    .autoDeleteObjects(!s3RetainBucket)
                    .build();
            this.eventsBucketLogGroup = LogGroup.Builder.create(this, "EventsBucketLogGroup")
                    .logGroupName("/aws/s3/" + this.eventsBucket.getBucketName())
                    .retention(RetentionDays.THREE_DAYS)
                    .build();
            this.eventsBucketTrail = Trail.Builder.create(this, "EventsBucketAccessTrail")
                    .trailName(this.eventsBucket.getBucketName() + "-access-trail")
                    .cloudWatchLogGroup(this.eventsBucketLogGroup)
                    .sendToCloudWatchLogs(true)
                    .cloudWatchLogsRetention(RetentionDays.THREE_DAYS)
                    .includeGlobalServiceEvents(false)
                    .isMultiRegionTrail(false)
                    .build();

            this.eventsBucketTrail.addS3EventSelector(Arrays.asList(S3EventSelector.builder()
                    .bucket(this.eventsBucket)
                    .objectPrefix(s3ObjectPrefix)
                    .build()
            ));
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
                        this.eventsBucket.getBucketArn(),
                        this.eventsBucket.getBucketArn() + "/" + s3ObjectPrefix + "*"
                ))
                .build();
        this.s3AccessRole = Role.Builder.create(this, "EventsS3AccessRole")
                .roleName(s3WriterRoleName)
                .assumedBy(new ArnPrincipal(s3WriterArnPrinciple))
                .inlinePolicies(java.util.Collections.singletonMap("S3AccessPolicy", PolicyDocument.Builder.create()
                        .statements(List.of(eventsObjectCrudPolicyStatement))
                        .build()))
                .build();

        Duration sourceLambdaDuration = Duration.seconds(5);
        Duration sourceQueueDuration = Duration.seconds(sourceLambdaDuration.toSeconds().intValue() * 2);
        this.sourceDLQ = Queue.Builder.create(this, "SourceDLQ")
                .queueName(sqsSourceQueueName + "-dlq")
                .retentionPeriod(Duration.days(3))
                .build();
        this.sourceQueue = Queue.Builder.create(this, "SourceQueue")
                .queueName(sqsSourceQueueName)
                .visibilityTimeout(sourceQueueDuration)
                .retentionPeriod(Duration.hours(24))
                .deadLetterQueue(DeadLetterQueue.builder()
                        .queue(this.sourceDLQ)
                        .maxReceiveCount(5)
                        .build())
                .build();
        this.eventsBucket.addEventNotification(
                EventType.OBJECT_CREATED_PUT,
                new SqsDestination(this.sourceQueue)
        );

        Duration replayLambdaDuration = Duration.seconds(3);
        Duration replayQueueDuration = Duration.seconds(replayLambdaDuration.toSeconds().intValue() * 2);
        this.replayQueueDLQ = Queue.Builder.create(this, "ReplayQueueDLQ")
                .queueName(sqsReplayQueueName + "-dlq")
                .retentionPeriod(Duration.days(3))
                .build();
        this.replayQueue = Queue.Builder.create(this, "ReplayQueue")
                .queueName(sqsReplayQueueName)
                .visibilityTimeout(replayQueueDuration)
                .retentionPeriod(Duration.hours(24))
                .deadLetterQueue(DeadLetterQueue.builder()
                        .queue(this.replayQueueDLQ)
                        .maxReceiveCount(5)
                        .build())
                .build();

        if (sqsUseExistingDigestQueue) {
            this.digestQueue = Queue.fromQueueArn(this, "DigestQueue", sqsDigestQueueArn);
        } else {
            Duration digestQueueDuration = Duration.seconds(30);
            this.digestQueueDLQ = Queue.Builder.create(this, "DigestQueueDLQ")
                    .queueName(sqsDigestQueueName + "-dlq")
                    .retentionPeriod(Duration.days(3))
                    .build();
            this.digestQueue = Queue.Builder.create(this, "DigestQueue")
                    .queueName(sqsDigestQueueName)
                    .visibilityTimeout(digestQueueDuration)
                    .removalPolicy(sqsRetainDigestQueue ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY)
                    .retentionPeriod(Duration.hours(24))
                    .deadLetterQueue(DeadLetterQueue.builder()
                            .queue(this.digestQueueDLQ)
                            .maxReceiveCount(5)
                            .build())
                    .build();
        }

        this.offsetsTable = Table.Builder.create(this, "OffsetsTable")
                .tableName(offsetsTableName)
                .partitionKey(Attribute.builder()
                        .name("id") // bucketName/objectPrefix | projectionsTableName
                        .type(AttributeType.STRING)
                        .build())
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        // Incoming object:  events/branches/main.json  (id=events/branches/main, resourceName=main)
        this.projectionsTable = Table.Builder.create(this, "ProjectionsTable")
                .tableName(projectionsTableName)
                .partitionKey(Attribute.builder()
                        .name("id")
                        .type(AttributeType.STRING)
                        .build())
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        PolicyStatement listBucketPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList("s3:ListBucket","s3:ListBucketVersions"))
                .resources(Arrays.asList(this.eventsBucket.getBucketArn()))
                .build();

        PolicyStatement getObjectPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList(
                        "s3:GetObject",
                        "s3:GetObjectVersion",
                        "s3:GetObjectTagging"
                ))
                .resources(Arrays.asList(this.eventsBucket.getBucketArn() + "/" + s3ObjectPrefix + "*"))
                .build();

        PolicyStatement sqsSendMessageToReplayQueuePolicy = PolicyStatement.Builder.create()
                .actions(List.of("sqs:SendMessage"))
                .resources(List.of(this.replayQueue.getQueueArn()))
                .build();

        PolicyStatement sqsSendMessageToDigestQueuePolicy = PolicyStatement.Builder.create()
                .actions(List.of("sqs:SendMessage"))
                .resources(List.of(this.digestQueue.getQueueArn()))
                .build();

        PolicyStatement listMappingPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList("lambda:ListEventSourceMappings"))
                .resources(Arrays.asList("*"))
                .build();

        PolicyStatement updateMappingPolicy = PolicyStatement.Builder.create()
                .actions(Arrays.asList("lambda:UpdateEventSourceMapping"))
                .resources(Arrays.asList("*"))
                //.resources(Arrays.asList("arn:aws:lambda:" + this.getRegion() + ":" + this.getRegion() + ":event-source-mapping:*"))
                .build();

        this.sourceLambda = DockerImageFunction.Builder.create(this, "SourceLambda")
                .code(DockerImageCode.fromImageAsset(".", AssetImageCodeProps.builder()
                        .buildArgs(Map.of("HANDLER", lambdaEntry + sourceLambdaHandlerFunctionName))
                        .build()))
                .environment(Map.of(
                        "BUCKET_NAME", eventsBucket.getBucketName(),
                        "OBJECT_PREFIX", s3ObjectPrefix,
                        "REPLAY_QUEUE_URL", this.replayQueue.getQueueUrl(),
                        "OFFSETS_TABLE_NAME", this.offsetsTable.getTableName(),
                        "PROJECTIONS_TABLE_NAME", this.projectionsTable.getTableName(),
                        "DIGEST_QUEUE_URL", this.digestQueue.getQueueUrl()
                ))
                .functionName(sourceLambdaFunctionName)
                .reservedConcurrentExecutions(1)
                .timeout(sourceLambdaDuration)
                .build();
        this.sourceLambdaLogGroup = new LogGroup(this, "SourceLambdaLogGroup", LogGroupProps.builder()
                .logGroupName("/aws/lambda/" + this.sourceLambda.getFunctionName())
                .retention(RetentionDays.THREE_DAYS)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build());
        this.sourceLambda.addToRolePolicy(getObjectPolicy);
        this.sourceLambda.addToRolePolicy(sqsSendMessageToDigestQueuePolicy);
        this.offsetsTable.grantReadWriteData(this.sourceLambda);
        this.projectionsTable.grantReadWriteData(this.sourceLambda);
        this.sourceLambda.addEventSource(new SqsEventSource(this.sourceQueue, SqsEventSourceProps.builder()
                .batchSize(1)
                .maxBatchingWindow(Duration.seconds(0))
                .build()));

        Duration replayBatchLambdaDuration = Duration.seconds(900);
        this.replayBatchLambda = DockerImageFunction.Builder.create(this, "ReplayBatchLambda")
                .code(DockerImageCode.fromImageAsset(".", AssetImageCodeProps.builder()
                        .buildArgs(Map.of("HANDLER", lambdaEntry + replayBatchLambdaHandlerFunctionName))
                        .build()))
                .environment(Map.of(
                        "BUCKET_NAME", this.eventsBucket.getBucketName(),
                        "OBJECT_PREFIX", s3ObjectPrefix,
                        "REPLAY_QUEUE_URL", this.replayQueue.getQueueUrl(),
                        "OFFSETS_TABLE_NAME", this.offsetsTable.getTableName(),
                        "SOURCE_LAMBDA_FUNCTION_NAME", this.sourceLambda.getFunctionName()
                ))
                .functionName(replayBatchLambdaFunctionName)
                .reservedConcurrentExecutions(1)
                .timeout(replayBatchLambdaDuration)
                .build();
        this.replayBatchLambdaLogGroup = new LogGroup(this, "ReplayBatchLambdaLogGroup", LogGroupProps.builder()
                .logGroupName("/aws/lambda/" + this.replayBatchLambda.getFunctionName())
                .retention(RetentionDays.THREE_DAYS)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build());
        this.replayBatchLambda.addToRolePolicy(listBucketPolicy);
        this.replayBatchLambda.addToRolePolicy(getObjectPolicy);
        this.replayBatchLambda.addToRolePolicy(sqsSendMessageToReplayQueuePolicy);
        this.replayBatchLambda.addToRolePolicy(listMappingPolicy);
        this.replayBatchLambda.addToRolePolicy(updateMappingPolicy);
        this.offsetsTable.grantReadWriteData(this.replayBatchLambda);
        Provider replayBatchOneOffJobProvider = Provider.Builder.create(this, "ReplayBatchOneOffJobProvider")
                .onEventHandler(this.replayBatchLambda)
                .build();

        this.replayBatchOneOffJobResource = CustomResource.Builder.create(this, "ReplayBatchOneOffJobResource")
                .serviceToken(replayBatchOneOffJobProvider.getServiceToken())
                .build();

        this.replayLambda = DockerImageFunction.Builder.create(this, "ReplayLambda")
                .code(DockerImageCode.fromImageAsset(".", AssetImageCodeProps.builder()
                        .buildArgs(Map.of("HANDLER", lambdaEntry + replayLambdaHandlerFunctionName))
                        .build()))
                .environment(Map.of(
                        "BUCKET_NAME", s3BucketName,
                        "OBJECT_PREFIX", s3ObjectPrefix,
                        "OFFSETS_TABLE_NAME", this.offsetsTable.getTableName(),
                        "PROJECTIONS_TABLE_NAME", this.projectionsTable.getTableName()
                ))
                .functionName(replayLambdaFunctionName)
                .reservedConcurrentExecutions(1)
                .timeout(replayLambdaDuration)
                .build();
        this.replayLambdaLogGroup = new LogGroup(this, "ReplayLambdaLogGroup", LogGroupProps.builder()
                .logGroupName("/aws/lambda/" + this.replayLambda.getFunctionName())
                .retention(RetentionDays.THREE_DAYS)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build());
        this.replayLambda.addToRolePolicy(getObjectPolicy);
        this.offsetsTable.grantReadWriteData(this.replayLambda);
        this.projectionsTable.grantReadWriteData(this.replayLambda);
        this.replayLambda.addEventSource(new SqsEventSource(this.replayQueue, SqsEventSourceProps.builder()
                .batchSize(1)
                .maxBatchingWindow(Duration.seconds(0))
                .build()));
    }

    private String getConfigValue(String customValue, String contextKey) {
        if (customValue == null || customValue.isEmpty()) {
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
                throw new IllegalArgumentException("No customValue found or context key " + contextKey);
            }
        }
        return customValue;
    }
}
