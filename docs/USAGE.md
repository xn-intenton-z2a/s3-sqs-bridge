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

These changes ensure that retry behavior, error messaging, and connection handling follow Clean Code principles.
