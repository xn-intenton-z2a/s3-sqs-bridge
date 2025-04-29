# Overview

Extend the existing diagnostics capabilities by introducing a lightweight HTTP health check endpoint. Users can now start a health check server via a new CLI flag `--healthcheck`, which responds to `GET /health` with a simple readiness status. This feature enhances operational tooling by providing a minimal endpoint for integration probes, load-balancer checks, and Kubernetes readiness/liveness checks, leveraging the existing Express infrastructure.

# Source File Updates (src/lib/main.js)

- Add a new function `createHealthcheckServer` that returns an Express app with a single route `GET /health` responding with JSON `{ status: 'ok' }` and HTTP 200.
- Add a new function `startHealthcheckEndpoint` that reads `HEALTHCHECK_PORT` (default 8080), creates the health-check server, and listens on the port, logging startup using `logInfo`.
- Modify the module execution block to detect the `--healthcheck` CLI flag. If present, invoke `startHealthcheckEndpoint` and exit the process only when the server is closed.
- Ensure existing diagnostics flags (`--metrics`, `--status-endpoint`, `--config-dump`) remain fully functional and coexist without conflict.

# Test File Updates (tests/unit/main.test.js)

- Add unit tests for `createHealthcheckServer` using Supertest to verify that `GET /health` returns status 200 and body `{ status: 'ok' }`.
- Add a test for the `--healthcheck` flag simulation that ensures the server starts on the default port without blocking other flags (mock Express `listen` and `logInfo`).
- Verify that no other endpoints (`/metrics`, `/status`) are inadvertently removed.

# Documentation Updates (README.md and docs/USAGE.md)

- In CLI Options sections, document the new `--healthcheck` flag and explain that it starts an HTTP health check server on port `HEALTHCHECK_PORT` (default 8080), with `/health` for readiness checks.
- Provide an example: `node src/lib/main.js --healthcheck` and sample response.
- Update the Features list in README to mention health check capability as part of diagnostics improvements.

# Benefits

- Enables automated liveness and readiness probes for container orchestration and load-balancer health checks.
- Provides a lightweight endpoint with minimal overhead, ensuring compatibility with existing Express instrumentation.
- Consolidates all diagnostics and monitoring endpoints under one feature, reducing configuration drift and simplifying operational workflows.