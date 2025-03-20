package com.intentïon.S3SqsBridge;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import software.amazon.awscdk.App;
import software.amazon.awscdk.assertions.Template;
import uk.org.webcompere.systemstubs.environment.EnvironmentVariables;
import uk.org.webcompere.systemstubs.jupiter.SystemStub;
import uk.org.webcompere.systemstubs.jupiter.SystemStubsExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@ExtendWith(SystemStubsExtension.class)
public class S3SqsBridgeStackTest {

    @SystemStub
    private final EnvironmentVariables variables =
            new EnvironmentVariables(
                    "S3_WRITER_ARN_PRINCIPLE", "arn:aws:iam::123456789012:user/test",
                    "S3_WRITER_ROLE_NAME", "s3-sqs-bridge-bucket-writer-role-test",
                "BUCKET_NAME", "s3-sqs-bridge-bucket-test",
                    "OBJECT_PREFIX", "test/",
                "USE_EXISTING_BUCKET", "false",
                "RETAIN_BUCKET", "false",
                "SQS_SOURCE_QUEUE_NAME", "s3-sqs-bridge-source-queue-test",
                "SQS_REPLAY_QUEUE_NAME", "s3-sqs-bridge-replay-queue-test",
                "OFFSETS_TABLE_NAME", "s3-sqs-bridge-offsets-table-test",
                "PROJECTIONS_TABLE_NAME", "s3-sqs-bridge-projections-table-test",
                "LAMBDA_ENTRY", "src/lib/main.",
                "REPLAY_BATCH_LAMBDA_FUNCTION_NAME", "s3-sqs-bridge-replay-batch-function",
                "REPLAY_LAMBDA_FUNCTION_NAME", "s3-sqs-bridge-replay-function",
                "SOURCE_LAMBDA_FUNCTION_NAME", "s3-sqs-bridge-source-function",
                "REPLAY_BATCH_LAMBDA_HANDLER_FUNCTION_NAME", "replayBatchLambdaHandler",
                "SOURCE_LAMBDA_HANDLER_FUNCTION_NAME", "sourceLambdaHandler",
                "REPLAY_LAMBDA_HANDLER_FUNCTION_NAME", "replayLambdaHandler"
            );

    @Test
    void hasAccessToEnvironmentVariables() {
        assertNotNull(variables);
        // assert System.getenv("BUCKET_NAME") isEqualTo "s3-sqs-bridge-bucket-test"
        assertEquals(System.getenv("BUCKET_NAME"), "s3-sqs-bridge-bucket-test");
    }

    @Test
    public void testStackResources() {
        App app = new App();
        String var = System.getenv("BUCKET_NAME");
        S3SqsBridgeStack stack = new S3SqsBridgeStack(app, "TestStack");
        Template template = Template.fromStack(stack);
        // Verify that one SQS queue is created
        template.resourceCountIs("AWS::SQS::Queue", 2);
        // Verify that one Lambda function is created
        //template.resourceCountIs("AWS::Lambda::Function", 2);
        // Verify that one App Runner service is created
        //template.resourceCountIs("AWS::AppRunner::Service", 1);
    }
}
