package com.intentïon.TansuSqsBridge;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.apprunner.CfnService;
import software.amazon.awscdk.services.apprunner.CfnService.ImageConfigurationProperty;
import software.amazon.awscdk.services.apprunner.CfnService.ImageRepositoryProperty;
import software.amazon.awscdk.services.apprunner.CfnService.SourceConfigurationProperty;
import software.amazon.awscdk.services.ecr.assets.DockerImageAsset;
import software.amazon.awscdk.services.iam.ArnPrincipal;
import software.amazon.awscdk.services.iam.Effect;
import software.amazon.awscdk.services.iam.ManagedPolicy;
import software.amazon.awscdk.services.iam.PolicyDocument;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.iam.ServicePrincipal;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.sqs.Queue;
import software.constructs.Construct;

import java.util.List;
import java.util.Map;

public class TansuSqsBridgeStack extends Stack {

    public TansuSqsBridgeStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public TansuSqsBridgeStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        final String awsArnPrinciple;
        final String s3BucketName;
        final boolean s3UseExistingBucket;
        final boolean s3RetainBucket;
        final String tansuStorageEngine;
        final String kafkaClusterId;
        final String kafkaConsumerGroup;
        final String kafkaTopicName;
        final String kafkaUseExistingTopic;
        final String sqsQueueName;
        // final String databaseName;
        // final String tableName;
        final String lambdaRuntime;
        final String lambdaTarget;
        final String lambdaFormat;
        final String lambdaEntry;
        final String lambdaFunctionName;
        final String lambdaLogLevel;
        final String appRunnerPort;
        final String appRunnerServiceName;
        final String appRunnerCpu;
        final String appRunnerMemory;

        // Initialize configuration variables, checking for an environment variable override first,
        awsArnPrinciple = getConfigValue("AWS_ARN_PRINCIPLE", "awsArnPrinciple");
        // then falling back to values defined in the CDK context (cdk.json)
        s3BucketName = getConfigValue("STORAGE_BUCKET_NAME", "s3BucketName");
        // Flag to indicate if the bucket should be imported instead of created.
        // Set USE_EXISTING_BUCKET to "true" to use an existing bucket.
        s3UseExistingBucket = Boolean.parseBoolean(getConfigValue("USE_EXISTING_BUCKET", "s3UseExistingBucket"));
        s3RetainBucket = Boolean.parseBoolean(getConfigValue("RETAIN_BUCKET", "s3RetainBucket"));
        tansuStorageEngine = getConfigValue("STORAGE_ENGINE", "tansuStorageEngine");
        kafkaClusterId = getConfigValue("CLUSTER_ID", "kafkaClusterId");
        kafkaConsumerGroup = getConfigValue("CONSUMER_GROUP", "kafkaConsumerGroup");
        kafkaTopicName = getConfigValue("TOPIC_NAME", "kafkaTopicName");
        kafkaUseExistingTopic = getConfigValue("USE_EXISTING_TOPIC", "kafkaUseExistingTopic");
        sqsQueueName = getConfigValue("SQS_QUEUE_NAME", "sqsQueueName");
        // databaseName = getConfigValue("DATABASE_NAME", "databaseName");
        // tableName = getConfigValue("TABLE_NAME", "tableName");
        lambdaRuntime = getConfigValue("LAMBDA_RUNTIME", "lambdaRuntime");
        lambdaTarget = getConfigValue("LAMBDA_TARGET", "lambdaTarget");
        lambdaFormat = getConfigValue("LAMBDA_FORMAT", "lambdaFormat");
        lambdaEntry = getConfigValue("LAMBDA_ENTRY", "lambdaEntry");
        lambdaFunctionName = getConfigValue("LAMBDA_FUNCTION_NAME", "lambdaFunctionName");
        lambdaLogLevel = getConfigValue("LAMBDA_LOG_LEVEL", "lambdaLogLevel");
        appRunnerPort = getConfigValue("APP_RUNNER_PORT", "appRunnerPort");
        appRunnerServiceName = getConfigValue("APP_RUNNER_SERVICE_NAME", "appRunnerServiceName");
        appRunnerCpu = getConfigValue("APP_RUNNER_CPU", "appRunnerCpu");
        appRunnerMemory = getConfigValue("APP_RUNNER_MEMORY", "appRunnerMemory");

        // Create an S3 bucket for message storage
        Bucket bucket;
        // Bucket bucket = Bucket.Builder.create(this, "StorageBucket")
        //     .bucketName(s3BucketName)
        //     .build();
        // Bucket bucket;
        if (s3UseExistingBucket) {
            bucket = (Bucket) Bucket.fromBucketName(this, "StorageBucket", s3BucketName);
        } else {
            // Create the bucket with a removal policy of RETAIN so it is not deleted with the stack.
            bucket = Bucket.Builder.create(this, "StorageBucket")
                    .bucketName(s3BucketName)
                    .removalPolicy(s3RetainBucket ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY)
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
                                bucket.getBucketArn(),
                                bucket.getBucketArn() + "/*"
                        ))
                        .build();
        Role s3AccessRole = Role.Builder.create(this, "S3AccessRole")
                .assumedBy(new ArnPrincipal(awsArnPrinciple))
                .inlinePolicies(java.util.Collections.singletonMap("S3AccessPolicy", PolicyDocument.Builder.create()
                        .statements(List.of(s3ObjectCrudPolicyStatement))
                        .build()))
                .build();

        // Create an SQS queue for Tansu messages
        Queue tansuQueue = Queue.Builder.create(this, "TansuQueue")
                .queueName(sqsQueueName)
                .build();
/*
        // Create a new VPC for the Aurora cluster.
        Vpc auroraVpc = Vpc.Builder.create(this, "AuroraVpc")
                .maxAzs(2)
                .build();

        // Create the Aurora PostgreSQL cluster using Serverless v2.
        DatabaseCluster auroraCluster = DatabaseCluster.Builder.create(this, "AuroraCluster")
                .engine(DatabaseClusterEngine.auroraPostgres(
                        AuroraPostgresClusterEngineProps.builder()
                                .version(AuroraPostgresEngineVersion.VER_13_4)
                                .build()
                        )
                )
                .clusterIdentifier("tansu-sqs-bridge-database-cluster")
                .defaultDatabaseName("mydatabase")
                .credentials(Credentials.fromGeneratedSecret("clusteradmin"))
                .serverlessV2MinCapacity(0.5)
                .serverlessV2MaxCapacity(2.0)
                .vpc(auroraVpc)
                .enableDataApi(true)
                // Use DESTROY for lower cost testing. In production, consider RETAIN.
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        // --- End new section for Aurora PostgreSQL with AuroraDB ---

        // --- New section: Create a table in the Aurora PostgreSQL database ---
        // Build the SQL create statement for the table.
        String createTableSql = "CREATE TABLE IF NOT EXISTS " + tableName +
                " (id SERIAL PRIMARY KEY, data VARCHAR(255));";

        // Build the AWS SDK call for the RDS Data API.
        AwsSdkCall executeSqlCall = AwsSdkCall.builder()
                .service("RDSDataService")
                .action("executeStatement")
                .parameters(new HashMap<String, Object>() {{
                    put("resourceArn", auroraCluster.getClusterArn());
                    put("secretArn", auroraCluster.getSecret().getSecretArn());
                    put("database", "mydatabase");  // Ensure this matches the defaultDatabaseName above.
                    put("sql", createTableSql);
                }})
                .physicalResourceId(PhysicalResourceId.of("TableCreation" + tableName))
                .build();

        // Create the custom resource to execute the SQL statement.
        AwsCustomResource tableCreationResource = new AwsCustomResource(this, "TableCreationResource",
                AwsCustomResourceProps.builder()
                        .onCreate(executeSqlCall)
                        .policy(AwsCustomResourcePolicy.fromStatements(java.util.Collections.emptyList()))
                        .build()
        );
        // --- End new section: Create a table in the Aurora PostgreSQL database ---
*/


/*
        // Create the loggingLambda function
        //Object x = Runtime.ALL.stream().map(Object::toString).collect(Collectors.toList());
        Runtime lambdaRuntimeEnum = Runtime.ALL.stream()
                .filter(r -> r.toString().equalsIgnoreCase(lambdaRuntime))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid Lambda runtime: " + lambdaRuntime));
        Function tansuLambda = NodejsFunction.Builder.create(this, "SQSLambda")
                //.runtime(lambdaRuntimeEnum)
                .runtime(Runtime.NODEJS_20_X)
                .entry(lambdaEntry)
                .handler("lambda.handler")
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
                        .build())
                .functionName(lambdaFunctionName)
                //.sourceMap(true)
                //.sourcesContent(true)
                //.logLevel(LogLevel.INFO)
                //.keepNames(true)
                .build();

        // Attach Tansu SQS queue as an event source to the Tansu Lambda
        tansuLambda.addEventSource(new SqsEventSource(tansuQueue));

*/

        /*
        Function tansuLambda = Function.Builder.create(this, "SQSLambda")
                .runtime(Runtime.NODEJS_20_X)
                .handler("lambda.handler")
                .code(Code.fromAsset("src", AssetOptions.builder()
                        .bundling(BundlingOptions.builder()
                                .image(Runtime.NODEJS_20_X.getBundlingImage())
                                .command(Arrays.asList("bash", "-c", "npm install && cp -R . /asset-output"))
                                .build())
                        .build()))
                .functionName("loggingLambdaHandler")
                .build();
        */

        // Create the GitHub Projection Lambda function
        //Function githubProjectionLambda = Function.Builder.create(this, "GithubProjectionLambda")
        //        .runtime(Runtime.NODEJS_16_X)
        //        .handler("lambda.handler")
        //        .code(Code.fromAsset("src/lib/main.js"))
        //        .functionName("githubProjectionLambdaHandler")
        //        .environment(Map.of("GITHUB_PROJECTION_TABLE", githubProjectionTable.getTableName()))
        //        .build();

        // Grant the GitHub Projection Lambda write access to the DynamoDB table
        //githubProjectionTable.grantWriteData(githubProjectionLambda);

        // Attach the GitHub events SQS queue as an event source to the GitHub Projection Lambda
        //githubProjectionLambda.addEventSource(new SqsEventSource(tansuQueue));

        // Build Docker image asset for the consumer container (from consumer/ folder)
        DockerImageAsset dockerImage = DockerImageAsset.Builder.create(this, "ConsumerImage")
                .directory(".")
                .build();

        List<Object> imageEnvironmentVariables = List.of(
                Map.of("name", "STORAGE_ENGINE", "value", tansuStorageEngine),
                Map.of("name", "CLUSTER_ID", "value", kafkaClusterId),
                Map.of("name", "CONSUMER_GROUP", "value", kafkaConsumerGroup),
                Map.of("name", "TOPIC_NAME", "value", kafkaTopicName),
                Map.of("name", "USE_EXISTING_TOPIC", "value", kafkaUseExistingTopic),
                Map.of("name", "SQS_QUEUE_URL", "value", tansuQueue.getQueueUrl())
        );

        // Create an App Runner service for the consumer container
        ImageConfigurationProperty imageConfiguration = ImageConfigurationProperty.builder()
                .port(appRunnerPort)
                .runtimeEnvironmentVariables(imageEnvironmentVariables)
                .build();

        ImageRepositoryProperty imageRepository = ImageRepositoryProperty.builder()
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

        SourceConfigurationProperty sourceConfiguration = CfnService.SourceConfigurationProperty.builder()
                .imageRepository(imageRepository)
                .authenticationConfiguration(CfnService.AuthenticationConfigurationProperty.builder()
                        .accessRoleArn(appRunnerEcrAccessRole.getRoleArn())
                        .build())
                .autoDeploymentsEnabled(true)
                .build();

        CfnService appRunnerService = CfnService.Builder.create(this, "ConsumerService")
                .serviceName(appRunnerServiceName)
                .sourceConfiguration(sourceConfiguration)
                .instanceConfiguration(CfnService.InstanceConfigurationProperty.builder()
                        .cpu(appRunnerCpu)
                        .memory(appRunnerMemory)
                        .build())
                .build();

        // Outputs
        CfnOutput.Builder.create(this, "S3BucketName")
                .value(bucket.getBucketName())
                .build();

        CfnOutput.Builder.create(this, "S3AccessRoleArn")
                .value(s3AccessRole.getRoleArn())
                .build();

        CfnOutput.Builder.create(this, "TansuQueueUrl")
                .value(tansuQueue.getQueueUrl())
                .build();

        CfnOutput.Builder.create(this, "AppRunnerServiceUrl")
                .value(appRunnerService.getAttrServiceUrl())
                .build();
    }

    private String getConfigValue(String envVarName, String contextKey) {
        String value = System.getenv(envVarName);
        if (value == null || value.isEmpty()) {
            Object contextValue = this.getNode().tryGetContext(contextKey);
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
