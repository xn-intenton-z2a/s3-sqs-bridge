# EXPONENTIAL_BACKOFF

## Overview
This update refines the exponential backoff strategy for database operations by updating the helper function responsible for computing retry delays. Instead of a constant delay, the delay now increases exponentially based on the current retry attempt. This improves resilience, avoids overwhelming the database, and provides clearer pacing for retries.

## Source File Updates (src/lib/main.js)
- Update the computeRetryDelay function to accept an additional parameter for the current attempt number and return baseDelay multiplied by 2^(attempt - 1). For example, for attempt 1 the delay is baseDelay, for attempt 2 it is 2 * baseDelay, and so on.
- In the retryOperation function, modify the call to computeRetryDelay so that the current attempt number is passed. This ensures the computed delay reflects the growing backoff period.
- Update logging in logRetryError to include the attempt number and the new computed delay.

## Test File Updates (tests/unit/main.test.js)
- Add or update unit tests to verify that computeRetryDelay returns increasing delays. For example, with a base delay of 1000, ensure that delays are 1000, 2000, 4000 for attempts 1, 2, and 3 respectively.

## Documentation Updates (README.md and docs/USAGE.md)
- Update the Metrics and Retry Logic sections to include details of the exponential backoff mechanism. Include a brief explanation and example values showing how the delay grows with each retry attempt.

## Benefits
- Prevents overwhelming the database with frequent retries under transient errors.
- Provides a robust mechanism for handling temporary failures by spacing out retry attempts.
- Improves operational visibility by logging the computed delay at each retry stage.