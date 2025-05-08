# Overview

Introduce a unified diagnostics server that consolidates health, metrics, status, and metadata endpoints under a single CLI flag. Operators can start one HTTP server on a configurable port to expose:

- GET /health readiness check returns { status: 'ok' }
- GET /metrics in-memory metrics snapshot
- GET /status same payload as /metrics for compatibility
- GET /meta installed version and supported API versions by reading API_VERSIONS.md and package.json

This replaces separate metrics, status, and health endpoints and deprecates legacy CLI flags in favor of `--diagnostics`.

# Implementation Details

1. **Express Server**
   - Implement createDiagnosticsServer in src/lib/main.js that returns an Express app with routes for /health, /metrics, /status, and /meta.
   - For /health respond with JSON { status: 'ok' }.
   - For /metrics and /status respond with JSON metrics from getMetrics().
   - For /meta read API_VERSIONS.md and package.json version to build { installed_version: string, supported_api_versions: [string] }.

2. **Server Startup**
   - Add startDiagnosticsEndpoint in src/lib/main.js that reads DIAGNOSTICS_PORT (default 3000) and starts the Express app.
   - Log startup with logInfo.

3. **CLI Flag Handling**
   - Detect `--diagnostics` in process.argv, invoke startDiagnosticsEndpoint, and keep process running until termination.
   - Detect legacy flags `--metrics`, `--status-endpoint`, and `--healthcheck`, log a deprecation warning, then invoke startDiagnosticsEndpoint for backward compatibility.

4. **Graceful Shutdown**
   - On SIGINT and SIGTERM, close the diagnostics server and database pool before exiting.

# Testing and Documentation

- **Unit Tests:**
  - Use Supertest to verify GET /health, GET /metrics, GET /status, and GET /meta return expected payloads and HTTP 200.
  - Test that `--diagnostics` flag starts the diagnostics server on DIAGNOSTICS_PORT without blocking other logic.
  - Test legacy flags trigger deprecation warnings and start the diagnostics server.

- **Documentation Updates:**
  - Update README.md and docs/USAGE.md to document the `--diagnostics` flag, DIAGNOSTICS_PORT, and available endpoints.
  - Mark `--metrics`, `--status-endpoint`, and `--healthcheck` as deprecated in CLI reference.

# Benefits

- Simplifies operational tooling by exposing all diagnostics endpoints under one server.
- Reduces port and flag collisions by consolidating multiple endpoints.
- Improves discoverability for monitoring probes and tooling integration.
- Maintains backward compatibility and clear deprecation path for existing flags.