# GitHub API and Webhooks Documentation
## https://docs.github.com/en/rest
## https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads
Combined official documentation of GitHub's REST API endpoints and Webhooks event payloads. Covers authentication, pagination, rate limiting, REST endpoint schemas, event types (push, pull_request, etc.), JSON payload structures, and delivery semantics. Provides HTTP request/response examples, schema definitions, and guidance on error handling, pagination best practices, and webhook validation—critical for designing robust Zod schemas, authentication flows, and event-driven pipelines. Last verified May 2024; authoritative source maintained by GitHub.
## License: Not Applicable

# AWS SQS Client (AWS SDK v3) Documentation
## https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/index.html
Detailed API reference for the AWS SDK v3 SQS client. Covers operations such as SendMessage, ReceiveMessage, DeleteMessage, batch actions, retry modes, middleware customization, and error classification. Includes code snippets for promise-based usage, batching strategies, visibility timeout configuration, and dead-letter queue integration—essential for building resilient event enqueueing, DLQ forwarding, and at-least-once processing pipelines. Last reviewed June 2024; maintained by AWS.
## License: Apache 2.0

# AWS Lambda SQS Event Source Mapping Documentation
## https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
Comprehensive guide on configuring AWS Lambda event source mappings for SQS queues. Explains concurrency controls, batch size, visibility timeouts, retry behavior, and DLQ integration. Details handler invocation patterns, error-handling strategies for partial failures, scaling considerations, and best practices for idempotency and message deduplication. Vital for architecting reliable, scalable, at-least-once event processing pipelines in AWS Lambda. Last updated March 2024; official AWS documentation.
## License: Apache 2.0

# AWS CDK API Reference
## https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html
Comprehensive reference for AWS CDK v2 constructs, focusing on SQS, Lambda, and IAM modules. Provides class and interface definitions, construct usage patterns, and property details in TypeScript. Highlights recommended practices for configuring event source mappings, dead-letter queues, retry policies, environment variables, and Lambda function bundling—crucial for infrastructure-as-code and consistent deployment of serverless event-driven architectures. Last updated May 2024; official AWS CDK documentation.
## License: Apache 2.0

# Node.js & Express Documentation
## https://nodejs.org/en/docs/
## https://expressjs.com/en/starter/installing.html
Combined guidance on Node.js core APIs (event loop, HTTP server, ESM modules, environment variable handling with dotenv) and Express framework fundamentals (routing, middleware, error handling). Illustrates production-grade server configurations for health-check/metrics endpoints, asynchronous patterns, environment-driven configuration, and observability best practices. Last verified March 2024; maintained by Node.js and Express communities.
## License: MIT

# PostgreSQL & Node-Postgres Pooling Documentation
## https://node-postgres.com/features/pooling
Official documentation for PostgreSQL connection pooling using the `pg` module in Node.js. Explains Pool configuration options (max connections, idle timeouts), client acquisition/release semantics, integration with retry/backoff strategies, and connection leak detection. Includes performance tuning tips and resource cleanup best practices—fundamental for high-throughput, resilient event projection handlers. Last reviewed April 2024; maintained by node-postgres authors.
## License: PostgreSQL License

# Zod Validation Library Documentation
## https://zod.dev
Authoritative guide to Zod schema validation for TypeScript and JavaScript. Covers defining object, union, and refinement schemas, custom transformers, async parsing, error formatting, and performance optimizations. Demonstrates integration patterns for input validation in serverless functional pipelines, strict type inference, and comprehensive error handling—key for validating incoming GitHub event payloads before database operations. Last updated May 2024; maintained by Zod maintainers.
## License: MIT

# Testing Tools Documentation
## https://vitest.dev/
## https://github.com/visionmedia/supertest
Central resource for Vitest and Supertest testing frameworks. Vitest docs detail configuration options, mocking strategies, snapshot testing, and coverage integration for rapid unit test development. Supertest documentation provides examples for simulating HTTP requests against Express servers, validating response payloads, and chaining assertions. Together, they form a complete toolkit for unit and integration testing of event handlers, CLI commands, and HTTP endpoints. Last updated June 2024; maintained by respective communities.
## License: MIT