# s3-sqs-bridge (Versioned Amazon S3 Object Put Event replay capable queuing to SQS)

This repository deploys an AWS CloudFormation Stack to create a replay capable event queue. The solution used AWS SQS
for message delivery and AWS Lambda for real-time processing with AWS DynamoDB for durable offset tracking. Storage
is an S3 bucket with object versioning enabled and a Put event can be processed in read-time or replayed in their
original order.

`s3-sqs-bridge` is built to run in both AWS and local environments (via Docker Compose with MinIO).

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
├── aws/main/java/com/intention/S3SqsBridge/S3SqsBridgeStack.java
├── aws/test/java/com/intentïon/S3SqsBridge/S3SqsBridgeStackTest.java
└── tests/unit/main.test.js
```

Additional files include GitHub workflows (for CI/CD and maintenance scripts) and various helper scripts under the `scripts/` directory.

---

## Getting Started Locally

### Prerequisites

- [Node.js v20+](https://nodejs.org/)
- [AWS CLI](https://aws.amazon.com/cli/) (configured with proper permissions)
- [Java JDK 11+](https://openjdk.java.net/)
- [Apache Maven](https://maven.apache.org/)
- [AWS CDK 2.x](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/)

### Clone the Repository

```bash

git clone https://github.com/your-username/s3-sqs-bridge.git
cd s3-sqs-bridge
```

### Install Node.js Dependencies and test

```bash

npm install ; npm test
```

### Start Local Services

Launch with LocalStack (Simulates AWS S3 and SQS endpoints):
```bash

docker compose up --detach localstack
```

Create a bucket:
```bash

aws --endpoint-url=http://localhost:4566 s3 mb s3://s3-sqs-bridge-bucket-local
```

Turn on versioning:
```bash

aws --endpoint-url=http://localhost:4566 s3api put-bucket-versioning --bucket s3-sqs-bridge-bucket-local --versioning-configuration Status=Enabled
```

Create the replay queue:
```bash

aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name s3-sqs-bridge-replay-queue-local
```

Write to S3:
```bash

echo "test body" > test-file.txt ; aws --endpoint-url=http://localhost:4566 s3 cp test-file.txt s3://s3-sqs-bridge-bucket-local/events/test-key
```

Write to S3 (a second time to create 2 versions):
```bash

echo "test body" > test-file.txt ; aws --endpoint-url=http://localhost:4566 s3 cp test-file.txt s3://s3-sqs-bridge-bucket-local/events/test-key
```

Check file:
```bash

aws --endpoint-url=http://localhost:4566 s3 ls s3://s3-sqs-bridge-bucket-local/events/
```

File as object "test-key":
```
2025-03-18 21:22:35         10 test-key
```

Run replay job:
```bash

BUCKET_NAME='s3-sqs-bridge-bucket-local' \
OBJECT_PREFIX='events/' \
REPLAY_QUEUE_URL='http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local' \
AWS_ENDPOINT='http://localhost:4566' \
npm run replay
```

Replay job processes the object versions and completes:
```log
> @xn-intenton-z2a/s3-sqs-bridge@0.1.5 replay
> node src/lib/main.js --replay

{"level":"info","timestamp":"2025-03-18T21:49:15.892Z","message":"Configuration loaded","config":{"BUCKET_NAME":"s3-sqs-bridge-bucket-local","OBJECT_PREFIX":"events/","REPLAY_QUEUE_URL":"http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local","AWS_ENDPOINT":"http://localhost:4566"}}
{"level":"info","timestamp":"2025-03-18T21:49:15.901Z","message":"Starting replay job for bucket s3-sqs-bridge-bucket-local prefix events/"}
{"level":"info","timestamp":"2025-03-18T22:03:49.912Z","message":"Processing 2 versions..."}
{"level":"info","timestamp":"2025-03-18T22:03:49.921Z","message":"Sent message to SQS queue http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local, MessageId: d8757b8a-23fc-4e49-bf1d-729e14b9c940"}
{"level":"info","timestamp":"2025-03-18T22:03:49.925Z","message":"Sent message to SQS queue http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local, MessageId: fc7768d2-e6d2-416a-9cb8-70b0e94b5ee3"}
{"level":"info","timestamp":"2025-03-18T22:03:49.925Z","message":"replay job complete."}
```

Observe message on the SQS replay queue:
```bash

aws --endpoint-url=http://localhost:4566 sqs receive-message --queue-url http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local
```

Message:
```json
{
    "Messages": [
        {
            "MessageId": "02c7ce02-fafb-4974-8498-1ec10fb6b40b",
            "ReceiptHandle": "AQEBwJ+...",
            "MD5OfBody": "d41d8cd98f00b204e9800998ecf8427e",
            "Body": "{\"bucket\":\"s3-sqs-bridge-bucket-local\",\"key\":\"events/test-key\",\"versionId\":\"null\",\"eventTime\":\"2025-03-18T21:22:35.000Z\"}"
        }
    ]
}
```

Purge the replay queue:
```bash

aws --endpoint-url=http://localhost:4566 sqs purge-queue --queue-url http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local
```

Observe no message on SQS for the replay queue after purging:
```bash

aws --endpoint-url=http://localhost:4566 sqs receive-message --queue-url http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local
```

Create the source queue:
```bash

aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name s3-sqs-bridge-source-queue-local
```

Set up the source queue to send events to the source queue when a Put event occurs:
```bash

aws --endpoint-url=http://localhost:4566 s3api put-bucket-notification-configuration --bucket s3-sqs-bridge-bucket-local --notification-configuration '{
  "QueueConfigurations": [
    {
      "QueueArn": "arn:aws:sqs:eu-west-2:000000000000:s3-sqs-bridge-source-queue-local",
      "Events": ["s3:ObjectCreated:*"]
    }
  ]
}'
```

Purge the source queue (it has a test event on iot after adding the notification):
```bash

aws --endpoint-url=http://localhost:4566 sqs purge-queue --queue-url http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-source-queue-local
```

Observe no message on the SQS source queue:
```bash

aws --endpoint-url=http://localhost:4566 sqs receive-message --queue-url http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-source-queue-local
```

Write to S3 (a third time to create 3 versions):
```bash

echo "test body" > test-file.txt ; aws --endpoint-url=http://localhost:4566 s3 cp test-file.txt s3://s3-sqs-bridge-bucket-local/events/test-key
```

Observe put message on the SQS source queue:
```bash

aws --endpoint-url=http://localhost:4566 sqs receive-message --queue-url http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-source-queue-local
```

Message on source queue:
```json
{
    "Messages": [
        {
            "MessageId": "6d7f452a-ec4f-4ef9-baeb-d89d342dea25",
            "ReceiptHandle": "MTZiZjlhMzktZTk3OS00MjY3LWE0NzEtZGIxMDg3NGU5NzdhIGFybjphd3M6c3FzOmV1LXdlc3QtMjowMDAwMDAwMDAwMDA6czMtc3FzLWJyaWRnZS1zb3VyY2UtcXVldWUtbG9jYWwgNmQ3ZjQ1MmEtZWM0Zi00ZWY5LWJhZWItZDg5ZDM0MmRlYTI1IDE3NDIzMzU4NjUuMzEyNjgzNg==",
            "MD5OfBody": "c10bcfbbd6da23f4067cb532672846b4",
            "Body": "{\"Records\": [{\"eventVersion\": \"2.1\", \"eventSource\": \"aws:s3\", \"awsRegion\": \"eu-west-2\", \"eventTime\": \"2025-03-18T22:10:16.674Z\", \"eventName\": \"ObjectCreated:Put\", \"userIdentity\": {\"principalId\": \"AIDAJDPLRKLG7UEXAMPLE\"}, \"requestParameters\": {\"sourceIPAddress\": \"127.0.0.1\"}, \"responseElements\": {\"x-amz-request-id\": \"94e7eca4\", \"x-amz-id-2\": \"eftixk72aD6Ap51TnqcoF8eFidJG9Z/2\"}, \"s3\": {\"s3SchemaVersion\": \"1.0\", \"configurationId\": \"1618c5e0\", \"bucket\": {\"name\": \"s3-sqs-bridge-bucket-local\", \"ownerIdentity\": {\"principalId\": \"A3NL1KOZZKExample\"}, \"arn\": \"arn:aws:s3:::s3-sqs-bridge-bucket-local\"}, \"object\": {\"key\": \"events/test-key\", \"sequencer\": \"0055AED6DCD90281E5\", \"versionId\": \"AZWrSJQOESwdiUqy8Kodd1LOSwtYKixv\", \"eTag\": \"824da868c63f3ae1e7e5253a38c688b0\", \"size\": 10}}}]}"
        }
    ]
}
```

Launch the reseed in a Container (the same Docker file is used for ECS):
```bash

docker compose up --detach replay
```

docker compose logs replay
```bash

docker compose logs replay
```

Check the Docker logs for 3 messages on the SQS replay queue:
```log
s3-sqs-bridge  | 
s3-sqs-bridge  | > @xn-intenton-z2a/s3-sqs-bridge@0.1.5 replay
s3-sqs-bridge  | > node src/lib/main.js --replay
s3-sqs-bridge  | 
s3-sqs-bridge  | {"level":"info","timestamp":"2025-03-19T00:34:40.375Z","message":"Configuration loaded","config":{"BUCKET_NAME":"s3-sqs-bridge-bucket-local","OBJECT_PREFIX":"events/","REPLAY_QUEUE_URL":"http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local","AWS_ENDPOINT":"http://localstack:4566"}}
s3-sqs-bridge  | {"level":"info","timestamp":"2025-03-19T00:34:40.389Z","message":"Starting replay job for bucket s3-sqs-bridge-bucket-local prefix events/"}
s3-sqs-bridge  | {"level":"info","timestamp":"2025-03-19T00:34:40.455Z","message":"Processing 3 versions..."}
s3-sqs-bridge  | {"level":"info","timestamp":"2025-03-19T00:34:40.463Z","message":"Sent message to SQS queue http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local, MessageId: 0fc7e37b-fdaf-4024-99ab-15bde5925eed"}
s3-sqs-bridge  | {"level":"info","timestamp":"2025-03-19T00:34:40.468Z","message":"Sent message to SQS queue http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local, MessageId: f9eb65d8-0afa-4a37-a16b-a437f1f75a24"}
s3-sqs-bridge  | {"level":"info","timestamp":"2025-03-19T00:34:40.471Z","message":"Sent message to SQS queue http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local, MessageId: 87be69da-0dc1-4cfc-8dd2-645e00d6ee6d"}
s3-sqs-bridge  | {"level":"info","timestamp":"2025-03-19T00:34:40.471Z","message":"replay job complete."}
s3-sqs-bridge  | npm notice 
s3-sqs-bridge  | npm notice New major version of npm available! 9.8.1 -> 11.2.0
s3-sqs-bridge  | npm notice Changelog: <https://github.com/npm/cli/releases/tag/v11.2.0>
s3-sqs-bridge  | npm notice Run `npm install -g npm@11.2.0` to update!
s3-sqs-bridge  | npm notice 
```

---

## Deployment to AWS

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

### Handy Commands

Handy cleanup, Docker:
```bash

docker system prune --all --force --volumes
```

Handy cleanup, CDK:
```bash

rm -rf cdk.out
```

Handy cleanup, Node:
```bash

rm -rf node_modules ; rm -rf package-lock.json ; npm install
```

Run the Docker container with a shell instead of the default entrypoint:
```bash
docker build -t s3-sqs-bridge .
docker run -it \
  --env BUCKET_NAME='s3-sqs-bridge-bucket-local' \
  --env OBJECT_PREFIX='events/' \
  --env REPLAY_QUEUE_URL='http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/s3-sqs-bridge-replay-queue-local' \
  --env AWS_ENDPOINT='http://localhost:4566' \
  --entrypoint /bin/bash \
  s3-sqs-bridge:latest
```

---

## Contributing

We welcome contributions from the community. Please review the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on:

- Code quality and style (modern JavaScript using Node 20 with ESM)
- Testing and continuous integration requirements

---

## License

Distributed under the [MIT License](LICENSE).

---

This README provides a thorough guide for users and contributors alike, covering all aspects from local development and
testing to production deployment on AWS. The included pseudocode fragments illustrate the core logic of the solution
while the detailed instructions ensure that you can deploy, run, and extend the solution with confidence.
