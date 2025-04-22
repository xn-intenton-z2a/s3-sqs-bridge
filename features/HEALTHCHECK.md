# HEALTHCHECK Feature Update

This feature updates the existing HEALTHCHECK functionality to explicitly implement an HTTP health check endpoint triggered by the `--healthcheck` CLI flag. This update ensures that when the flag is present, the application creates an Express server that listens on port 8080 and responds to GET requests on `/health` with a JSON payload `{ status: "ok" }`.

## Implementation

1. **Source File Updates (`src/lib/main.js`):**
   - Parse process arguments to check for the presence of `--healthcheck`.
   - If the flag is detected, instantiate an Express application.
   - Define a GET endpoint at `/health` that sends a response with JSON: `{ status: "ok" }`.
   - Start the server on port 8080 and log a startup message.
   - If the flag is not present, continue with the regular GitHub event processing logic.

2. **Test File Updates (`tests/unit/main.test.js`):**
   - Add unit tests to simulate and verify the health check endpoint functionality. Use a tool such as `supertest` to make HTTP requests to the Express server.
   - Validate that a GET request to `/health` returns a 200 status code and the expected JSON payload.

3. **README File Updates (`README.md`):**
   - Ensure that the README documents the new health check behavior under the CLI options section.
   - Update usage examples to demonstrate running `npm run healthcheck` and accessing the `/health` endpoint.

4. **Dependencies File Updates (`package.json`):**
   - Add `supertest` as a development dependency to support HTTP endpoint testing if it is not already present.
   - Verify that the health check functionality is referenced correctly within the CLI scripts.

## Benefits

- **Operational Monitoring:** Provides a simple way to verify that the application is running and responsive.
- **Improved Reliability:** A dedicated endpoint for health checks can be integrated with load balancers or other monitoring tools.
- **Ease of Use:** Clear documentation and tests ensure that contributors and operators can quickly understand and validate the service's operational state.

This update aligns with the mission of building a resilient, observable, and maintainable system that uses a single repository focused on core functionality without unnecessary complexity.