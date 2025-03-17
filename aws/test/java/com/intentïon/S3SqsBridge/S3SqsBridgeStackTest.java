package com.intentïon.S3SqsBridge;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import software.amazon.awscdk.App;
import software.amazon.awscdk.assertions.Template;
import uk.org.webcompere.systemstubs.environment.EnvironmentVariables;
import uk.org.webcompere.systemstubs.jupiter.SystemStub;
import uk.org.webcompere.systemstubs.jupiter.SystemStubsExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(SystemStubsExtension.class)
public class S3SqsBridgeStackTest {

    @SystemStub
    private EnvironmentVariables variables =
            new EnvironmentVariables(
                    "AWS_ARN_PRINCIPLE", "arn:aws:iam::123456789012:user/test",
                "STORAGE_BUCKET_NAME", "s3-sqs-bridge-bucket-test",
                "USE_EXISTING_BUCKET", "false",
                "RETAIN_BUCKET", "false",
                "STORAGE_ENGINE", "memory://s3/",
                "CLUSTER_ID", "s3-sqs-bridge-cluster-test",
                "CONSUMER_GROUP", "s3-sqs-bridge-group-test",
                "TOPIC_NAME", "s3-sqs-bridge-topic-test",
                "USE_EXISTING_TOPIC", "false",
                "SQS_QUEUE_NAME", "s3-sqs-bridge-queue-test",
                "LAMBDA_RUNTIME", "nodejs20.x",
                "LAMBDA_TARGET", "es2020",
                "LAMBDA_FORMAT", "ESM",
                "LAMBDA_ENTRY", "src/lib/main.js",
                "LAMBDA_FUNCTION_NAME", "loggingLambdaHandler",
                "LAMBDA_LOG_LEVEL", "INFO",
                "APP_RUNNER_PORT", "8080",
                "APP_RUNNER_SERVICE_NAME", "s3-sqs-bridge-consumer-test",
                "APP_RUNNER_CPU", "1024",
                "APP_RUNNER_MEMORY", "2048"
            );

    @Test
    void hasAccessToEnvironmentVariables() {
        // assert System.getenv("STORAGE_BUCKET_NAME") isEqualTo "s3-sqs-bridge-bucket-test"
        assertEquals(System.getenv("STORAGE_BUCKET_NAME"), "s3-sqs-bridge-bucket-test");
    }

    @Test
    public void testStackResources() {
        App app = new App();
        String var = System.getenv("STORAGE_BUCKET_NAME");
        S3SqsBridgeStack stack = new S3SqsBridgeStack(app, "TestStack");
        Template template = Template.fromStack(stack);
        // Verify that one SQS queue is created
        template.resourceCountIs("AWS::SQS::Queue", 1);
        // Verify that one Lambda function is created
        //template.resourceCountIs("AWS::Lambda::Function", 1);
        // Verify that one App Runner service is created
        template.resourceCountIs("AWS::AppRunner::Service", 1);
    }
}
