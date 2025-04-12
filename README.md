# s3-sqs-bridge (Versioned Amazon S3 Object Put Event replay capable queuing to SQS)

s3-sqs-bridge integrates Amazon S3 with AWS SQS to enable versioned event replay and real-time processing using Lambda backed by a resilient PostgreSQL projection system. The GitHub Event Projections Lambda handler now features robust connection retries, enhanced logging with sensitive data masking, and strict schema validation using Zod.

This repository includes:

- AWS CloudFormation/CDK stacks for setting up the necessary AWS infrastructure.
- A Node.js Lambda function for processing S3 events forwarded to SQS.
- A GitHub Event Projections Lambda handler implemented in **src/lib/main.js** that processes GitHub event messages from a dedicated SQS queue, validates them, and creates/upserts projections in PostgreSQL with detailed logging and retry logic.
- A comprehensive CLI for event replay, projection processing, and health checks.

For the full mission statement, see [MISSION.md](MISSION.md). For contribution guidelines, please refer to [CONTRIBUTING.md](CONTRIBUTING.md). Setup instructions are provided in [SETUP.md] and licensing details in [LICENSE].

Additionally, visit the intentïon agentic-lib on GitHub: [agentic-lib](https://github.com/xn-intenton-z2a/agentic-lib).

## Key Features

- **Robust Defaults:** Sensible default values prevent misconfiguration.
- **Event Replay:** Replays S3 object versions to rebuild state.
- **Real-Time Processing:** S3 events are forwarded to SQS for immediate processing.
- **GitHub Event Projections:** Processes GitHub event messages to create or update PostgreSQL projections with enhanced retry and logging mechanisms that safely mask sensitive data.
- **High Availability:** Designed for scalable deployment on AWS Fargate Spot.

## Configuration

Environment variables configure AWS services and PostgreSQL parameters. Defaults are used if variables are not set:

- BUCKET_NAME: `s3-sqs-bridge-bucket-test`
- OBJECT_PREFIX: `events/`
- REPLAY_QUEUE_URL: `https://test/000000000000/s3-sqs-bridge-replay-queue-test`
- DIGEST_QUEUE_URL: `https://test/000000000000/s3-sqs-bridge-digest-queue-test`
- OFFSETS_TABLE_NAME: `s3-sqs-bridge-offsets-table-test`
- PROJECTIONS_TABLE_NAME: `s3-sqs-bridge-projections-table-test`
- SOURCE_LAMBDA_FUNCTION_NAME: `s3-sqs-bridge-source-lambda-test`
- AWS_ENDPOINT: `https://test`

PostgreSQL specific variables:

- PG_CONNECTION_STRING: PostgreSQL connection string (default: `postgres://user:pass@localhost:5432/db`)
- GITHUB_PROJECTIONS_TABLE: Table for GitHub event projections (default: `github_event_projections`)
- GITHUB_EVENT_QUEUE_URL: SQS URL for GitHub events (default: `https://test/000000000000/github-event-queue-test`)

Retry configuration for PostgreSQL:

- PG_MAX_RETRIES: Maximum retry attempts (default: 3)
- PG_RETRY_DELAY_MS: Delay in milliseconds between retries (default: 1000)

## Usage

### CLI Options

- `--help`: Show usage instructions.
- `--source-projection`: Run the Lambda handler for processing source S3 events.
- `--replay-projection`: Run the Lambda handler for replayed events.
- `--replay`: Replay all S3 object versions in order.
- `--healthcheck`: Start an HTTP health check server on port 8080.

### Running Locally

Use the following npm scripts:

- `npm start` to run the GitHub event projection handler (located in **src/lib/main.js**).
- `npm run healthcheck` to start the health check server.
- `npm run replay` to replay S3 events.

For GitHub event projections, deploy the Lambda function using your preferred method (e.g., AWS CDK, Serverless Framework) after setting the required PostgreSQL environment variables.

## Testing

This project uses Vitest for unit testing. Run the tests with:

```
npm test
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
