# s3-sqs-bridge (Versioned Amazon S3 Object Put Event replay capable queuing to SQS)

This repository deploys an AWS CloudFormation Stack to create a replay capable event queue. The solution used AWS SQS
for message delivery and AWS Lambda for real-time processing with AWS DynamoDB for durable offset tracking. Storage
is an S3 bucket with object versioning enabled and a Put event can be processed in read-time or replayed in their
original order.

`s3-sqs-bridge` is built to run in both AWS and local environments (via Docker Compose with MinIO).

This is an offshoot from another project where I began to set up [tansu io](https://github.com/tansu-io/tansu), but S3 was all I needed.

A tangent of interest might be [s3-ootb-broker](S3_OOTB_BROKER.md) which is a messaging system and IRC style chat system.

For instructions on how to set up the project, see the [Setup](SETUP.md) document.

---

## Key Features

- **Storage:** Uses an AWS S3 bucket with versioning enabled to persist events.
- **Event replay:** A replay job replays S3 object versions in chronological order.
- **Real-Time Processing:** Forwards S3 events to an SQS queue.
- **Low Idle Cost:** Designed to run on Fargate Spot with zero desired instances until needed.

---

## License

Distributed under the [MIT License](LICENSE).

---
