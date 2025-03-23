package com.intentïon.S3SqsBridge;

import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.assertions.Template;

public class S3SqsBridgeStackTest {

    @Test
    public void testStackResources() {
        App app = new App();

        S3SqsBridgeStack stack = S3SqsBridgeStack.Builder.create(app, "S3SqsBridgeConfigureAndBuildStack")
                .s3WriterArnPrinciple("arn:aws:iam::123456789012:user/test")
                .s3WriterRoleName("s3-sqs-bridge-bucket-writer-role-test")
                .s3BucketName("s3-sqs-bridge-bucket-test")
                .s3ObjectPrefix("test/")
                .s3UseExistingBucket(false)
                .s3RetainBucket(false)
                .sqsSourceQueueName("s3-sqs-bridge-source-queue-test")
                .sqsReplayQueueName("s3-sqs-bridge-replay-queue-test")
                .sqsDigestQueueName("s3-sqs-bridge-digest-queue-test")
                // TODO: The digest queue ARN should be optional and omitted in this test.
                .sqsDigestQueueArn("arn:aws:sqs:eu-west-2:123456789012:s3-sqs-bridge-digest-queue-test")
                .sqsUseExistingDigestQueue(false)
                .sqsRetainDigestQueue(false)
                .offsetsTableName("s3-sqs-bridge-offsets-table-test")
                .projectionsTableName("s3-sqs-bridge-projections-table-test")
                .lambdaEntry("src/lib/main.")
                .replayBatchLambdaFunctionName("s3-sqs-bridge-replay-batch-function")
                .replayBatchLambdaHandlerFunctionName("replayBatchLambdaHandler")
                .sourceLambdaFunctionName("s3-sqs-bridge-source-function")
                .sourceLambdaHandlerFunctionName("sourceLambdaHandler")
                .replayLambdaFunctionName("s3-sqs-bridge-replay-function")
                .replayLambdaHandlerFunctionName("replayLambdaHandler")
                .build();

        Template template = Template.fromStack(stack);
        template.resourceCountIs("AWS::SQS::Queue", 6);
        template.resourceCountIs("AWS::Lambda::Function", 6);
    }
}
