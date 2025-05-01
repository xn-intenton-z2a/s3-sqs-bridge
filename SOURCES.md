# GitHub API and Webhooks Documentation
## https://docs.github.com/en/rest
## https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads
Combined official documentation of GitHub’s REST API and Webhooks event payloads. Covers authentication workflows (OAuth and tokens), pagination, rate-limiting policies, REST endpoint schemas, and webhook delivery semantics. Provides detailed HTTP request/response examples, JSON schema definitions, retry and error-handling guidance, and security best practices for validating payload signatures. Essential for generating accurate Zod schemas, designing authentication flows, and implementing robust event-driven pipelines. Last verified May 2024; authoritative source maintained by GitHub.
## License: Not Applicable

# AWS SQS and Lambda Integration Documentation
## https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/index.html
## https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
Integrated reference combining the AWS SDK v3 SQS client API and Lambda SQS event source mapping guide. The SQS client docs detail SendMessage, ReceiveMessage, DeleteMessage, batch operations, middleware customization, error classification, and retry modes. The Lambda mapping guide explains batch size configuration, concurrency controls, visibility timeouts, DLQ integration, retry behavior on partial failures, idempotency strategies, and scaling considerations. Together, they provide actionable patterns for building at-least-once, fault-tolerant event-processing pipelines. Last reviewed June 2024; maintained by AWS.
## License: Apache 2.0

# AWS CDK API Reference
## https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html
Comprehensive reference for AWS CDK v2 constructs, focusing on SQS, Lambda, and IAM modules. Details class and interface definitions in TypeScript, construct composition patterns, and property-level configuration options. Emphasizes recommended practices for setting up event source mappings, dead-letter queues, retry policies, environment variables, and bundling strategies for Lambda functions. Crucial for defining and deploying infrastructure-as-code in a repeatable, maintainable way. Last updated May 2024; official AWS CDK documentation.
## License: Apache 2.0

# Node.js & Express Documentation
## https://nodejs.org/en/docs/
## https://expressjs.com/en/starter/installing.html
Authoritative guides for Node.js core APIs and the Express framework. Node.js documentation covers the event loop, HTTP server APIs, ESM module support, environment configuration, and error-handling patterns. Express docs illustrate routing, middleware design, request/response lifecycle, and production server best practices, including health-check and metrics endpoints. Together they inform robust server implementations for diagnostics and RESTful interfaces. Last verified March 2024; maintained by the Node.js and Express communities.
## License: MIT

# PostgreSQL & Node-Postgres Pooling Documentation
## https://node-postgres.com/features/pooling
Official guide for connection pooling with the `pg` module in Node.js. Explains Pool configuration options (max connections, idle timeouts), client acquisition/release semantics, integration with retry/backoff logic, and leak detection. Includes performance tuning tips, resource cleanup best practices, and examples of combining pools with exponential-backoff retries. Essential for building high-throughput, resilient database layers in event-driven handlers. Last reviewed April 2024; maintained by node-postgres authors.
## License: PostgreSQL License

# Zod Validation Library Documentation
## https://zod.dev
Definitive documentation for Zod schema validation in TypeScript and JavaScript. Covers defining primitive, object, union, and refinement schemas; custom transformers; asynchronous parsing; and error formatting. Demonstrates integration patterns for validating incoming event payloads before database operations, strict type inference, and performance considerations. Key for ensuring data integrity in serverless pipelines. Last updated May 2024; maintained by Zod maintainers.
## License: MIT

# Testing Tools Documentation
## https://vitest.dev/
## https://github.com/visionmedia/supertest
Central resource for unit and integration testing frameworks. Vitest documentation describes configuration options, mocking strategies, snapshot testing, parallel execution, and coverage reporting. Supertest docs provide examples for creating HTTP tests against Express servers, chaining assertions, and handling asynchronous endpoints. Together they form a comprehensive toolkit for testing event handlers, CLI commands, and HTTP endpoints. Last updated June 2024; maintained by respective communities.
## License: MIT

# AWS SQS Dead-Letter Queues Best Practices
## https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
Official AWS Developer Guide detailing Dead-Letter Queue (DLQ) configuration for SQS. Explains redrive policies, `maxReceiveCount` settings, DLQ monitoring, metrics integration, and reprocessing workflows. Covers design considerations for preventing message loss, isolating poison messages, and integrating DLQs into fault-tolerant architectures. Provides actionable guidance for ensuring no failed events are lost and for implementing safe reprocessing strategies. Last updated April 2024; maintained by AWS.
## License: Not Applicable