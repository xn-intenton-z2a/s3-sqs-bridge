# GitHub API and Webhooks Documentation
## https://docs.github.com/en/rest
## https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads
Combined official documentation of GitHub’s REST API and Webhooks event payloads. Covers authentication workflows (OAuth and token-based), endpoint schemas, pagination, rate limiting, and webhook signature validation. Includes detailed HTTP request/response examples, JSON schema definitions, error-handling strategies with retries, and event payload structures for designing reliable projection pipelines. Essential for generating Zod schemas, implementing authentication flows, and validating event-driven integrations. Last verified May 2024; authoritative, maintained by GitHub.
## License: Not Applicable

# AWS Lambda and SQS Integration Best Practices
## https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/middleware.html
## https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/index.html
## https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
## https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
Consolidated guidance on using AWS SDK v3 with SQS and designing resilient Lambda functions for event-driven architectures. Details SQS client patterns (SendMessage, ReceiveMessage, batch operations), middleware stack customization for logging, retries, and observability, and Lambda event source mapping with optimal batch size, visibility timeouts, and dead-letter queue redrive policies. Includes general Lambda best practices: function lifecycle, concurrency management, timeout and memory tuning, environment variable handling, and error-handling strategies. This combined resource provides actionable patterns for building fault-tolerant, cost-effective, and maintainable serverless pipelines. Last reviewed June 2024; official AWS documentation.
## License: Not Applicable

# AWS CDK API Reference
## https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html
Comprehensive AWS CDK v2 library reference with constructs for SQS, Lambda, IAM, and more. Includes class/interface definitions in TypeScript, construct composition patterns, and property-level configuration options. Emphasizes infrastructure-as-code best practices for event source mappings, DLQs, retry policies, environment variables, and asset bundling for serverless functions. Last updated May 2024; official AWS documentation.
## License: Apache 2.0

# Node.js and Express Framework Documentation
## https://nodejs.org/en/docs/
## https://expressjs.com/en/guide/using-middleware.html
Authoritative guides for Node.js core APIs (including ESM modules, event loop, HTTP server, process signals, and graceful shutdown patterns) and Express middleware architecture. Node.js docs detail application lifecycle and error-handling patterns; Express guide covers middleware composition, routing, security, and performance strategies. Essential for building reliable HTTP servers for health, metrics, and status endpoints in serverless and containerized environments. Last verified March 2024; maintained by Node.js and Express communities.
## License: MIT

# PostgreSQL Connection Pooling with node-postgres
## https://node-postgres.com/features/pooling
Official guide for connection pooling in the `pg` module. Covers Pool configuration (max connections, idle timeouts), client acquisition/release semantics, leak detection, and integration with retry/backoff logic. Includes performance tuning tips and examples for high-throughput applications. Key for building resilient, low-latency database layers in event-driven pipelines. Last reviewed April 2024; maintained by node-postgres authors.
## License: PostgreSQL License

# Zod Schema Validation Library
## https://zod.dev
Definitive documentation for Zod schema definitions in JavaScript and TypeScript. Explores primitives, object and union schemas, refinements, transformations, and error-formatting. Demonstrates synchronous/asynchronous parsing, custom validators, and integration patterns for validating incoming payloads in serverless and RESTful contexts. Essential for enforcing input integrity and leveraging TypeScript inference in projection handlers. Last updated May 2024; maintained by Zod maintainers.
## License: MIT

# Testing with Vitest and Supertest
## https://vitest.dev/
## https://github.com/visionmedia/supertest
Comprehensive resources for unit and integration testing in Node.js applications. Vitest docs outline configuration, mocking, snapshot testing, parallel execution, and coverage reporting. Supertest guide provides examples for HTTP server testing, chaining assertions, and handling asynchronous endpoints. Together, they offer a full testing stack for handler logic, CLI tools, and Express endpoints. Last updated June 2024; maintained by respective communities.
## License: MIT

# AWS X-Ray SDK for Node.js
## https://docs.aws.amazon.com/xray/latest/devguide/aws-xray-sdk-nodejs.html
Detailed documentation for instrumenting Node.js applications using AWS X-Ray. Covers setup for capturing request tracing in AWS Lambda and Express, SQS SDK instrumentation, and context propagation across asynchronous calls. Describes advanced sampling rules, subsegment creation, annotations, and error tracing. Provides code examples for capturing performance data in event-driven architectures—essential for diagnosing latency, failures, and optimizing system observability. Last verified April 2024; authoritative, maintained by AWS.
## License: Not Applicable