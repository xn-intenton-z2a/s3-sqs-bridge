# GitHub API and Webhooks Documentation
## https://docs.github.com/en/rest
## https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads
Combined official documentation of GitHub’s REST API and Webhooks event payloads. Covers authentication workflows (OAuth and token-based), endpoint schemas, pagination, rate limiting, and webhook signature validation. Includes detailed HTTP request/response examples, JSON schema definitions, error-handling strategies with retries, and event payload structures for designing reliable projection pipelines. Essential for generating Zod schemas, implementing authentication flows, and validating event-driven integrations. Last verified May 2024; authoritative, maintained by GitHub.
## License: Not Applicable

# AWS SQS and Lambda Integration and Best Practices
## https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/index.html
## https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
## https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
Integrated guide covering AWS SDK v3 SQS client API, Lambda event source mapping, and Dead-Letter Queue configuration. Details SendMessage, ReceiveMessage, batch operations, middleware customization, retry modes, and error classification in client-sqs. Explains Lambda polling, batch size, concurrency controls, visibility timeouts, redrive policies, and DLQ best practices. Provides actionable patterns for building at-least-once, fault-tolerant event-processing pipelines with safe message reprocessing. Last reviewed June 2024; authoritative, maintained by AWS.
## License: Not Applicable

# AWS CDK API Reference
## https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html
Comprehensive AWS CDK v2 library reference with constructs for SQS, Lambda, IAM, and more. Includes class/interface definitions in TypeScript, construct composition patterns, and property-level configuration options. Emphasizes infrastructure-as-code best practices for event source mappings, DLQs, retry policies, environment variables, and asset bundling for serverless functions. Last updated May 2024; official AWS documentation.
## License: Apache 2.0

# AWS SDK v3 Middleware Customization
## https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/middleware.html
Developer guide to AWS SDK for JavaScript v3 middleware stack customization. Explains building, ordering, and configuring middleware for retries, timeouts, logging, and custom headers. Shows how to extend client behavior, monitor requests, and handle cross-cutting concerns in SQSClient and other AWS clients. Crucial for fine-grained control over API calls, performance tuning, and observability. Last reviewed March 2024; authoritative source from AWS.
## License: Not Applicable

# Node.js Runtime and Express Framework Documentation
## https://nodejs.org/en/docs/
## https://expressjs.com/en/guide/using-middleware.html
Authoritative guides for Node.js core APIs and Express middleware architecture. Node.js docs cover the event loop, HTTP APIs, ESM modules, and error handling. Express guide details middleware patterns, routing, error-handling best practices, and production readiness including security and performance considerations. Together they inform robust HTTP server implementations for health, metrics, and status endpoints. Last verified March 2024; maintained by Node.js and Express communities.
## License: MIT

# PostgreSQL Connection Pooling with node-postgres
## https://node-postgres.com/features/pooling
Official guide for connection pooling in the `pg` module. Covers Pool configuration (max connections, idle timeouts), client acquisition/release semantics, leak detection, and integration with retry/backoff logic. Includes performance tuning tips and examples for high-throughput applications. Key for building resilient, low-latency database layers in event-driven pipelines. Last reviewed April 2024; maintained by node-postgres authors.
## License: PostgreSQL License

# Zod Schema Validation Library
## https://zod.dev
Definitive documentation for Zod schema definitions in JavaScript and TypeScript. Explores primitives, object and union schemas, refinements, transformations, and error formatting. Demonstrates synchronous/asynchronous parsing, custom validators, and integration patterns for validating incoming payloads in serverless and RESTful contexts. Essential for enforcing input integrity and leveraging TypeScript inference. Last updated May 2024; maintained by Zod maintainers.
## License: MIT

# Testing with Vitest and Supertest
## https://vitest.dev/
## https://github.com/visionmedia/supertest
Comprehensive resources for unit and integration testing in Node.js applications. Vitest docs outline configuration, mocking, snapshot testing, parallel execution, and coverage reporting. Supertest guide provides examples for HTTP server testing, chaining assertions, and handling asynchronous endpoints. Together, they offer a full testing stack for handler logic, CLI tools, and Express endpoints. Last updated June 2024; maintained by respective communities.
## License: MIT