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

## Metrics Collection API

The GitHub Event Projection handler collects in-memory metrics during event processing to help track the performance and reliability of the system. The following metrics are maintained:

- **totalEvents:** The total number of events received.
- **successfulEvents:** The number of events successfully processed and persisted.
- **skippedEvents:** The number of events skipped due to invalid JSON or failed validation.
- **dbFailures:** The number of events that encountered database query failures after retry attempts.
- **dbRetryCount:** The total number of database retry attempts triggered during event processing.
- **deadLetterEvents:** The number of events that were routed to the dead-letter queue after exhausting retries.

The metrics are updated in real-time as events are processed, and a summary is logged after processing is complete.

### Exported Functions

- `getMetrics()`: Returns the current state of the metrics as a JSON object.
- `resetMetrics()`: Resets all metrics to their default values (zero).

### Example Usage

```js
// Example usage:
import { getMetrics, resetMetrics } from './src/lib/main.js';

console.log('Current Metrics:', getMetrics());

// Reset the metrics
resetMetrics();
console.log('Metrics after reset:', getMetrics());
```