# s3-sqs-bridge (Versioned Amazon S3 Object Put Event replay capable queuing to SQS)

S3 SQS Bridge integrates Amazon S3 with AWS SQS to provide versioned event replay and real-time processing using Lambda and DynamoDB for durable offset tracking. This tool supports both AWS and local deployments (with Docker Compose and MinIO).

This repository includes:

- AWS CloudFormation/CDK stacks for setting up necessary AWS infrastructure.
- A Node.js Lambda function that processes S3 events forwarded to SQS.
- A comprehensive CLI for replaying events, processing source projections, and performing health checks.

For the full mission statement, see [MISSION.md](MISSION.md). For contribution guidelines, please refer to [CONTRIBUTING.md](CONTRIBUTING.md). Setup instructions are provided in [SETUP.md] and licensing details in [LICENSE].

Additionally, check out the intentïon agentic-lib on GitHub: [agentic-lib](https://github.com/xn-intenton-z2a/agentic-lib).

## Key Features

- **Robust Defaults:** The configuration automatically applies sensible default values for all environment variables (even in production), reducing the risk of misconfigurations.
- **Event Replay:** Replay S3 object versions in chronological order to rebuild state.
- **Real-Time Processing:** Forwards S3 events to an SQS queue for immediate processing.
- **High Availability:** Optimized for low cost and high scalability on AWS Fargate Spot.

## Configuration

The application uses environment variables to configure AWS S3, SQS, and DynamoDB parameters. If these variables are not explicitly set, the following defaults are used:

- BUCKET_NAME: `s3-sqs-bridge-bucket-test`
- OBJECT_PREFIX: `events/`
- REPLAY_QUEUE_URL: `https://test/000000000000/s3-sqs-bridge-replay-queue-test`
- DIGEST_QUEUE_URL: `https://test/000000000000/s3-sqs-bridge-digest-queue-test`
- OFFSETS_TABLE_NAME: `s3-sqs-bridge-offsets-table-test`
- PROJECTIONS_TABLE_NAME: `s3-sqs-bridge-projections-table-test`
- SOURCE_LAMBDA_FUNCTION_NAME: `s3-sqs-bridge-source-lambda-test`
- AWS_ENDPOINT: `https://test`

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

## Testing

The project uses Vitest for unit testing. In addition to the standard tests, edge case scenarios covering DynamoDB pagination, offset mismatches, and error handling in Lambda handlers are also tested.

Run the tests with:

```
npm test
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

