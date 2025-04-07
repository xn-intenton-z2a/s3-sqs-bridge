# Metrics Feature

This feature introduces comprehensive metrics collection and exposition to enhance observability. It is designed to integrate seamlessly with the existing health check server, providing a new /metrics HTTP endpoint that exposes critical operational data in a Prometheus-friendly format.

## Overview

- Collect and record operational metrics such as:
  - Total number of S3 events processed
  - Number of messages sent to SQS
  - Number of failed operations and retries
  - Duration of replay jobs and Lambda handler executions
  - DynamoDB and S3 API call metrics

- Ensure compatibility with the existing logging and configuration framework.

## Endpoint Design & Implementation

- Extend the health check server to support a new route at `/metrics`.
- The endpoint will return metrics in plain text formatted per Prometheus exposition standards.
- Metrics will be collected using in-memory counters updated throughout various processing paths (e.g., upon processing S3 events, sending to SQS, writing to DynamoDB, handling API failures, and during retry operations).
- Include both cumulative and gauge metrics where applicable.

## Integration & Testing

- Ensure existing unit tests are extended or new tests are added to cover the `/metrics` endpoint behavior, including response format validation and value updates.
- Metrics collection should have minimal performance overhead and integrate with the existing observability model.

## Usage

- Operators can monitor the `/metrics` endpoint to gain insight into the real-time performance of the S3-SQS Bridge.
- The new metrics feature supports troubleshooting and aids in capacity planning as it exposes the operational footprint of event processing in production environments.

This feature aligns with the mission to provide robust and durable event processing capabilities while ensuring observability and high availability in real-time deployments.