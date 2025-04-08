# s3-sqs-bridge (Versioned Amazon S3 Object Put Event replay capable queuing to SQS)

S3 SQS Bridge integrates Amazon S3 with AWS SQS to provide versioned event replay and real-time processing using Lambda and DynamoDB for durable offset tracking. This tool supports both AWS and local deployments (with Docker Compose and MinIO). Additionally, it now supports processing GitHub event messages for projection creation in PostgreSQL.

This repository includes:

- AWS CloudFormation/CDK stacks for setting up necessary AWS infrastructure.
- A Node.js Lambda function that processes S3 events forwarded to SQS.
- A new Lambda function for processing GitHub event messages from a dedicated SQS queue and creating projections in a PostgreSQL database.
- A comprehensive CLI for replaying events, processing source projections, and performing health checks.

For the full mission statement, see [MISSION.md](MISSION.md). For contribution guidelines, please refer to [CONTRIBUTING.md](CONTRIBUTING.md). Setup instructions are provided in [SETUP.md] and licensing details in [LICENSE].

Additionally, check out the intentïon agentic-lib on GitHub: [agentic-lib](https://github.com/xn-intenton-z2a/agentic-lib).

## Key Features

- **Robust Defaults:** The configuration automatically applies sensible default values for all environment variables (even in production), reducing the risk of misconfigurations.
- **Event Replay:** Replay S3 object versions in chronological order to rebuild state.
- **Real-Time Processing:** Forwards S3 events to an SQS queue for immediate processing.
- **GitHub Event Projections:** Processes GitHub event messages to create or update projections stored in a PostgreSQL database.
- **High Availability:** Optimized for low cost and high scalability on AWS Fargate Spot.

## Configuration

The application uses environment variables to configure AWS S3, SQS, DynamoDB, and PostgreSQL parameters. If these variables are not explicitly set, the following defaults are used:

- BUCKET_NAME: `s3-sqs-bridge-bucket-test`
- OBJECT_PREFIX: `events/`
- REPLAY_QUEUE_URL: `https://test/000000000000/s3-sqs-bridge-replay-queue-test`
- DIGEST_QUEUE_URL: `https://test/000000000000/s3-sqs-bridge-digest-queue-test`
- OFFSETS_TABLE_NAME: `s3-sqs-bridge-offsets-table-test`
- PROJECTIONS_TABLE_NAME: `s3-sqs-bridge-projections-table-test`
- SOURCE_LAMBDA_FUNCTION_NAME: `s3-sqs-bridge-source-lambda-test`
- AWS_ENDPOINT: `https://test`

New PostgreSQL related environment variables:

- PG_CONNECTION_STRING: PostgreSQL connection string (default: `postgres://user:pass@localhost:5432/db`)
- GITHUB_PROJECTIONS_TABLE: PostgreSQL table name for GitHub event projections (default: `github_event_projections`)
- GITHUB_EVENT_QUEUE_URL: URL of the dedicated SQS queue for GitHub events (default: `https://test/000000000000/github-event-queue-test`)

## Usage

### CLI Options

- `--help`: Show usage instructions.
- `--source-projection`: Run the Lambda handler for processing source S3 events.
- `--replay-projection`: Run the Lambda handler for replayed events.
- `--replay`: Replay all object versions from S3 in order.
- `--healthcheck`: Start an HTTP health check server on port 8080.

### Running Locally

Use the following npm scripts:

- `npm start` to run the main CLI.
- `npm run healthcheck` to start the health check server.
- `npm run replay` to replay S3 events.

For GitHub event projections, deploy the new Lambda function using your preferred deployment method (e.g., AWS CDK, Serverless Framework) after configuring the required PostgreSQL environment variables.

## Testing

The project uses Vitest for unit testing. In addition to the standard tests, unit tests for the GitHub event projection handler are provided. Run the tests with:

```
npm test
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
