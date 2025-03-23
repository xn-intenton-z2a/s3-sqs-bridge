package com.intentïon.S3SqsBridge;

import software.amazon.awscdk.App;
import software.amazon.awscdk.CfnOutput;

public class S3SqsBridgeApp {
    public static void main(final String[] args) {
        App app = new App();

        S3SqsBridgeStack stack = S3SqsBridgeStack.Builder.create(app, "S3SqsBridgeStack")
                // TODO: LogGroup retention periods
                .s3WriterArnPrinciple(System.getenv("S3_WRITER_ARN_PRINCIPLE"))
                .s3WriterRoleName(System.getenv("S3_WRITER_ROLE_NAME"))
                .s3BucketName(System.getenv("BUCKET_NAME"))
                // TODO: S3 LogGroup prefix
                // TODO: S3 bucket enable/disable cloudtrail
                .s3ObjectPrefix(System.getenv("OBJECT_PREFIX"))
                .s3UseExistingBucket(Boolean.parseBoolean(System.getenv("USE_EXISTING_BUCKET")))
                .s3RetainBucket(Boolean.parseBoolean(System.getenv("RETAIN_BUCKET"))) // TODO: Switch to removal policy
                // TODO: S3 bucket object lifecycle policy (delete after 1 month)
                // TODO: DLQ postfix
                // TODO: SQS Queue and DLQ retention period
                .sqsSourceQueueName(System.getenv("SQS_SOURCE_QUEUE_NAME"))
                .sqsReplayQueueName(System.getenv("SQS_REPLAY_QUEUE_NAME"))
                .sqsDigestQueueName(System.getenv("SQS_DIGEST_QUEUE_NAME"))
                .sqsDigestQueueArn(System.getenv("SQS_DIGEST_QUEUE_ARN"))
                .sqsUseExistingDigestQueue(Boolean.parseBoolean(System.getenv("USE_EXISTING_DIGEST_QUEUE")))
                .sqsRetainDigestQueue(Boolean.parseBoolean(System.getenv("RETAIN_DIGEST_QUEUE"))) // TODO: Switch to removal policy
                .offsetsTableName(System.getenv("OFFSETS_TABLE_NAME"))
                // TODO: Offsets table partition key
                // TODO: Offsets table stack removal policy
                // TODO: Offsets table TTL (1 month)
                .projectionsTableName(System.getenv("PROJECTIONS_TABLE_NAME"))
                // TODO: Projections table partition key
                // TODO: Projections table stack removal policy
                // TODO: Projections table TTL (1 month)
                .lambdaEntry(System.getenv("LAMBDA_ENTRY"))
                // TODO: Lambda LogGroup prefix
                .replayBatchLambdaFunctionName(System.getenv("REPLAY_BATCH_LAMBDA_FUNCTION_NAME"))
                .replayBatchLambdaHandlerFunctionName(System.getenv("REPLAY_BATCH_LAMBDA_HANDLER_FUNCTION_NAME"))
                // TODO: Lambda timeout
                .sourceLambdaFunctionName(System.getenv("SOURCE_LAMBDA_FUNCTION_NAME"))
                .sourceLambdaHandlerFunctionName(System.getenv("SOURCE_LAMBDA_HANDLER_FUNCTION_NAME"))
                // TODO: Lambda timeout
                .replayLambdaFunctionName(System.getenv("REPLAY_LAMBDA_FUNCTION_NAME"))
                .replayLambdaHandlerFunctionName(System.getenv("REPLAY_LAMBDA_HANDLER_FUNCTION_NAME"))
                // TODO: Lambda timeout
                // TODO: As properties not variables: Enable/disable versioning (also allowing unlimited concurrency because we always read the latest state)
                .build();

        CfnOutput.Builder.create(stack, "EventsBucketArn")
                .value(stack.eventsBucket.getBucketArn())
                .build();

        CfnOutput.Builder.create(stack, "EventsS3AccessRoleArn")
                .value(stack.s3AccessRole.getRoleArn())
                .build();

        CfnOutput.Builder.create(stack, "SourceQueueUrl")
                .value(stack.sourceQueue.getQueueUrl())
                .build();

        CfnOutput.Builder.create(stack, "ReplayQueueUrl")
                .value(stack.replayQueue.getQueueUrl())
                .build();

        CfnOutput.Builder.create(stack, "DigestQueueUrl")
                .value(stack.digestQueue.getQueueUrl())
                .build();

        CfnOutput.Builder.create(stack, "OffsetsTableArn")
                .value(stack.offsetsTable.getTableArn())
                .build();

        CfnOutput.Builder.create(stack, "ProjectionsTableArn")
                .value(stack.projectionsTable.getTableArn())
                .build();

        CfnOutput.Builder.create(stack, "ReplayBatchLambdaArn")
                .value(stack.replayBatchLambda.getFunctionArn())
                .build();

        CfnOutput.Builder.create(stack, "ReplayBatchLambdaLogGroupArn")
                .value(stack.replayBatchLambdaLogGroup.getLogGroupArn())
                .build();

        CfnOutput.Builder.create(stack, "ReplayBatchOneOffJobResourceRef")
                .value(stack.replayBatchOneOffJobResource.getRef())
                .build();

        CfnOutput.Builder.create(stack, "SourceLambdaArn")
                .value(stack.sourceLambda.getFunctionArn())
                .build();

        CfnOutput.Builder.create(stack, "ReplayLambdaArn")
                .value(stack.replayLambda.getFunctionArn())
                .build();

        app.synth();
    }
}
