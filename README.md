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

- [Docker Compose](https://docs.docker.com/compose/)
- [MinIO Client (mc)](https://docs.min.io/docs/minio-client-quickstart-guide.html)

### Start Local Services

1. **Launch LocalStack:**

   ```bash
   docker compose up --detach
   ```

   The Compose file sets up:
   - **MinIO:** Simulates AWS S3 at [http://localhost:9000](http://localhost:9000) (console at port 9001).
   - **LocalStack:** Simulates AWS S3 and SQS endpoints at [http://localhost:4566](http://localhost:4566).

2. **Create a Bucket in MinIO:**

   ```bash
   mc alias set local http://localhost:9000 minioadmin minioadmin
   mc mb local/s3-sqs-bridge-bucket
   mc version enable local/s3-sqs-bridge-bucket
   ```

3. **Run the Consumer Service:**

   ```bash
   docker compose up --build --detach consumer
   ```

   The consumer service listens for S3 events and forwards them to SQS using environment variables configured to target MinIO and LocalStack.

4. **Trigger the replay Job:**

   ```bash
   docker compose run --rm consumer node src/lib/main.js --replay
   ```

   This command replays all S3 events (i.e. object versions) in chronological order by sending messages to SQS.

---

## Deployment to AWS

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [AWS CDK v2](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [Maven](https://maven.apache.org/)

### Deploy the Stack

1. **Install Dependencies:**

   ```bash
   npm install
   mvn install
   ```

2. **Bootstrap the CDK Environment:**

   ```bash
   cdk bootstrap
   ```

3. **Deploy the Infrastructure:**

   ```bash
   cdk deploy S3SqsBridgeStack
   ```

   This deployment provisions:
   - A versioned S3 bucket.
   - An SQS queue for event delivery.
   - A DynamoDB table for offset tracking.
   - A Docker-based consumer and replay job running on Fargate Spot (or AppRunner).
   - (Optional) AWS Lambda functions for real-time event processing.

4. **Test the CDK Stack:**

   ```bash
   mvn test
   ```

---

## Source Implementation Details

The core logic is implemented in the unified CLI entry at `src/lib/main.js`. It supports multiple modes of operation:

- **Real-Time Lambda Handler:** For use as an AWS Lambda function.
- **replay Job:** For replaying all historical events.
- **Health Check Server:** For container health monitoring.

### Pseudocode Example: Core replay Algorithm

Below is a pseudocode fragment that introduces the actual implementation of the replay algorithm:

```javascript
// Pseudocode: List and sort all object versions from the bucket.
async function listAndSortAllObjectVersions() {
  let versions = [];
  let params = { Bucket: BUCKET_NAME };
  do {
    const response = await s3.send(new ListObjectVersionsCommand(params));
    versions.push(...response.Versions);
    // Set markers for pagination.
    params.KeyMarker = response.NextKeyMarker;
    params.VersionIdMarker = response.NextVersionIdMarker;
  } while (response.IsTruncated);

  // Sort versions by last modified date (chronologically).
  return versions.sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified));
}
```

### Actual Implementation Snippets

- **replay Logic:**

  ```javascript
  export async function replay() {
    logInfo(`Starting replay job for bucket ${config.BUCKET_NAME}`);
    const versions = await listAndSortAllObjectVersions();
    logInfo(`Processing ${versions.length} versions...`);
    for (const version of versions) {
      const event = {
        bucket: config.BUCKET_NAME,
        key: version.Key,
        versionId: version.VersionId,
        eventTime: version.LastModified
      };
      await sendEventToSqs(event);
    }
    logInfo('replay job complete.');
  }
  ```

- **Real-Time Event Handler:**

  ```javascript
  export async function realtimeLambdaHandler(event) {
    logInfo(`Received realtime event: ${JSON.stringify(event)}`);
    for (const record of event.Records) {
      const { s3 } = record;
      const eventDetail = {
        bucket: s3.bucket.name,
        key: s3.object.key,
        eventTime: record.eventTime,
        versionId: s3.object.versionId,
        sequencer: s3.object.sequencer
      };
      await sendEventToSqs(eventDetail);
    }
  }
  ```

These fragments, along with robust retry logic and structured logging, ensure that events are processed reliably under production conditions.

---

## Running Integration Tests

- **Unit Tests (JavaScript):**

  ```bash
  npm run test:unit
  ```

- **CDK Stack Tests (Java):**

  ```bash
  mvn test
  ```



---

## Quick Deployment Guide

1. **Clone the Repository and Install Dependencies:**

   ```bash
   git clone <repository-url>
   cd s3-sqs-bridge
   npm install
   mvn install
   ```

2. **Deploy the AWS Infrastructure:**

   ```bash
   cdk bootstrap
   cdk deploy S3SqsBridgeStack
   ```

3. **Build and Run the Docker Image:**

   ```bash
   docker build -t s3-sqs-bridge .
   ```

4. **Run Locally (using Docker Compose):**

   ```bash
   docker compose up --detach
   ```

5. **Trigger the replay Job:**

   ```bash
   docker compose run --rm consumer node src/lib/main.js --replay
   ```

---

## Contributing

We welcome contributions from the community. Please review the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on:

- Code quality and style (modern JavaScript using Node 20 with ESM)
- Testing and continuous integration requirements
- Commit message conventions and branching strategies

Whether you’re looking to use the solution as-is or fork it to build new features, your feedback and contributions help
us improve the robustness and utility of the S3 SQS Bridge.

---

## License

Distributed under the [MIT License](LICENSE).

---

This README provides a thorough guide for users and contributors alike, covering all aspects from local development and
testing to production deployment on AWS. The included pseudocode fragments illustrate the core logic of the solution
while the detailed instructions ensure that you can deploy, run, and extend the solution with confidence.
