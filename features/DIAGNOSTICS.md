# Overview

Introduce a unified diagnostics server that consolidates all existing health, metrics, status, and API version endpoints under a single CLI flag. Operators can start one HTTP server on a configurable port to expose:

- GET /health    readiness check
- GET /metrics   in-memory metrics snapshot
- GET /status    same payload as /metrics for compatibility
- GET /meta      API version metadata

This simplifies deployment, reduces port conflicts, and provides a single observable endpoint for probes and tooling integration.

# Source File Updates (src/lib/main.js)

- Add function createDiagnosticsServer that returns an Express app with four routes:
  - GET /health    returns { status: 'ok' }
  - GET /metrics   returns metrics via getMetrics()
  - GET /status    returns metrics via getMetrics()
  - GET /meta      returns { installed_version, supported_api_versions }

- Add function startDiagnosticsEndpoint that reads DIAGNOSTICS_PORT (default 3000) and starts the diagnostics server, logging startup via logInfo.

- Modify CLI handling to detect the --diagnostics flag. When present, invoke startDiagnosticsEndpoint and keep the process running until termination.

- Deprecate separate --metrics and --status-endpoint flags in favor of --diagnostics. Ensure backward compatibility by retaining these flags and redirecting them to startDiagnosticsEndpoint.

# Test File Updates (tests/unit/main.test.js)

- Add Supertest tests for each diagnostics route:
  - GET /health returns 200 and { status: 'ok' }
  - GET /metrics returns current metrics
  - GET /status returns same payload as /metrics
  - GET /meta returns installed and supported versions matching API_VERSIONS.md defaults

- Add a unit test simulating the --diagnostics flag to confirm that startDiagnosticsEndpoint is invoked on the configured port without blocking other flags.

# Documentation Updates (README.md and docs/USAGE.md)

- In the CLI Options section, document the new --diagnostics flag: starts a unified diagnostics server on DIAGNOSTICS_PORT (default 3000).

- Provide examples:
  node src/lib/main.js --diagnostics
  curl http://localhost:3000/health

- Update the Features list in README to mention the unified diagnostics capability, replacing separate entries for metrics and status endpoints.

# Benefits

- Simplifies operational tooling by exposing a single endpoint for readiness, health, metrics, and version information.
- Avoids multiple port allocations and flag collisions.
- Enhances consistency and discoverability for monitoring and platform probes.
- Respects existing functionality and provides backward compatibility for --metrics and --status-endpoint flags.