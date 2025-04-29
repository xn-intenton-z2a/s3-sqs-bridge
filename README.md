# s3-sqs-bridge (Versioned Amazon S3 Object Put Event replay capable queuing to SQS)

s3-sqs-bridge integrates Amazon S3 with AWS SQS to enable versioned event replay and real-time processing using Lambda backed by a resilient PostgreSQL projection system. The GitHub Event Projections Lambda handler now features robust connection retries, enhanced logging with sensitive data masking, strict schema validation using Zod, basic in-memory metrics collection to track event processing performance, and optional dead-letter queue support for failed records.

This repository includes:

- AWS CloudFormation/CDK stacks for setting up the necessary AWS infrastructure.
- A Node.js Lambda function for processing S3 events forwarded to SQS.
- A GitHub Event Projections Lambda handler implemented in **src/lib/main.js** that processes GitHub event messages from a dedicated SQS queue, validates them, and creates/upserts projections in PostgreSQL with detailed logging, retry logic, metrics collection, and dead-letter queue routing.
- A comprehensive CLI for event replay, projection processing, and health checks.

For the full mission statement, see [MISSION.md](MISSION.md). For contribution guidelines, please refer to [CONTRIBUTING.md](CONTRIBUTING.md). Setup instructions are provided in [SETUP.md], and licensing details in [LICENSE](LICENSE).
Additionally, visit the intentïon agentic-lib on GitHub: [agentic-lib](https://github.com/xn-intenton-z2a/agentic-lib).

## Key Features

- **Dead-Letter Queue Support:** Failed GitHub event records after all retry attempts can be routed to an SQS dead-letter queue (when configured via `DEAD_LETTER_QUEUE_URL`).
- **Robust Defaults:** Sensible default values prevent misconfiguration.
- **Enhanced Retry Logic:** Exponential backoff retry strategy for PostgreSQL connections and queries.
- **Strict Validation:** Input validation using Zod for GitHub event payloads.
- **In-Memory Metrics:** Tracks total events, successes, skips, DB failures, retry attempts, and dead-lettered events.
- **HTTP Endpoints:** `/metrics` and `/status` endpoints for real-time metrics and health checks using Express.
- **High Availability:** Designed for scalable deployment on AWS Fargate Spot.

## Configuration

Environment variables configure AWS services and PostgreSQL parameters. Defaults are used if variables are not set:

- BUCKET_NAME
- OBJECT_PREFIX
- REPLAY_QUEUE_URL
- DIGEST_QUEUE_URL
- OFFSETS_TABLE_NAME
- PROJECTIONS_TABLE_NAME
- SOURCE_LAMBDA_FUNCTION_NAME
- AWS_ENDPOINT

PostgreSQL specific variables:

- PG_CONNECTION_STRING: PostgreSQL connection string (default: `postgres://user:pass@localhost:5432/db`)
- GITHUB_PROJECTIONS_TABLE: Table for GitHub event projections (default: `github_event_projections`)
- GITHUB_EVENT_QUEUE_URL: SQS URL for GitHub events (default: `https://test/000000000000/github-event-queue-test`)

Retry configuration for PostgreSQL:

- PG_MAX_RETRIES: Maximum retry attempts (default: 3)
- PG_RETRY_DELAY_MS: Delay in milliseconds between retries (default: 1000)

Dead-letter queue configuration:

- DEAD_LETTER_QUEUE_URL: SQS queue URL for dead-lettering failed GitHub event projections (optional)

## Metrics

The GitHub Event Projection handler now collects basic in-memory metrics during event processing:

- **totalEvents:** Total number of events received.
- **successfulEvents:** Number of events processed successfully.
- **skippedEvents:** Number of events skipped due to invalid JSON or failed validation.
- **dbFailures:** Number of events that encountered database query failures after retry attempts.
- **dbRetryCount:** Total number of database retry attempts.
- **deadLetterEvents:** Number of events routed to the dead-letter queue after exhausting retries.

Metrics are logged after processing and can be accessed programmatically via the exported `getMetrics()` function.

## Usage

### CLI Options

- `--help`: Show usage instructions.
- `--source-projection`: Run the Lambda handler for processing source S3 events.
- `--replay-projection`: Run the Lambda handler for replayed events.
- `--replay`: Replay all S3 object versions in order.
- `--healthcheck`: Start an HTTP health check server on port 8080.
- `--metrics`: Start HTTP metrics endpoint on port defined by `METRICS_PORT` (default 3000).
- `--status-endpoint`: Start HTTP status endpoint on port defined by `STATUS_PORT` (default 3000).

### Running Locally

Use the following npm scripts:

- `npm start` to run the GitHub event projection handler (located in **src/lib/main.js**).
- `npm run healthcheck` to start the health check server.
- `npm run replay` to replay S3 events.

Note: When running locally with a dummy event (i.e. no records), the handler will short-circuit and return success without attempting a database connection.

## Testing

This project uses Vitest for unit testing. Run the tests with:

```bash
npm test
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.