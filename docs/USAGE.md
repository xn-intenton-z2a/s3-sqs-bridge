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

## Enhanced Retry Logic

The GitHub Event Projection handler now uses enhanced retry logic for connecting to PostgreSQL and executing queries. Helper functions have been isolated to:

- Compute the retry delay (`computeRetryDelay`).
- Log detailed retry errors (`logRetryError`).
- Log connection errors with masked connection strings (`logConnectionError`).

These improvements provide clearer error messages and better maintainability, ensuring that sensitive information is masked and that operations are retried reliably.

## Metrics Endpoint

By starting the application with the `--metrics` flag, an HTTP metrics endpoint is activated using Express. The server listens on port 3000 by default (or use the `METRICS_PORT` environment variable to configure the port).

### How to Run

Start the server with the metrics endpoint:

```
node src/lib/main.js --metrics
```

### Accessing Metrics

Once the server is running, send a GET request to the `/metrics` endpoint:

```
GET http://localhost:3000/metrics
```

The endpoint responds with a JSON object representing the current in-memory metrics:

```
{
  "totalEvents": number,
  "successfulEvents": number,
  "skippedEvents": number,
  "dbFailures": number
}
```

## Metrics Collection API

The GitHub Event Projection handler collects in-memory metrics during event processing to help track the performance and reliability of the system. The following metrics are maintained:

- **totalEvents:** The total number of events received.
- **successfulEvents:** The number of events successfully processed and persisted.
- **skippedEvents:** The number of events skipped due to invalid JSON or failed validation.
- **dbFailures:** The number of events that encountered database query failures even after retry attempts.

The metrics are updated in real-time as events are processed, and a summary is logged after processing is complete.

### Exported Functions

The following functions are provided to interact with the metrics:

- `getMetrics()`: Returns the current state of the metrics as a JSON object.
- `resetMetrics()`: Resets all metrics to their default values (zero).

### Example Usage

Below is an example showing how to retrieve and reset metrics:

```
// Example usage:
import { getMetrics, resetMetrics } from './src/lib/main.js';

console.log('Current Metrics:', getMetrics());

// Reset the metrics
resetMetrics();
console.log('Metrics after reset:', getMetrics());
```

These functions enable you to programmatically monitor and manage the metrics, ensuring that you can integrate them into your logging or monitoring system as needed.
