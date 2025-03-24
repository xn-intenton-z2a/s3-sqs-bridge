# s3-sqs-bridge (Versioned Amazon S3 Object Put Event replay capable queuing to SQS)

This repository deploys an AWS CloudFormation Stack to create a replay capable event queue. The solution used AWS SQS
for message delivery and AWS Lambda for real-time processing with AWS DynamoDB for durable offset tracking. Storage
is an S3 bucket with object versioning enabled and a Put event can be processed in read-time or replayed in their
original order.

`s3-sqs-bridge` is built to run in both AWS and local environments (via Docker Compose with MinIO).

This is an offshoot from another project where I began to set up [tansu io](https://github.com/tansu-io/tansu), but S3 was all I needed.

A tangent of interest might be [s3-ootb-broker](S3-OOTB-BROKER.md) which is a messaging system and IRC style chat system.

---

## Key Features

- **Storage:** Uses an AWS S3 bucket with versioning enabled to persist events.
- **Event replay:** A replay job replays S3 object versions in chronological order.
- **Real-Time Processing:** Forwards S3 events to an SQS queue.
- **Low Idle Cost:** Designed to run on Fargate Spot with zero desired instances until needed.

---

## Project Structure

The key components of the project are organized as follows:

```text
.
├── Dockerfile
├── package.json
├── cdk.json
├── pom.xml
├── compose.yml
├── entrypoint.sh
├── src/lib/main.js
├── aws/main/java/com/intention/S3SqsBridge/S3SqsBridgeApp.java
├── aws/main/java/com/intention/S3SqsBridge/S3SqsBridgeStack.java
├── aws/test/java/com/intentïon/S3SqsBridge/S3SqsBridgeStackTest.java
└── tests/unit/main.test.js
```

Additional files include GitHub workflows (for CI/CD and maintenance scripts) and various helper scripts under the `scripts/` directory.

---

## TODO

* An S3 policy statement with just the right permissions for the CDK deployment and Terraform to create it.
* A role to assume to do the deployment and Terraform to create it.
* Script to set up the OCID for the IAM/GitHub integration.
* Install s3-bridge from a GitHub Actions Workflow using the branch name in all resources (if not main).
* Publish a Jar to a GitHub Maven Repository.
* Publish the JS to a GitHub NPM Repository.
* Find a way to externalise the digest so a consuming library can inject a custom digest into the stack.
* Export every useful function here and write some initialisers for re-use too
* Create a sample skeleton implementation that delegates to this library.

---

## Getting Started

### Prerequisites

- [Node.js v20+](https://nodejs.org/)
- [AWS CLI](https://aws.amazon.com/cli/) (configured with sufficient permissions)
- [Java JDK 11+](https://openjdk.java.net/)
- [Apache Maven](https://maven.apache.org/)
- [AWS CDK 2.x](https://docs.aws.amazon.com/cdk/v2/guide/home.html) (your account should be CDK bootstrapped)
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/)

---

## Deployment to AWS

See also:
* local running using [Localstack](LOCALSTACK.md).
* Debugging notes for the AWS deployment here [DEBUGGING](DEBUGGING.md).

### Clone the Repository

```bash

git clone https://github.com/your-username/s3-sqs-bridge.git
cd s3-sqs-bridge
```

### Install Node.js Dependencies and test

```bash

npm install
npm test
```

Package the CDK, deploy the CDK stack which rebuilds the Docker image, and deploy the AWS infrastructure:
```bash

./mvnw clean package
```

Maven build output:
```log
...truncated...
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] 
[INFO] --- maven-jar-plugin:2.4:jar (default-jar) @ s3-sqs-bridge ---
[INFO] Building jar: /Users/antony/projects/s3-sqs-bridge/target/s3-sqs-bridge-0.0.1.jar
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  13.743 s
[INFO] Finished at: 2025-03-18T22:19:37Z
[INFO] ------------------------------------------------------------------------
Unexpected error in background thread "software.amazon.jsii.JsiiRuntime.ErrorStreamSink": java.lang.NullPointerException: Cannot read field "stderr" because "consoleOutput" is null
```
(Yes... the last line, the error "is a bug in the CDK, but it doesn't affect the deployment", according to Copilot.)

Destroy a previous stack and delete related log groups:
```bash

npx cdk 
```
(The commands go in separately because the CDK can be interactive.)
```bash

aws logs delete-log-group \
  --log-group-name "/aws/s3/s3-sqs-bridge-bucket"
aws logs delete-log-group \
  --log-group-name "/aws/lambda/s3-sqs-bridge-replay-batch-function"
aws logs delete-log-group \
  --log-group-name "/aws/lambda/s3-sqs-bridge-replay-function"
aws logs delete-log-group \
  --log-group-name "/aws/lambda/s3-sqs-bridge-source-function"
```

Deploys the AWS infrastructure including an App Runner service, an SQS queue, Lambda functions, and a PostgreSQL table.
```bash

npx cdk deploy
```

Example output:
```log
...truncated...
S3SqsBridgeStack: success: Published f23b4641b15bfe521c575e572ebe41ca2c4613e3e1ea8a9c8ef816c73832cddf:current_account-current_region
S3SqsBridgeStack: deploying... [1/1]
S3SqsBridgeStack: creating CloudFormation changeset...

 ✅  S3SqsBridgeStack

✨  Deployment time: 105.48s

Outputs:
S3SqsBridgeStack.BucketArn = arn:aws:s3:::s3-sqs-bridge-bucket
S3SqsBridgeStack.OffsetsTableArn = arn:aws:dynamodb:eu-west-2:541134664601:table/offsets
S3SqsBridgeStack.OneOffJobLambdaArn = arn:aws:lambda:eu-west-2:541134664601:function:replayBatchLambdaHandler
S3SqsBridgeStack.ReplayQueueUrl = https://sqs.eu-west-2.amazonaws.com/541134664601/s3-sqs-bridge-replay-queue
...truncated...
S3SqsBridgeStack.s3BucketName = s3-sqs-bridge-bucket (Source: CDK context.)
S3SqsBridgeStack.s3ObjectPrefix = events/ (Source: CDK context.)
S3SqsBridgeStack.s3RetainBucket = false (Source: CDK context.)
S3SqsBridgeStack.s3UseExistingBucket = false (Source: CDK context.)
Stack ARN:
arn:aws:cloudformation:eu-west-2:541134664601:stack/S3SqsBridgeStack/30cf37a0-0504-11f0-b142-06193d47b789

✨  Total time: 118.12s

```

Write to S3 (2 keys, 2 times each, interleaved):
```bash

aws s3 ls s3-sqs-bridge-bucket/events/
for value in $(seq 1 2); do
  for id in $(seq 1 2); do
    echo "{\"id\": \"${id?}\", \"value\": \"$(printf "%010d" "${value?}")\"}" > "${id?}.json"
    aws s3 cp "${id?}.json" s3://s3-sqs-bridge-bucket/events/"${id?}.json"
  done
done
aws s3 ls s3-sqs-bridge-bucket/events/
```

Output:
```
upload: ./1.json to s3://s3-sqs-bridge-bucket/events/1.json    
upload: ./1.json to s3://s3-sqs-bridge-bucket/events/1.json   
...
upload: ./2.json to s3://s3-sqs-bridge-bucket/events/2.json   
2025-03-19 23:47:07         31 1.json
2025-03-19 23:52:12         31 2.json
```

List the versions of all s3 objects:
```bash

aws s3api list-object-versions \
  --bucket s3-sqs-bridge-bucket \
  --prefix events/ \
  | jq -r '.Versions[] | "\(.LastModified) \(.Key) \(.VersionId) \(.IsLatest)"' \
  | head -5 \
  | tail -r
```

Output (note grouping by key, requiring a merge by LastModified to get the Put Event order):
```log
2025-03-23T02:37:10+00:00 events/2.json NGxS.PCWdSlxMPVIRreb_ra_WsTjc4L5 false
2025-03-23T02:37:12+00:00 events/2.json 7SDSiqco1dgFGKZmRk8bjSoyi5eD5ZLW true
2025-03-23T02:37:09+00:00 events/1.json cxY1weJ62JNq4DvqrgfvIWKJEYDQinly false
2025-03-23T02:37:11+00:00 events/1.json wHEhP8RdXTD8JUsrrUlMfSANzm7ahDlv true
```

Check the projections table:
```bash

aws dynamodb scan \
  --table-name s3-sqs-bridge-projections-table \
  --output json \
  | jq --compact-output '.Items[] | with_entries(if (.value | has("S")) then .value = .value.S else . end)' \
  | tail --lines=5
```

Output:
```json lines
{"id":"events/1.json","value":"{\"id\": \"1\", \"value\": \"0000000002\"}\n"}
{"id":"events/2.json","value":"{\"id\": \"2\", \"value\": \"0000000002\"}\n"}
```

Count the attributes on the digest queue:
```bash

aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-2.amazonaws.com/541134664601/s3-sqs-bridge-digest-queue \
  --attribute-names ApproximateNumberOfMessages
```

Output:
```json
{
  "Attributes": {
    "ApproximateNumberOfMessages": "4"
  }
}
```

---

## Contributing

We welcome contributions from the community. Please review the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on:

- JavaScript using Node 20 with ESM

---

## License

Distributed under the [MIT License](LICENSE).

---
