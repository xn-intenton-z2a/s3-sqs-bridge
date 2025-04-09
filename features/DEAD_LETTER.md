# DEAD_LETTER

This feature introduces a dead letter handling mechanism to capture GitHub event records that fail processing even after retry attempts. Instead of simply logging and discarding these failed records, the handler will forward them to a dedicated Dead Letter Queue (DLQ) for further investigation and possible reprocessing.

## Environment Configuration

- Add a new environment variable `GITHUB_DEAD_LETTER_QUEUE_URL` with a default value (e.g. `https://test/000000000000/github-event-dlq-test`).
- The new configuration should be documented in the README and any deployment scripts.

## Implementation Details

1. **Integration with AWS SQS SDK:**
   - Leverage the already included `@aws-sdk/client-sqs` package to send messages to the DLQ.
   
2. **Error Handling in githubEventProjectionHandler:**
   - When a record fails processing even after the maximum number of retry attempts (for instance, failing the PostgreSQL query), catch the error at the record level.
   - Instead of stopping the entire processing, package the failed event along with diagnostic information (error messages, timestamp, repository details) and send it to the DLQ using the SQS client.
   
3. **Logging and Metrics:**
   - Log occurrences of DLQ forwarding so operators can monitor the health and potential issues in processing.
   - Optionally, update metrics for failed events that can integrate with monitoring solutions.

## Testing and Documentation

- **Unit Tests:** Add tests to simulate a permanent failure and ensure the event is forwarded to the DLQ.
- **Integration Tests:** Verify that when actual failures occur, the messages are sent to the queue defined by `GITHUB_DEAD_LETTER_QUEUE_URL`.
- **Documentation:** Update the README, the CONTRIBUTING guide and deployment scripts to include instructions on configuring and monitoring the DLQ.

This feature enhances the resilience of the GitHub event processing pipeline by ensuring that no fatal processing error results in data loss, thereby aligning with the repository’s focus on robust error handling and operational reliability.
