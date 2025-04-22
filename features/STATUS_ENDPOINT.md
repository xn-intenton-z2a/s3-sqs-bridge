# STATUS_ENDPOINT

This feature consolidates the existing HEALTHCHECK and METRICS_ENDPOINT functionalities into a single unified status endpoint. When the CLI flag --status is provided, an Express server will be started (defaults to port 8080) and will expose two endpoints:

1. /health: Returns a simple JSON payload indicating the service is running (status ok).
2. /metrics: Returns real-time application metrics (totalEvents, successfulEvents, skippedEvents, dbFailures) through the getMetrics API.

## Implementation Details

### Source File Updates (src/lib/main.js):
- Parse process arguments for the new --status flag.
- If --status is detected, initialize a single Express application.
- Define two GET endpoints:
  - /health: Responds with a JSON message { status: ok }.
  - /metrics: Responds with the result of getMetrics() in JSON format.
- Log a startup message specifying that both endpoints are available and on which port.
- Preserve the existing functionality for event processing when the flag is absent.

### Test File Updates (tests/unit/main.test.js):
- Extend the unit test suite to simulate HTTP requests to the /health and /metrics endpoints using supertest.
- Validate that a GET request to /health returns a 200 status code and { status: ok }.
- Validate that a GET request to /metrics returns a 200 status code along with the current metrics as a JSON payload.
- Ensure that the integration of both endpoints in a single Express server does not interfere with other application logic.

### README File Updates (README.md):
- Update the CLI Options section to document the --status flag.
- Provide usage examples indicating running the application with --status for unified monitoring.
- Clearly explain that both health checks and metrics can now be accessed via a single endpoint.

### Dependencies File Updates (package.json):
- Ensure that supertest is available as a development dependency to support the HTTP integration tests.

## Benefits

- Simplifies operations by combining related status endpoints into a single, unified API.
- Reduces code duplication and improves maintainability.
- Enhances observability by providing quick access to both service health and performance metrics through one flag.
- Aligns with the mission of building an observable and resilient system in a single repository.
