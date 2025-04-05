# s3-sqs-bridge

`s3-sqs-bridge` S3 SQS Bridge for integrating Kafka and AWS SQS/Lambda/Postgres projections.

## Mission Statement

S3 SQS Bridge is an open source bridge between a S3 Kafka‑compatible broker and AWS SQS. This lightweight solution includes:

- A Dockerized Node.js s3ConsumerToSqs that listens to S3 messages and forwards them to an SQS queue.
- A Lambda function that processes S3 messages from SQS.
- A new Lambda function that listens to GitHub event messages from a separate SQS queue and creates projections of GitHub resources, storing them in a PostgresDB table for use by other Lambdas.
- All AWS infrastructure is provisioned using AWS CDK (Java, CDK 2.x).

## Guidelines

- **Code Quality:**  
  Write modern, maintainable JavaScript using Node 20 and ESM. Consider edge cases when handling container lifecycle events.

- **Testing:**  
  Robust testing is essential—please add unit and integration tests for all new features.

- **Commit Messages:**  
  Use clear, descriptive commit messages that summarize your changes effectively.

- **Collaboration:**  
  Engage actively in GitHub discussions, issues, and PR reviews. Your feedback helps us continually refine s3-sqs-bridge.

## Agentic contribution house choice options (programmatically parsed): START

## Issue House Choice Options

generic activities:
- Create, vary or extend a feature in the source file as you can inline with the Mission Statement if it's useful to do so. Update the Change Log in README.md (or say what was checked).
- Create, vary or extend a test in the test file if it's useful to do so. Update the Change Log in README.md (or say what was checked).
- Update the source file by applying the Mission Statement to prune any "drift" from the source file. Update the Change Log in README.md (or say what was checked).
- Ensure the source is consistently styled and arranged in a way that makes it easy to follow the flow of execution. Update the Change Log in README.md (or say what was checked).

undocumented chores:
- Refresh the README, consulting the guidance in CONTRIBUTING.md while retaining any relevant content and pruning irrelevant content.
- Create detailed examples in the README showing how the features would be deployed and used.
- Dry run the code and ensure both; any primary flows and likely exception paths are tested.
- Ensure the test coverage is consistent and the tests organised with tests for similar areas grouped together.

## Agentic contribution house choice options (programmatically parsed): END

unused repository specific activities:
- Create, vary or extend as many library functions as you can that deliver the spirit of this CONTRIBUTING.md Update the Change Log in README.md (or say what was checked).

unused generic activities:
- Find anything that might be a "simulated" or "demo" implementation and switch to a real implementation. Update the Change Log in README.md (or say what was checked).
- Consider alternate code paths that could be explicitly handled to improve the range of supported behaviours. Update the Change Log in README.md (or say what was checked).
- Look for code that could be simplified using a library and introduce that library. Update the Change Log in README.md (or say what was checked).

unused undocumented chores:
- Look for any duplicated code that could be usefully abstracted out to become shared code and implement that abstraction.
- Dry-run any examples in comments or the README against the current code and if they are not accurate or if they could cover more features, update the docs or code to be accurate.
- Ensure the main function so that it generates some demo output without an over the wire call, and hint a CLI switch that will do the real call.

### Deploying the AWS Infrastructure

From the `cdk/` directory:

```bash
cd cdk
mvn clean package
cdk deploy
```

This deploys the SQS queue, Lambda functions, PostgresDB table, and App Runner service.

## Contributing

We welcome contributions! Please review our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute effectively.

## License

Released under the MIT License (see [LICENSE](./LICENSE)).
