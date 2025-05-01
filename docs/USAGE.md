# Usage Instructions

## Running the Application

Use the following npm scripts:

- `npm start` to run the GitHub event projection handler.
- `npm run healthcheck` to start the health check server.
- `npm run replay` to replay S3 events.

You can also directly run the application with Node:

```
node src/lib/main.js
```

Additional flags:

- `--metrics`: Starts an HTTP metrics endpoint on the port defined by `METRICS_PORT` (default 3000). The endpoint is available at `/metrics`.
- `--status-endpoint`: Starts an HTTP status endpoint on the port defined by `STATUS_PORT` (default 3000). The endpoint is available at `/status`.

## Dead Letter Queue Configuration

You can configure a dead-letter queue to receive events that could not be persisted after all retry attempts.

- **DEAD_LETTER_QUEUE_URL**: URL of the SQS queue to use for dead-lettering failed GitHub event projections. When set, failed records will be routed to this queue instead of failing the batch. If undefined or empty, dead-letter routing is skipped.

## Enhanced Retry Logic with Exponential Backoff

The GitHub Event Projection handler now uses enhanced retry logic when connecting to PostgreSQL and executing queries. It implements an exponential backoff mechanism for retrying failed operations. This mechanism calculates the delay as follows:

  computedDelay = baseDelay * (2^(attempt - 1))

For example, with a baseDelay of 1000ms:

- Attempt 1: 1000 * 2^(1-1) = 1000ms
- Attempt 2: 1000 * 2^(2-1) = 2000ms
- Attempt 3: 1000 * 2^(3-1) = 4000ms

This strategy helps to reduce the load on the database during intermittent failures and improves overall system resilience.

## Database Connection Pooling

You can configure connection pooling for PostgreSQL to improve performance and resource utilization:

- **PG_POOL_SIZE**: Maximum number of clients in the pool (default: 10).

Example usage:

```bash
PG_POOL_SIZE=20 PG_MAX_RETRIES=5 PG_RETRY_DELAY_MS=500 node src/lib/main.js
```

## Metrics and Status Endpoints

### Metrics Endpoint

By starting the application with the `--metrics` flag, an HTTP metrics endpoint is activated using Express. The server listens on port `METRICS_PORT` (default 3000).

- **URL:** `GET http://localhost:3000/metrics`
- **Response:** JSON object containing:
  ```json
  {
    "totalEvents": number,
    "successfulEvents": number,
    "skippedEvents": number,
    "dbFailures": number,
    "dbRetryCount": number,
    "deadLetterEvents": number
  }
  ```

### Status Endpoint

By starting the application with the `--status-endpoint` flag, an HTTP status endpoint is activated using Express. The server listens on port `STATUS_PORT` (default 3000).

- **URL:** `GET http://localhost:3000/status`
- **Response:** JSON object containing the same metrics as the `/metrics` endpoint:
  ```json
  {
    "totalEvents": number,
    "successfulEvents": number,
    "skippedEvents": number,
    "dbFailures": number,
    "dbRetryCount": number,
    "deadLetterEvents": number
  }
  ```