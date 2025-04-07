# Healthcheck Feature

This feature enhances the existing basic health check server by incorporating more comprehensive checks that monitor the operational status of the core services used by the S3 SQS Bridge. It will provide detailed health information on AWS components (S3, SQS, DynamoDB, Lambda) and expose a multi-endpoint HTTP API for better observability and proactive maintenance.

## Overview

- Extend the current `/` health check endpoint to include multiple checks:
  - **Service Availability:** Verify connectivity and responsiveness of S3, SQS, DynamoDB, and Lambda.
  - **Metrics Integration:** Incorporate a lightweight summary of operational metrics (e.g., event count, error rates) by interfacing with the Metrics feature.
  - **Configuration Health:** Confirm that all critical environment variables are set and valid.

## Design & Implementation

- **HTTP Endpoints:**
  - `/health`: Returns a broad health status including service checks and configuration validation.
  - `/readiness`: A specific endpoint to report readiness for request processing, ensuring that all dependencies are operational.
  - (Optionally) `/metrics`: Continue leveraging the existing Metrics feature but provide an aggregated view in the health check response.

- **Service Checks:**
  - Implement functions to ping AWS services (S3, SQS, DynamoDB, Lambda) by performing simple API calls and verifying responses.
  - Wrap these checks with timeout and retry policies similar to the exponential retry mechanism already used in the code.

- **Response Structure:**
  - A JSON object containing status for each service along with a global status. For example:
    ```json
    {
      "status": "ok",
      "services": {
        "s3": "ok",
        "sqs": "ok",
        "dynamodb": "ok",
        "lambda": "ok"
      }
    }
    ```

## Integration & Testing

- **Unit Testing:**
  - Add tests for each health check function to simulate both healthy and failure states using mocks for AWS SDK calls.
  - Ensure endpoints return the expected JSON structure and appropriate HTTP status codes (e.g., 200 for healthy, 503 for degraded).

- **CLI and Docker Support:**
  - Update CLI documentation so users understand the new health check endpoints.
  - Ensure the health check feature is compatible with both local and AWS deployments.

## Usage

- **For End Users/Operators:**
  - Access `/health` to get the overall system status and diagnose issues before they impact processing.
  - Use `/readiness` checks during deployment orchestration to determine if the application is ready to process events.

This feature aligns with the mission to ensure robust and durable event processing while providing enhanced observability and reliability across cloud and local environments.