# s3-sqs-bridge (Versioned Amazon S3 Object Put Event replay capable queuing to SQS)

S3 SQS Bridge integrates Amazon S3 with AWS SQS to provide versioned event replay and real-time processing using Lambda and DynamoDB for durable offset tracking. This tool supports both AWS and local deployments (with Docker Compose and MinIO). It also processes GitHub event messages for projection creation in PostgreSQL with enhanced connection resilience, improved retry logic, and detailed logging for better clarity and maintainability.

This repository includes:

- AWS CloudFormation/CDK stacks for setting up necessary AWS infrastructure.
- A Node.js Lambda function that processes S3 events forwarded to SQS.
- A GitHub Event Projections Lambda handler implemented in **src/lib/main.js** that processes GitHub event messages from a dedicated SQS queue and creates projections in a PostgreSQL database. This handler features a consolidated and robust retry mechanism that creates a new PostgreSQL client for each connection attempt and logs detailed context for connection failures without exposing sensitive data.
- A comprehensive CLI for replaying events, processing source projections, and performing health checks.

For the full mission statement, see [MISSION.md](MISSION.md). For contribution guidelines, please refer to [CONTRIBUTING.md](CONTRIBUTING.md). Setup instructions are provided in [SETUP.md] and licensing details in [LICENSE].

Additionally, check out the intentïon agentic-lib on GitHub: [agentic-lib](https://github.com/xn-intenton-z2a/agentic-lib).

## Key Features

- **Robust Defaults:** Sensible default values for environment variables reduce misconfiguration risks.
- **Event Replay:** Replay S3 object versions in order to rebuild state.
- **Real-Time Processing:** Forwards S3 events to an SQS queue for immediate processing.
- **GitHub Event Projections:** Processes GitHub event messages to create or update projections stored in PostgreSQL. The logic now includes an improved connection strategy with consolidated retry mechanisms and enhanced logging to better diagnose issues.
- **High Availability:** Optimized for low cost and high scalability on AWS Fargate Spot.

## Configuration

The application uses environment variables to configure AWS S3, SQS, DynamoDB, and PostgreSQL parameters. Defaults are used when variables are not set:

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

Retry configuration environment variables for PostgreSQL connections and queries:

- PG_MAX_RETRIES: Maximum retry attempts (default: 3)
- PG_RETRY_DELAY_MS: Delay between retry attempts in milliseconds (default: 1000)

## Usage

### CLI Options

- `--help`: Show usage instructions.
- `--source-projection`: Run the Lambda handler for processing source S3 events.
- `--replay-projection`: Run the Lambda handler for replayed events.
- `--replay`: Replay all object versions from S3 in order.
- `--healthcheck`: Start an HTTP health check server on port 8080.

### Running Locally

Use the following npm scripts:

- `npm start` to run the GitHub event projection handler (located in **src/lib/main.js**).
- `npm run healthcheck` to start the health check server.
- `npm run replay` to replay S3 events.

For GitHub event projections, deploy the Lambda function using your preferred deployment method (e.g., AWS CDK, Serverless Framework) after configuring the required PostgreSQL environment variables and ensuring payloads conform to the Zod schema.

## Testing

The project uses Vitest for unit testing. Run the tests with:

```
npm test
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
