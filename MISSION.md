## Mission Statement

S3 SQS Bridge is an open source bridge between a S3 Kafka‑compatible broker and AWS SQS. This lightweight solution includes:

- A Dockerized Node.js s3ConsumerToSqs that listens to S3 messages and forwards them to an SQS queue.
- A Lambda function that processes S3 messages from SQS.
- A new Lambda function that listens to GitHub event messages from a separate SQS queue and creates projections of GitHub resources, storing them in a PostgresDB table for use by other Lambdas.
- All AWS infrastructure is provisioned using AWS CDK (Java, CDK 2.x).
