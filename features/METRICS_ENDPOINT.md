# METRICS_ENDPOINT Feature

This feature adds a new command-line option, `--metrics`, to start an HTTP server that exposes real-time application metrics collected during event processing. This endpoint will enhance observability by providing immediate insight into the in-memory counters, such as total events processed, successful events, skipped events, and database failures.

# Overview

The METRICS_ENDPOINT is designed to align with our mission of building a resilient and observable system. By exposing the metrics via an HTTP endpoint, operators and developers can easily monitor the health and performance of the GitHub event processing pipeline.

# Implementation Details

1. **Source File Updates (`src/lib/main.js`):**
   - Parse the command-line arguments to detect the presence of the `--metrics` flag.
   - When `--metrics` is detected, instantiate an Express server (using the already included Express dependency) that listens on a designated port (e.g., 8090).
   - Define a GET endpoint at `/metrics` that responds with the JSON output from the exported `getMetrics()` function.
   - Log server startup and the port number to inform users that the metrics server is running.

2. **Test File Updates (`tests/unit/main.test.js`):**
   - Add a new test suite using `supertest` to simulate HTTP GET requests to the `/metrics` endpoint.
   - Verify that a GET request returns an HTTP 200 status code and a JSON payload that accurately reflects the in-memory metrics.
   - Include tests that confirm the response structure and values after processing various event scenarios.

3. **README File Updates (`README.md`):**
   - Update the CLI Options section to document the new `--metrics` flag, including usage examples (e.g., `npm run metrics` if aliased) and the endpoint details.
   - Clearly explain that the metrics endpoint allows users to monitor application performance in real time.

4. **Dependencies File Updates (`package.json`):**
   - No new dependencies are required as `express` is already included. However, ensure that `supertest` is available as a development dependency to support HTTP testing.

# Benefits

- **Enhanced Observability:** Operators gain immediate access to application performance data through a simple HTTP request.
- **Operational Monitoring:** Facilitates integration with monitoring tools and dashboards, improving the overall reliability of the service.
- **Ease of Testing:** Provides a straightforward mechanism to validate the health and performance of the event processing pipeline through automated tests.

This feature is focused on achievable value within a single repository and leverages existing code and dependencies to enhance the system's monitoring capabilities.