# Overview

Introduce a unified diagnostics server that consolidates health metrics status and API version metadata endpoints under a single CLI flag. Operators can start one HTTP server on a configurable port to expose
- GET /health readiness check returns status ok
- GET /metrics in memory metrics snapshot
- GET /status same payload as metrics for compatibility
- GET /meta installed version and supported api versions by reading API_VERSIONS.md

# Source File Updates (src/lib/main.js)

Add function createDiagnosticsServer that returns an Express app with the four routes above
Add function startDiagnosticsEndpoint that reads DIAGNOSTICS_PORT default 3000 and starts the server logging startup via logInfo
Modify CLI handling to detect --diagnostics flag When present invoke startDiagnosticsEndpoint and keep process running until termination
Detect legacy flags --metrics --status-endpoint and --healthcheck and log deprecation warning then invoke startDiagnosticsEndpoint for backward compatibility
Ensure graceful shutdown closes the diagnostics server and database pool on SIGINT and SIGTERM

# Test File Updates (tests/unit/main.test.js)

Add Supertest tests for GET /health returns 200 and payload status ok
Add tests for GET /metrics GET /status and GET /meta matching default values
Add a unit test simulating --diagnostics flag invokes startDiagnosticsEndpoint on configured port without blocking other logic
Add tests that legacy flags --metrics --status-endpoint and --healthcheck trigger the unified diagnostics server with deprecation warnings

# Documentation Updates (README.md and docs/USAGE.md)

In CLI options document --diagnostics flag starts unified diagnostics server on DIAGNOSTICS_PORT default 3000
Replace separate metrics and status endpoint entries with diagnostics entry
Provide examples
node src/lib/main.js --diagnostics
curl http://localhost:3000/health
curl http://localhost:3000/meta
Update USAGE section in docs to include diagnostics flag and available endpoints

# Benefits

Simplifies operational tooling by exposing a single endpoint for readiness health metrics and version information
Reduces port allocations and flag collisions
Improves discoverability for monitoring probes and tooling integration
Maintains backward compatibility with legacy flags