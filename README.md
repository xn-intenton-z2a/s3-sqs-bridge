# tansu-sqs-bridge

`tansu-sqs-bridge` is a lightweight Node.js bridge for integrating Kafka with AWS SQS, Lambda functions, and PostgreSQL projections.

Tansu SQS Bridge connects a Kafka‑compatible broker to AWS SQS where messages can trigger Lambda functions. One Lambda logs messages and another builds GitHub projections in a PostgreSQL table.

## Features

The solution consists of four main elements:

1. **tansu-consumer-to-sqs Container:** A Dockerized Node.js application (in `src/lib/main.js`) that listens to Kafka and forwards messages to an SQS queue.

2. **sqs-to-lambda-logger Lambda:** A Node.js Lambda function (in `src/lib/main.js`) that logs incoming SQS messages.

3. **sqs-to-lambda-github-projection Lambda:** A Node.js Lambda function (in `src/lib/main.js`) that processes GitHub event messages and updates a PostgreSQL table with resource projections.

4. **AWS Infrastructure:** Provisioned using AWS CDK, including SQS queues, Lambda functions, a PostgreSQL table, and an AppRunner service (in `aws/main/java/`) .

5. **TODO: GitHub Action Producer:**

6. **TODO: GitHub Action Consumer:**

## Table of Contents

- [Installation](#installation)
- [Deployment](#Deployment)
- [Contributing](#contributing)
- [License](#license)

## Installation

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Node.js v20+](https://nodejs.org/)
- [AWS CLI](https://aws.amazon.com/cli/) (configured with proper permissions)
- [Java JDK 11+](https://openjdk.java.net/)
- [Apache Maven](https://maven.apache.org/)
- [AWS CDK 2.x](https://docs.aws.amazon.com/cdk/v2/guide/home.html)

### Clone the Repository

```bash

git clone https://github.com/your-username/tansu-sqs-bridge.git
cd tansu-sqs-bridge
```

### Install Node.js Dependencies and test

```bash

npm install
npm test
```
## Running locally with an in memory broker

### Consumer - In memory Kafka

Build the Docker image for the consumer:
```bash

docker build -t tansu-consumer-to-sqs .
```

To run the consumer, use the following command:
```bash

STORAGE_ENGINE='memory://tansu/' USE_EXISTING_TOPIC='false' docker compose up --detach tansu-consumer-to-sqs
```

List topics with the Kafka CLI (expecting the topic `tansu-sqs-bridge-topic-local`):
```shell

kafka-topics \
  --bootstrap-server localhost:9092 \
  --list
```
Topics:
```
tansu-sqs-bridge-topic-local
```

Using the Apache Kafka CLI to send a message to the topic `tansu-sqs-bridge-topic-local`:
```bash

echo 'Hello World!' \
  | kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic tansu-sqs-bridge-topic-local
```

Docker logs for the consumer:
```log
2025-03-15 23:26:13 tansu-consumer-to-sqs-1  | Starting tansu broker... to be available on tcp://0.0.0.0:9092 and tcp://localhost:9092
2025-03-15 23:26:13 tansu-consumer-to-sqs-1  | Waiting for broker to initialize...
2025-03-15 23:26:15 tansu-consumer-to-sqs-1  | Starting consumer... for consumer group tansu-sqs-bridge-group-local on broker localhost:9092
2025-03-15 23:26:15 tansu-consumer-to-sqs-1  | If Topic tansu-sqs-bridge-topic-local doesn't exist, it will be created is false !== 'true'.
2025-03-15 23:26:15 tansu-consumer-to-sqs-1  | Messages from topic tansu-sqs-bridge-topic-local will be placed on SQS queue https://sqs.region.amazonaws.com/123456789012/tansu-sqs-bridge-queue-local
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | 
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | > @xn-intenton-z2a/tansu-sqs-bridge@0.1.5 tansu-consumer-to-sqs
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | > node src/lib/main.js --tansu-consumer-to-sqs
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | 
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Starting Kafka consumer to send messages to SQS...
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Creating Kafka consumer with group ID tansu-sqs-bridge-group-local
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Connecting to Kafka Admin on localhost:9092
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Connected to Kafka Admin on localhost:9092
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Listing topics on localhost:9092
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Topic 'tansu-sqs-bridge-topic-local' does not exist.
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Creating topic 'tansu-sqs-bridge-topic-local'
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Created topic 'tansu-sqs-bridge-topic-local'.
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Connecting to Kafka broker at localhost:9092
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Connected to Kafka broker at localhost:9092
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Subscribing to Kafka topic tansu-sqs-bridge-topic-local
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Subscribed to Kafka topic tansu-sqs-bridge-topic-local
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Starting consumer loop...
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | {"level":"INFO","timestamp":"2025-03-15T23:26:16.734Z","logger":"kafkajs","message":"[Consumer] Starting","groupId":"tansu-sqs-bridge-group-local"}
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | {"level":"INFO","timestamp":"2025-03-15T23:26:16.745Z","logger":"kafkajs","message":"[ConsumerGroup] Consumer has joined the group","groupId":"tansu-sqs-bridge-group-local","memberId":"tansu-sqs-consumer-9ed6c62f-2a33-4509-b263-0688c82b2bf2","leaderId":"tansu-sqs-consumer-9ed6c62f-2a33-4509-b263-0688c82b2bf2","isLeader":true,"memberAssignment":{"tansu-sqs-bridge-topic-local":[0]},"groupProtocol":"RoundRobinAssigner","duration":10}
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Starting health check endpoint on port 8080
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Keep-alive loop active (logging every 30 seconds)
2025-03-15 23:26:16 tansu-consumer-to-sqs-1  | Health check running on port 8080
2025-03-15 23:26:46 tansu-consumer-to-sqs-1  | Keep-alive loop active (logging every 30 seconds)
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  | Received message from topic=tansu-sqs-bridge-topic-local partition=0 offset=0
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  | Message key: null value: Hello World!
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  | Sending message to SQS. params: {
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |   "QueueUrl": "https://sqs.region.amazonaws.com/123456789012/tansu-sqs-bridge-queue-local",
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |   "MessageBody": "Hello World!",
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |   "MessageAttributes": {
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |     "Topic": {
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |       "DataType": "String",
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |       "StringValue": "tansu-sqs-bridge-topic-local"
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |     },
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |     "Partition": {
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |       "DataType": "Number",
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |       "StringValue": "0"
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |     },
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |     "Offset": {
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |       "DataType": "Number",
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |       "StringValue": "0"
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |     }
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  |   }
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  | }
2025-03-15 23:26:56 tansu-consumer-to-sqs-1  | FAKED send message to SQS for 'tansu-sqs-bridge-queue-local'. MessageId: dummy-message
2025-03-15 23:27:16 tansu-consumer-to-sqs-1  | Keep-alive loop active (logging every 30 seconds)
2025-03-15 23:27:46 tansu-consumer-to-sqs-1  | Keep-alive loop active (logging every 30 seconds)

```

To stop the in memory consumer, use the following command:
```bash

docker compose down tansu-consumer-to-sqs
```

### Consumer - connected to mino

Start minio for local s3 compatible storage:
```bash

docker compose up -d minio
```

Mino comes up:
```log
WARN[0000] The "AWS_ACCESS_KEY_ID" variable is not set. Defaulting to a blank string. 
WARN[0000] The "AWS_SECRET_ACCESS_KEY" variable is not set. Defaulting to a blank string. 
[+] Running 11/11
 ✔ minio Pulled                                                                                                                                                                                                           5.2s 
[+] Running 2/2
 ✔ Volume "tansu-sqs-bridge_minio"     Created                                                                                                                                                                            0.0s 
 ✔ Container tansu-sqs-bridge-minio-1  Started   
```


Create  minio alias for `local`:
```bash

docker compose exec minio \
   /usr/bin/mc \
   alias \
   set \
   local \
   http://localhost:9000 \
   minioadmin \
   minioadmin
```

Alias `local` created:
```log
WARN[0000] The "AWS_ACCESS_KEY_ID" variable is not set. Defaulting to a blank string. 
WARN[0000] The "AWS_SECRET_ACCESS_KEY" variable is not set. Defaulting to a blank string. 
mc: Configuration written to `/tmp/.mc/config.json`. Please update your access credentials.
mc: Successfully created `/tmp/.mc/share`.
mc: Initialized share uploads `/tmp/.mc/share/uploads.json` file.
mc: Initialized share downloads `/tmp/.mc/share/downloads.json` file.
Added `local` successfully.
```

Create a bucket for the tansu storage engine:
```bash

docker compose exec minio \
   /usr/bin/mc mb local/tansu-sqs-bridge-bucket-local
```

Bucket created:
```log
Bucket created successfully `local/tansu-sqs-bridge-bucket-local`.

```

Expect the bucket for the tansu storage engine to exist:
```bash

docker compose exec minio \
   /usr/bin/mc ls local
```

Bucket exists:
```log
WARN[0000] The "AWS_ACCESS_KEY_ID" variable is not set. Defaulting to a blank string. 
WARN[0000] The "AWS_SECRET_ACCESS_KEY" variable is not set. Defaulting to a blank string. 
[2025-03-16 12:32:57 UTC]     0B tansu-sqs-bridge-bucket-local/
```
The bucket should also be available at http://localhost:9001/ using the credentials `minioadmin:minioadmin`.

Create some access keys:
1. Go here: http://localhost:9001/access-keys
2. Click `Create Access Key`
3. Enter test credentials in the form:
   - Access Key: `local-key-id`
   - Secret Key: `local-secret`
```json
{
  "url": "http://localhost:9001/api/v1/service-account-credentials",
  "accessKey": "local-key-id",
  "secretKey": "local-secret",
  "api": "s3v4",
  "path": "auto"
}
```

Build the Docker image for the consumer:
```bash

docker build -t tansu-consumer-to-sqs .
```

To run the consumer, use the following command:
```bash

USE_EXISTING_TOPIC='false' AWS_ACCESS_KEY_ID='local-key-id' AWS_SECRET_ACCESS_KEY='local-secret' AWS_ENDPOINT='http://minio:9000' docker compose up --detach tansu-consumer-to-sqs
```

List topics with the Kafka CLI (expecting the topic `tansu-sqs-bridge-topic-local`):
```shell

kafka-topics \
  --bootstrap-server localhost:9092 \
  --list
```
Topics:
```
tansu-sqs-bridge-topic-local
```

Using the Apache Kafka CLI to send a message to the topic `tansu-sqs-bridge-topic-local`:
```bash

echo 'Hello World!' \
  | kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic tansu-sqs-bridge-topic-local
```

Docker logs for the consumer:
```log
TODO: Add logs

```

To stop the in memory consumer, use the following command:
```bash

docker compose down tansu-consumer-to-sqs
```

## Deployment

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
[INFO] --- maven-jar-plugin:2.4:jar (default-jar) @ tansu-sqs-bridge ---
[INFO] Building jar: /Users/antony/projects/tansu-sqs-bridge/target/tansu-sqs-bridge-0.0.1.jar
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  14.180 s
[INFO] Finished at: 2025-03-15T23:41:26Z
[INFO] ------------------------------------------------------------------------
Unexpected error in background thread "software.amazon.jsii.JsiiRuntime.ErrorStreamSink": java.lang.NullPointerException: Cannot read field "stderr" because "consoleOutput" is null
```
(Yes... the last line, the error "is a bug in the CDK, but it doesn't affect the deployment" (according to Copilot).)

Deploys the AWS infrastructure including an App Runner service, an SQS queue, Lambda functions, and a PostgreSQL table.
```bash

unset STORAGE_ENGINE
unset USE_EXISTING_TOPIC
unset CLUSTER_ID
npx cdk deploy
```

Example output:
```log
...truncated...
TansuSqsBridgeStack: deploying... [1/1]
TansuSqsBridgeStack: creating CloudFormation changeset...

 ✅  TansuSqsBridgeStack

✨  Deployment time: 215.83s

Outputs:
TansuSqsBridgeStack.AppRunnerServiceUrl = xjsmvg3c62.eu-west-2.awsapprunner.com
TansuSqsBridgeStack.S3AccessRoleArn = arn:aws:iam::541134664601:role/TansuSqsBridgeStack-S3AccessRole49D67050-Ci4Hpxc3ECtz
TansuSqsBridgeStack.S3BucketName = tansu-sqs-bridge-bucket
TansuSqsBridgeStack.TansuQueueUrl = https://sqs.eu-west-2.amazonaws.com/541134664601/tansu-sqs-bridge-queue
Stack ARN:
arn:aws:cloudformation:eu-west-2:541134664601:stack/TansuSqsBridgeStack/715f0d50-01f7-11f0-ab46-060c49f414cb


✨  Total time: 229.35s
```

To stop the in s3 consumer, use the following command:
```bash

docker compose down tansu-consumer-to-sqs
```

### Producer - Via Tansu Broker connected to AWS S3

Use the S3AccessRole ARN from the CDK output to create a new IAM role with S3 access:
**WARNING: This will replace the AWS credentials and session in the shell.**
```bash

. ./scripts/assume-s3-role.sh arn:aws:iam::541134664601:role/TansuSqsBridgeStack-S3AccessRole49D67050-Ci4Hpxc3ECtz
```
**WARNING: This will replace the current AWS credentials in the shell.**

The new session information is displayed:
```log
{
    "UserId": "AROAX37RDWOM4PJC6Q5ZV:tansu-sqs-bridge-short-lived-s3-session-1742088432",
    "Account": "541134664601",
    "Arn": "arn:aws:sts::541134664601:assumed-role/TansuSqsBridgeStack-S3AccessRole49D67050-Ci4Hpxc3ECtz/tansu-sqs-bridge-short-lived-s3-session-1742088432"
}
```

Check access to AWS:
```bash

aws sts get-caller-identity
```

Authenticated session:
```log
{
    "UserId": "AROAX37RDWOM4PJC6Q5ZV:tansu-sqs-bridge-short-lived-s3-session-1742088432",
    "Account": "541134664601",
    "Arn": "arn:aws:sts::541134664601:assumed-role/TansuSqsBridgeStack-S3AccessRole49D67050-Ci4Hpxc3ECtz/tansu-sqs-bridge-short-lived-s3-session-1742088432"
}
```

Check access to the S3 bucket:
```bash

aws s3 ls 's3://tansu-sqs-bridge-bucket' --summarize
```
Bucket contents:
```log

Total Objects: 0
   Total Size: 0
```

Run Tansu on its own to be the Kafka compatible broker:
```bash

STORAGE_ENGINE='s3://tansu-sqs-bridge-bucket/' CLUSTER_ID='tansu-sqs-bridge-cluster' docker compose up --detach tansu
```

List topics with the Kafka CLI (expecting `tansu-sqs-bridge-topic`):
```shell

kafka-topics \
  --bootstrap-server localhost:9082 \
  --list
```

Currently this does not list the topics and there is an error in the Docker logs
```log
2025-03-16 02:29:20 tansu-1  | 2025-03-16T02:29:20.977536Z ERROR peer{addr=192.168.65.1:23572}:metadata{api_key=3 api_version=12 correlation_id=3}: 
tansu_storage::dynostore: 1547: error=Generic { store: "S3", source: ListRequest { source: Client { status: 403, body: Some("<?xml version=\"1.0\" 
encoding=\"UTF-8\"?>\n<Error><Code>InvalidAccessKeyId</Code><Message>The AWS Access Key Id you provided does not exist in our records.</Message>
<AWSAccessKeyId>ASIAX37RDWOMXPY4VACX</AWSAccessKeyId><RequestId>CGGQNBYQH9PMXZK0</RequestId>
<HostId>rPuZcQdID6ChC1Ke3LZHDpIYWVFYRjBeKA90YMDCJD1fmkiNxLTQ6HJWC0vV9gPkF4jI9yduLJk=</HostId></Error>") } } } location=clusters/tansu-sqs-bridge-cluster/topics
```

**Should be** Topics:
```
tansu-sqs-bridge-topic
```

To stop tansu, use the following command:
```bash

docker compose down tansu
```

Clear the AWS session:
```bash

unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN
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
docker run -it \
  --env CLUSTER_ID='tansu-sqs-bridge-cluster-local' \
  --env STORAGE_ENGINE='memory://tansu/' \
  --env CONSUMER_GROUP='tansu-sqs-bridge-group-local' \
  --env TOPIC_NAME='tansu-sqs-bridge-topic-local' \
  --env USE_EXISTING_TOPIC='false' \
  --env SQS_QUEUE_URL='https://sqs.region.amazonaws.com/123456789012/tansu-sqs-bridge-queue-local' \
  --entrypoint /bin/ash \
  tansu-consumer-to-sqs:latest
```

The `tansu-sqs-bridge` JS source is in the container:
```log
/app # ls
node_modules       package-lock.json  package.json       src
/app # head -6 package.json 
{
  "name": "@xn-intenton-z2a/tansu-sqs-bridge",
  "version": "0.1.5",
  "description": "Tansu SQS Bridge for integrating Kafka, AWS SQS, Lambda, and Postgres projections.",
  "type": "module",
  "main": "src/lib/main.js",
/app # 
```

Update CDK and acknowledge a notification:
```bash

cdk bootstrap aws://541134664601/eu-west-2
cdk acknowledge 32775
```

## Contributing

We welcome contributions! Please review our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute effectively.

## License

Released under the MIT License (see [LICENSE](./LICENSE)).
