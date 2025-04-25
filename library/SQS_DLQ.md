# SQS_DLQ

## Crawl Summary
Redrive Policy: Use redrive policy with a maxReceiveCount parameter (1-1000) and a redrive allow policy (allowAll by default, byQueue for specifying up to 10 ARNs, denyAll to prohibit access). Message Retention: For standard queues, retention uses original enqueue timestamp and DLQ retention should exceed source queue retention; for FIFO queues, the enqueue timestamp resets upon redrive. Configuration Steps: Create a new DLQ; edit source queue settings in the SQS console; toggle DLQ enabled; select queue ARN; set maximum receives; save configuration. CloudWatch Alarms: Monitor DLQ using the ApproximateNumberOfMessagesVisible metric.

## Normalised Extract
Table of Contents:
1. Redrive Policy
2. Message Retention
3. Console Configuration
4. CloudWatch Alarm Setup

1. Redrive Policy:
   - Parameter 'maxReceiveCount': defines the number of message receives before redrive (valid range: 1 to 1000).
   - 'redriveAllowPolicy': default is allowAll, use 'byQueue' to specify up to 10 source queue ARNs, or 'denyAll' to disable DLQ use.

2. Message Retention:
   - Standard Queues: Retention based on original enqueue timestamp; DLQ retention should be set longer than source retention. For example, if a message waits 1 day before redrive and DLQ retention is 4 days, the active retention in DLQ becomes 3 days.
   - FIFO Queues: The enqueue timestamp is reset upon redrive; the retention period applies from the moment of DLQ entry, e.g., 4 days.

3. Console Configuration:
   - Steps:
     a. Create a new queue for DLQ.
     b. Open SQS console at https://console.aws.amazon.com/sqs/.
     c. Select the source queue and click Edit.
     d. Toggle 'Dead-letter queue' section to Enabled.
     e. Select the dead-letter queue ARN from available queues.
     f. Set 'Maximum receives' value (1 to 1000).
     g. Save the settings.

4. CloudWatch Alarm Setup:
   - Monitor using metric 'ApproximateNumberOfMessagesVisible'.
   - Configure alarm to trigger when messages in the DLQ exceed a threshold.
   - Recommended command-line example provided in supplementary details.

## Supplementary Details
Technical Specifications and Implementation Steps:

- Redrive Policy JSON Format:
  { "maxReceiveCount": "3", "deadLetterTargetArn": "arn:aws:sqs:region:account-id:dlq-queueName" }

- API Call: SetQueueAttributes
  - Endpoint: https://sqs.{region}.amazonaws.com/{account-id}/{queueName}
  - Parameter example: 'Attributes' can include 'RedrivePolicy' and 'MessageRetentionPeriod'.
  - Valid MessageRetentionPeriod: 60 to 1209600 seconds (default 345600 seconds or 4 days).

- AWS SDK (Node.js) Code Example:
  const AWS = require('aws-sdk');
  const sqs = new AWS.SQS();
  const params = {
    QueueUrl: 'https://sqs.region.amazonaws.com/account-id/queueName',
    Attributes: {
      'RedrivePolicy': JSON.stringify({
         maxReceiveCount: "3",
         deadLetterTargetArn: "arn:aws:sqs:region:account-id:dlq-queueName"
      }),
      'MessageRetentionPeriod': "345600"
    }
  };
  sqs.setQueueAttributes(params, function(err, data) {
     if (err) {
       console.error("Error", err);
     } else {
       console.log("Success", data);
     }
  });

- Configuration Options:
  - maxReceiveCount: integer, set according to expected retry logic.
  - MessageRetentionPeriod: string representing seconds, ensure DLQ retention > source queue retention.

- Best Practices:
  - Place DLQ and source queue in the same AWS account and region.
  - Set a sufficiently high maxReceiveCount to allow for retry attempts before moving the message.
  - Configure CloudWatch alarms to monitor DLQ for rapid troubleshooting.

- Troubleshooting Procedures:
  1. Examine CloudWatch logs for consumer exceptions.
  2. Verify redrive policy JSON format in queue attributes.
  3. Use AWS CLI to test message visibility changes:
     Command: aws sqs change-message-visibility --queue-url https://sqs.region.amazonaws.com/account-id/queueName --receipt-handle <handle> --visibility-timeout 0
  4. Re-drive messages using the redrive command if applicable.


## Reference Details
API Specifications and SDK Details:

Method: setQueueAttributes
Signature (Node.js AWS SDK):
  SQS.setQueueAttributes(params: {
    QueueUrl: string,
    Attributes: {
      RedrivePolicy?: string,
      MessageRetentionPeriod?: string,
      [key: string]: string
    }
  }, callback?: (err: AWSError, data: {}) => void): Request<{}, AWSError>

Parameters:
  - QueueUrl: string - URL of the SQS queue.
  - Attributes: Object containing key-value pairs of configuration.
    * RedrivePolicy: JSON string with keys:
         maxReceiveCount (string representation of integer between 1 and 1000),
         deadLetterTargetArn (ARN string of the DLQ).
    * MessageRetentionPeriod: string (seconds, range 60 to 1209600).

Return Type:
  - On success: SetQueueAttributesResult object.

Code Example (Node.js):
  const AWS = require('aws-sdk');
  const sqs = new AWS.SQS();
  const params = {
    QueueUrl: 'https://sqs.region.amazonaws.com/account-id/queueName',
    Attributes: {
      'RedrivePolicy': JSON.stringify({
        maxReceiveCount: "3",
        deadLetterTargetArn: "arn:aws:sqs:region:account-id:dlq-queueName"
      }),
      'MessageRetentionPeriod': "345600"
    }
  };
  sqs.setQueueAttributes(params, function(err, data) {
    if (err) {
      console.error('Error', err);
    } else {
      console.log('Success', data);
    }
  });

Additional API Methods:
  - getQueueAttributes
    Signature: SQS.getQueueAttributes(params: { QueueUrl: string, AttributeNames: string[] }, callback?: (err: AWSError, data: GetQueueAttributesResult) => void): Request<GetQueueAttributesResult, AWSError>

Configuration Options and Their Effects:
  - maxReceiveCount: Determines when messages are moved to the DLQ; low value may result in premature redrive.
  - MessageRetentionPeriod: Sets the maximum time a message is retained in the queue; must be adjusted for DLQ vs. source.
  - redriveAllowPolicy: Controls access for source queues to the DLQ (values: allowAll, byQueue, denyAll).

Concrete Best Practices:
  - Always use the same AWS region and account for sourcing the DLQ.
  - Set CloudWatch alarms on the ApproximateNumberOfMessagesVisible metric for proactive monitoring.

Step-by-step Troubleshooting:
  1. Verify queue attribute settings with AWS CLI command:
     aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/account-id/queueName --attribute-names All
  2. Check CloudWatch logs for consumer application errors.
  3. Test message redrive manually by altering message visibility using:
     aws sqs change-message-visibility --queue-url https://sqs.region.amazonaws.com/account-id/queueName --receipt-handle <handle> --visibility-timeout 0
  4. Examine the returned error messages in case of misconfiguration and validate the JSON format of the RedrivePolicy.


## Information Dense Extract
redrivePolicy:{maxReceiveCount:1-1000, redriveAllowPolicy:{default:allowAll, byQueue:up to 10 ARNs, denyAll}, deadLetterTargetArn:ARN}; messageRetention:{standard:based on original enqueue timestamp, FIFO:reset timestamp} ; consoleSteps:{create DLQ, open SQS console, select source queue, toggle DLQ enabled, select ARN, set Maximum receives (1-1000), save} ; API: setQueueAttributes(QueueUrl:string, Attributes:{RedrivePolicy:string, MessageRetentionPeriod:string}) -> Promise; SDK Code: AWS SDK for Node.js example provided; CloudWatchAlarm: metric ApproximateNumberOfMessagesVisible, threshold configuration; CLI troubleshooting: aws sqs change-message-visibility, aws sqs get-queue-attributes; bestPractices: DLQ in same account/region, sufficient maxReceiveCount, CloudWatch monitoring

## Sanitised Extract
Table of Contents:
1. Redrive Policy
2. Message Retention
3. Console Configuration
4. CloudWatch Alarm Setup

1. Redrive Policy:
   - Parameter 'maxReceiveCount': defines the number of message receives before redrive (valid range: 1 to 1000).
   - 'redriveAllowPolicy': default is allowAll, use 'byQueue' to specify up to 10 source queue ARNs, or 'denyAll' to disable DLQ use.

2. Message Retention:
   - Standard Queues: Retention based on original enqueue timestamp; DLQ retention should be set longer than source retention. For example, if a message waits 1 day before redrive and DLQ retention is 4 days, the active retention in DLQ becomes 3 days.
   - FIFO Queues: The enqueue timestamp is reset upon redrive; the retention period applies from the moment of DLQ entry, e.g., 4 days.

3. Console Configuration:
   - Steps:
     a. Create a new queue for DLQ.
     b. Open SQS console at https://console.aws.amazon.com/sqs/.
     c. Select the source queue and click Edit.
     d. Toggle 'Dead-letter queue' section to Enabled.
     e. Select the dead-letter queue ARN from available queues.
     f. Set 'Maximum receives' value (1 to 1000).
     g. Save the settings.

4. CloudWatch Alarm Setup:
   - Monitor using metric 'ApproximateNumberOfMessagesVisible'.
   - Configure alarm to trigger when messages in the DLQ exceed a threshold.
   - Recommended command-line example provided in supplementary details.

## Original Source
AWS SQS Dead Letter Queues Documentation
https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html

## Digest of SQS_DLQ

# Amazon SQS DEAD LETTER QUEUES
Date Retrieved: 2023-10-12

## Redrive Policy Configuration
- Parameter: maxReceiveCount
  - Defines the number of times a consumer can receive a message from the source queue before moving it to the dead-letter queue (valid range: 1 to 1000).
- Redrive Allow Policy
  - Controls which source queues can access the dead-letter queue. Options include:
    - allowAll (default): All source queues are permitted.
    - byQueue: Specify up to 10 source queue ARNs.
    - denyAll: Denies any source queue use.

## Message Retention for Dead-letter Queues
- Standard Queues:
  - The expiration is based on the original enqueue timestamp; retention period of the DLQ should be longer than that of the source queue.
  - Example: If a message spends 1 day in the source queue and the dead-letter queue retention is 4 days, the message is deleted after 3 days in the DLQ.
- FIFO Queues:
  - The enqueue timestamp resets when moved to the DLQ; retention period applies from the time the message enters the DLQ.
  - Example: With a 4-day retention period, the message lives exactly 4 days in the DLQ.

## Console Configuration Steps
1. Create a new queue that will serve as the dead-letter queue (DLQ).
2. Open the Amazon SQS Console at https://console.aws.amazon.com/sqs/.
3. In the navigation pane, select the source queue and choose Edit.
4. Scroll to the Dead-letter queue section and toggle Enabled.
5. Under Dead-letter queue settings, select the ARN of an existing queue to use as DLQ.
6. Set the Maximum receives value (range: 1 to 1000) to determine when messages are moved.
7. Save the configuration.

## CloudWatch Alarm Integration
- Use the ApproximateNumberOfMessagesVisible metric to monitor the DLQ.
- Recommended to configure an alarm for early detection of message failures.
- Reference CloudWatch alarm creation documentation for detailed setup.

## Attribution and Data Size
- Data Size: 1412409 bytes
- Links Found: 4430

## Attribution
- Source: AWS SQS Dead Letter Queues Documentation
- URL: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- License: License: AWS Service Terms
- Crawl Date: 2025-04-25T18:34:13.066Z
- Data Size: 1412409 bytes
- Links Found: 4430

## Retrieved
2025-04-25
