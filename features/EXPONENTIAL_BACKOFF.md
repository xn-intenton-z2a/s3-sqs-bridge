# EXPONENTIAL_BACKOFF Feature Specification

## Overview
This feature enhances the retry mechanism for database operations by implementing exponential backoff. Instead of using a constant delay between retry attempts, the delay will grow exponentially with each retry. This improves service resilience against transient failures and avoids flooding the database with rapid retries.

## Implementation Details
- Modify the helper function computeRetryDelay in the source file (src/lib/main.js) to accept an additional parameter for the current attempt number. The new implementation will return baseDelay multiplied by 2^(attempt - 1).
- Update retryOperation to pass the current attempt number when computing the retry delay.
- Update logging to include details of the computed delay for each retry attempt.

## Source File Updates (src/lib/main.js)
- Change the definition of computeRetryDelay from:
  function computeRetryDelay(baseDelay) { return baseDelay; }
  to:
  function computeRetryDelay(baseDelay, attempt) { return baseDelay * Math.pow(2, attempt - 1); }

- In retryOperation, update the call to computeRetryDelay by including the current retry attempt number.

## Test File Updates (tests/unit/main.test.js)
- Add tests to verify that computeRetryDelay returns the correct exponential delays for various attempt numbers. For example, for a baseDelay of 1000, the delay should be 1000 for attempt 1, 2000 for attempt 2, and 4000 for attempt 3.
- Ensure that when a transient error is simulated, the retry mechanism uses increasing delays leading to eventual success or proper error reporting.

## README File Updates
- Update the Metrics and Retry Logic section to document that exponential backoff now governs retry delays. Include a brief explanation and an example of how delay increases with consecutive retry attempts.

## Benefits
- Reduces the load on the database during transient failure episodes.
- Improves overall application resilience by spacing out retry attempts more effectively.
- Provides clearer operational insights with logged delay intervals for troubleshooting.
