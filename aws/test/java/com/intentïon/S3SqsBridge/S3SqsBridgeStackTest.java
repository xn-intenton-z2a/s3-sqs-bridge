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
                "TABLE_NAME", "s3-sqs-bridge-offsets-table-test",
                "TASK_PORT", "8080",
                "TASK_SERVICE_NAME", "s3-sqs-bridge-consumer-test",
                "TASK_CPU", "256",
                "TASK_MEMORY", "512",
                "TASK_STARTUP_COMMAND", "npm run replay",
                "LAMBDA_RUNTIME", "nodejs20.x",
                "LAMBDA_TARGET", "es2020",
                "LAMBDA_FORMAT", "ESM",
                "LAMBDA_ENTRY", "src/lib/main.js",
                "LAMBDA_SOURCE_FUNCTION_NAME", "sourceLambdaHandler",
                "LAMBDA_REPLAY_FUNCTION_NAME", "replayLambdaHandler",
                "LAMBDA_LOG_LEVEL", "INFO"
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
