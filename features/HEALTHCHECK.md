# HEALTHCHECK Feature

This feature introduces an HTTP health check endpoint to the existing Lambda function. When invoked with the `--healthcheck` CLI flag, the application will instantiate an Express server that listens on port 8080 and serves a simple health check response. This addition provides a convenient way to verify that the service is running and its dependencies are correctly configured.

## Implementation Details

1. **Source File Updates (`src/lib/main.js`):**
   - Check if the command line arguments include `--healthcheck`.
   - If detected, create an Express application that listens on port 8080.
   - Implement a GET endpoint at `/health` that returns a JSON payload reflecting a successful status (e.g., `{ status: "ok" }`).
   - Ensure that starting the health check server is logged appropriately.
   - If the health check flag is not present, continue with the usual GitHub event processing.

2. **Test File Updates (`tests/unit/main.test.js`):**
   - Add unit tests to simulate invocation of the health check endpoint. You can use a tool like `supertest` (if necessary, add a lightweight HTTP request dependency) or perform a direct call to the Express app to verify that it correctly responds with the expected JSON data.
   - Verify that the endpoint returns a 200 status code with the JSON response `{ status: "ok" }`.

3. **README File Updates (`README.md`):**
   - Update the documentation to describe the new `--healthcheck` CLI flag.
   - Document that running `npm run healthcheck` will start the health check server on port 8080.
   - Provide usage examples for invoking the health check endpoint.

4. **Dependencies File Updates (`package.json`):**
   - Ensure that the Express dependency is available (already included) and update any relevant scripts if needed.
   - Validate that the health check feature is referenced in the CLI commands.

## Benefits

- **Operational Monitoring:** A simple HTTP endpoint to confirm that the service is alive and connected to necessary resources.
- **Simplicity:** The health check is lightweight and integrates as a side-effect of the main application, requiring minimal extra code.
- **Documentation:** Clear instructions in the README allow contributors and operators to easily test service health.

This feature aligns with the mission by providing an easy and reliable way to monitor the system's health in real-time while ensuring robust and traceable operations, complementing the resilience and monitoring goals of the repository.
