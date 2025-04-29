# GitHub REST API Documentation
## https://docs.github.com/en/rest
Official documentation detailing GitHub's REST API endpoints, parameters, and best practices for authentication, pagination, and rate limiting. This resource is indispensable for integrating with GitHub services, responding to events, and troubleshooting API issues. It provides comprehensive HTTP request/response examples, schema definitions, and guidance on error handling, making it critical for building resilient event-driven pipelines. Last verified May 2024; authoritative source maintained by GitHub.
## License: Not Applicable

# GitHub Webhooks & Events Payloads
## https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads
In-depth specification of GitHub webhook event types and JSON payload structures. This documentation enumerates supported event actions (e.g., push, pull_request), field definitions, and delivery semantics, enabling precise schema validation and processing logic. Practical examples illustrate event workflows and edge cases—essential for designing robust Zod schemas and error-handling in the projection handler. Last updated April 2024; official GitHub documentation.
## License: Not Applicable

# AWS SQS Client (AWS SDK v3) Documentation
## https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/index.html
Detailed API reference for the AWS SDK v3 SQS client in JavaScript. Covers operations such as SendMessage, ReceiveMessage, DeleteMessage, and configuration options including retry modes and middleware customization. Includes code snippets for promise-based usage, batching strategies, and error classification—key for implementing efficient event enqueueing and DLQ forwarding. Last reviewed June 2024; maintained by AWS.
## License: Apache 2.0

# AWS CDK API Reference
## https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html
Comprehensive reference for AWS CDK v2 constructs, focusing on modules for SQS, Lambda, and IAM. Provides class and interface definitions, property details, and deployment patterns in TypeScript. Highlights recommended practices for configuring dead-letter queues, retry policies, and environment variables—crucial for infrastructure-as-code and consistent deployment of the GitHub event projection pipeline. Last updated May 2024; official AWS CDK documentation.
## License: Apache 2.0

# Node.js & Express Documentation
## https://nodejs.org/en/docs/
## https://expressjs.com/en/starter/installing.html
Combined guidance on Node.js core APIs (event loop, HTTP, ESM modules) and Express framework fundamentals (routing, middleware, error handlers). This merged resource supports the creation of robust `/metrics`, `/status`, and health-check endpoints, covers asynchronous programming best practices, and illustrates production-grade server configuration for observability and resilience. Last verified March 2024; Node.js and Express communities.
## License: MIT

# PostgreSQL & Node-Postgres Pooling Documentation
## https://node-postgres.com/features/pooling
Official documentation for PostgreSQL connection pooling using the `pg` module in Node.js. Explains Pool configuration options (max, idleTimeoutMillis), acquire/release semantics, and integration with retry/backoff strategies. Includes performance tuning tips and connection leak detection techniques—fundamental for high-throughput event projections. Last reviewed April 2024; maintained by node-postgres authors.
## License: PostgreSQL License

# Zod Documentation
## https://zod.dev
Authoritative guide to Zod schema validation for TypeScript and JavaScript. Covers object, union, and refinement schemas, as well as error formatting and asynchronous parsing. Provides advanced patterns for strict type inference, custom transformers, and performance considerations—key for validating incoming GitHub event payloads before database operations. Last updated May 2024; maintained by Zod maintainers.
## License: MIT

# Testing Tools Documentation
## https://vitest.dev/
## https://github.com/visionmedia/supertest
Central resource for Vitest and Supertest testing frameworks. Vitest docs detail configuration, mocking strategies, and snapshot testing for rapid unit test development. Supertest documentation offers clear examples for simulating HTTP requests against Express servers, validating responses, and chaining assertions. Together, they deliver a complete toolkit for unit and integration testing of event handlers and HTTP endpoints. Last updated June 2024; maintained by respective communities.
## License: MIT