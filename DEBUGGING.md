# s3-sqs-bridge (Debugging on AWS)

An expanded version of the Deployment to AWS with additional utility commands and debugging steps.

---

## Deployment to AWS

### Clone the Repository

```bash

git clone https://github.com/your-username/s3-sqs-bridge.git
cd s3-sqs-bridge
```

### Install Node.js Dependencies and test

```bash

npm install
npm test
```

Package the CDK, deploy the CDK stack which rebuilds the Docker image, and deploy the AWS infrastructure:
```bash

./mvnw clean package
```

Maven build output:
```log
...truncated...
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] 
[INFO] --- maven-jar-plugin:2.4:jar (default-jar) @ s3-sqs-bridge ---
[INFO] Building jar: /Users/antony/projects/s3-sqs-bridge/target/s3-sqs-bridge-0.0.1.jar
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  13.743 s
[INFO] Finished at: 2025-03-18T22:19:37Z
[INFO] ------------------------------------------------------------------------
Unexpected error in background thread "software.amazon.jsii.JsiiRuntime.ErrorStreamSink": java.lang.NullPointerException: Cannot read field "stderr" because "consoleOutput" is null
```
(Yes... the last line, the error "is a bug in the CDK, but it doesn't affect the deployment", according to Copilot.)

Destroy a previous stack and delete related log groups:
```bash

npx cdk 
```
(The commands go in separately because the CDK can be interactive.)
```bash

aws logs delete-log-group \
  --log-group-name "/aws/s3/s3-sqs-bridge-bucket"
aws logs delete-log-group \
  --log-group-name "/aws/lambda/s3-sqs-bridge-replay-batch-function"
aws logs delete-log-group \
  --log-group-name "/aws/lambda/s3-sqs-bridge-replay-function"
aws logs delete-log-group \
  --log-group-name "/aws/lambda/s3-sqs-bridge-source-function"
```

Deploys the AWS infrastructure including an App Runner service, an SQS queue, Lambda functions, and a PostgreSQL table.
```bash

npx cdk deploy
```

Example output:
```log
...truncated...
S3SqsBridgeStack: success: Published f23b4641b15bfe521c575e572ebe41ca2c4613e3e1ea8a9c8ef816c73832cddf:current_account-current_region
S3SqsBridgeStack: deploying... [1/1]
S3SqsBridgeStack: creating CloudFormation changeset...

 ✅  S3SqsBridgeStack

✨  Deployment time: 105.48s

Outputs:
S3SqsBridgeStack.BucketArn = arn:aws:s3:::s3-sqs-bridge-bucket
S3SqsBridgeStack.OffsetsTableArn = arn:aws:dynamodb:eu-west-2:541134664601:table/offsets
S3SqsBridgeStack.OneOffJobLambdaArn = arn:aws:lambda:eu-west-2:541134664601:function:replayBatchLambdaHandler
S3SqsBridgeStack.ReplayQueueUrl = https://sqs.eu-west-2.amazonaws.com/541134664601/s3-sqs-bridge-replay-queue
...truncated...
S3SqsBridgeStack.s3BucketName = s3-sqs-bridge-bucket (Source: CDK context.)
S3SqsBridgeStack.s3ObjectPrefix = events/ (Source: CDK context.)
S3SqsBridgeStack.s3RetainBucket = false (Source: CDK context.)
S3SqsBridgeStack.s3UseExistingBucket = false (Source: CDK context.)
Stack ARN:
arn:aws:cloudformation:eu-west-2:541134664601:stack/S3SqsBridgeStack/30cf37a0-0504-11f0-b142-06193d47b789

✨  Total time: 118.12s

```

Write to S3 (2 keys, 2 times each, interleaved):
```bash

aws s3 ls s3-sqs-bridge-bucket/events/
for value in $(seq 1 2); do
  for id in $(seq 1 2); do
    echo "{\"id\": \"${id?}\", \"value\": \"$(printf "%010d" "${value?}")\"}" > "${id?}.json"
    aws s3 cp "${id?}.json" s3://s3-sqs-bridge-bucket/events/"${id?}.json"
  done
done
aws s3 ls s3-sqs-bridge-bucket/events/
```

Output:
```
upload: ./1.json to s3://s3-sqs-bridge-bucket/events/1.json    
upload: ./1.json to s3://s3-sqs-bridge-bucket/events/1.json   
...
upload: ./2.json to s3://s3-sqs-bridge-bucket/events/2.json   
2025-03-19 23:47:07         31 1.json
2025-03-19 23:52:12         31 2.json
```

List the versions of all s3 objects:
```bash

aws s3api list-object-versions \
  --bucket s3-sqs-bridge-bucket \
  --prefix events/ \
  | jq -r '.Versions[] | "\(.LastModified) \(.Key) \(.VersionId) \(.IsLatest)"' \
  | head -5 \
  | tail -r
```

Output (note grouping by key, requiring a merge by LastModified to get the Put Event order):
```log
2025-03-23T02:37:10+00:00 events/2.json NGxS.PCWdSlxMPVIRreb_ra_WsTjc4L5 false
2025-03-23T02:37:12+00:00 events/2.json 7SDSiqco1dgFGKZmRk8bjSoyi5eD5ZLW true
2025-03-23T02:37:09+00:00 events/1.json cxY1weJ62JNq4DvqrgfvIWKJEYDQinly false
2025-03-23T02:37:11+00:00 events/1.json wHEhP8RdXTD8JUsrrUlMfSANzm7ahDlv true
```

Check the projections table:
```bash

aws dynamodb scan \
  --table-name s3-sqs-bridge-projections-table \
  --output json \
  | jq --compact-output '.Items[] | with_entries(if (.value | has("S")) then .value = .value.S else . end)' \
  | tail --lines=5
```

Output:
```json lines
{"id":"events/1.json","value":"{\"id\": \"1\", \"value\": \"0000000002\"}\n"}
{"id":"events/2.json","value":"{\"id\": \"2\", \"value\": \"0000000002\"}\n"}
```

Count the attributes on the digest queue:
```bash

aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-2.amazonaws.com/541134664601/s3-sqs-bridge-digest-queue \
  --attribute-names ApproximateNumberOfMessages
```

Output:
```json
{
  "Attributes": {
    "ApproximateNumberOfMessages": "4"
  }
}
```

---

## Debugging

List the versions of one s3 object:
```bash

aws s3api list-object-versions \
  --bucket s3-sqs-bridge-bucket \
  --prefix events/1.json \
  | jq -r '.Versions[] | "\(.LastModified) \(.VersionId)"' \
  | head -5 \
  | tail -r
```
      
output:
```log
2025-03-20T19:41:00+00:00 2noSga6Gzo8Tgv_LRN6KhDyfxItokdhV
2025-03-20T19:41:01+00:00 IVvCthHy3USr7htaRW_Px12gLmDUMDci
2025-03-20T19:41:01+00:00 YI1qVe4r1jlQJU7K7.KUrQhuXa_N7Gzc
2025-03-20T19:41:02+00:00 alzPWnOMUMOmpM5St8EvnDAZ4jR3L5WM
2025-03-20T19:41:03+00:00 krC5yOc7ESrGCo2KQn.V_5FuT6WK7m_U
```

Examine a couple of the versions (copy in the versions returned above):
```bash

aws s3api get-object --bucket s3-sqs-bridge-bucket --key events/1.json --version-id "2noSga6Gzo8Tgv_LRN6KhDyfxItokdhV" latest-minus-004.1.json
aws s3api get-object --bucket s3-sqs-bridge-bucket --key events/1.json --version-id "IVvCthHy3USr7htaRW_Px12gLmDUMDci" latest-minus-003.1.json
aws s3api get-object --bucket s3-sqs-bridge-bucket --key events/1.json --version-id "YI1qVe4r1jlQJU7K7.KUrQhuXa_N7Gzc" latest-minus-002.1.json
aws s3api get-object --bucket s3-sqs-bridge-bucket --key events/1.json --version-id "alzPWnOMUMOmpM5St8EvnDAZ4jR3L5WM" latest-minus-001.1.json
aws s3api get-object --bucket s3-sqs-bridge-bucket --key events/1.json --version-id "krC5yOc7ESrGCo2KQn.V_5FuT6WK7m_U" latest-minus-000.1.json
```

Check the S3 versions return order against the file contents:
```bash

find . -maxdepth 1 -name "latest-minus-*.1.json" -exec sh -c 'for f do printf "%s: " "$f"; cat "$f"; done' _ {} + | sort -r
```

Output in the correct order:
```log
./latest-minus-004.1.json: {"id": "1", "value": "0000000001"}
./latest-minus-003.1.json: {"id": "1", "value": "0000000002"}
./latest-minus-002.1.json: {"id": "1", "value": "0000000003"}
./latest-minus-001.1.json: {"id": "1", "value": "0000000004"}
./latest-minus-000.1.json: {"id": "1", "value": "0000000005"}
```

Check the latest version matches the latest file:
```bash

aws s3api get-object --bucket s3-sqs-bridge-bucket --key events/1.json --version-id "krC5yOc7ESrGCo2KQn.V_5FuT6WK7m_U" latest.1.json
cat latest-minus-000.1.json
cat latest.1.json
diff latest.1.json latest-minus-000.1.json
```

Empty the S3 bucket of events and versions:
```bash

aws s3api delete-objects \
  --bucket s3-sqs-bridge-bucket \
  --delete file://<(aws s3api list-object-versions --bucket s3-sqs-bridge-bucket --prefix events/ --query "{Objects: [Versions,DeleteMarkers][][] | [].{Key: Key,VersionId: VersionId}}" --output json)
```

Write to S3 (2 keys, 2 times each, interleaved):
```bash

aws s3 ls s3-sqs-bridge-bucket/events/
for value in $(seq 1 2); do
  for id in $(seq 1 2); do
    echo "{\"id\": \"${id?}\", \"value\": \"$(printf "%010d" "${value?}")\"}" > "${id?}.json"
    aws s3 cp "${id?}.json" s3://s3-sqs-bridge-bucket/events/"${id?}.json"
  done
done
aws s3 ls s3-sqs-bridge-bucket/events/
```

output:
```log
upload: ./1.json to s3://s3-sqs-bridge-bucket/events/1.json       
upload: ./2.json to s3://s3-sqs-bridge-bucket/events/2.json      
upload: ./1.json to s3://s3-sqs-bridge-bucket/events/1.json       
upload: ./2.json to s3://s3-sqs-bridge-bucket/events/2.json       
~/projects/s3-sqs-bridge % aws s3 ls s3-sqs-bridge-bucket/events/
2025-03-23 02:37:11         35 1.json
2025-03-23 02:37:12         35 2.json
```

List the versions of all s3 objects:
```bash

aws s3api list-object-versions \
  --bucket s3-sqs-bridge-bucket \
  --prefix events/ \
  | jq -r '.Versions[] | "\(.LastModified) \(.Key) \(.VersionId) \(.IsLatest)"' \
  | head -5 \
  | tail -r
```

Output (note grouping by key, requiring a merge by LastModified to get the Put Event order):
```log
2025-03-23T02:37:10+00:00 events/2.json NGxS.PCWdSlxMPVIRreb_ra_WsTjc4L5 false
2025-03-23T02:37:12+00:00 events/2.json 7SDSiqco1dgFGKZmRk8bjSoyi5eD5ZLW true
2025-03-23T02:37:09+00:00 events/1.json cxY1weJ62JNq4DvqrgfvIWKJEYDQinly false
2025-03-23T02:37:11+00:00 events/1.json wHEhP8RdXTD8JUsrrUlMfSANzm7ahDlv true
```

Count the attributes on the replay queue:
```bash

aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-2.amazonaws.com/541134664601/s3-sqs-bridge-replay-queue \
  --attribute-names ApproximateNumberOfMessages
```

Output:
```json
{
    "Attributes": {
        "ApproximateNumberOfMessages": "0"
    }
}
```

Stop the replay queue from triggering the replay lambda then send a batch of messages:
```bash

aws lambda update-event-source-mapping \
  --uuid $(aws lambda list-event-source-mappings --function-name s3-sqs-bridge-replay-function | jq '.EventSourceMappings[0].UUID' --raw-output) \
  --no-enabled
```

Send and event to run the replayBatch Lambda function:
```bash

aws lambda invoke --function-name s3-sqs-bridge-replay-batch-function \
  --payload '{}' response.json \
  ; cat response.json
```

Output:
```json lines
{
    "StatusCode": 200,
    "ExecutedVersion": "$LATEST"
}
{
    "handler": "src/lib/main.replayBatchLambdaHandler",
    "versions": 243,
    "eventsReplayed": 243,
    "lastOffsetProcessed": "2025-03-20T00:07:59.000Z"
}
```

Count the attributes on the replay queue after then replay lob has finished:
```bash

aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-2.amazonaws.com/541134664601/s3-sqs-bridge-replay-queue \
  --attribute-names ApproximateNumberOfMessages
```

Output:
```json
{
    "Attributes": {
        "ApproximateNumberOfMessages": "243"
    }
}
```

Start the replay queue and let it drain:
```bash

aws lambda update-event-source-mapping \
  --uuid $(aws lambda list-event-source-mappings --function-name s3-sqs-bridge-replay-function | jq '.EventSourceMappings[0].UUID' --raw-output) \
  --enabled
```

Count the attributes on the replay while the replay lambda is running:
```bash

aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-2.amazonaws.com/541134664601/s3-sqs-bridge-replay-queue \
  --attribute-names ApproximateNumberOfMessages
```

Output:
```json lines
{
  "Attributes": {
    "ApproximateNumberOfMessages": "233"
  }
}
{
  "Attributes": {
    "ApproximateNumberOfMessages": "0"
  }
}
```

Check the projections table:
```bash

aws dynamodb scan \
  --table-name s3-sqs-bridge-projections-table \
  --output json \
  | jq --compact-output '.Items[] | with_entries(if (.value | has("S")) then .value = .value.S else . end)' \
  | tail --lines=5
```

Output:
```json lines
{"id":"events/1.json"}
{"id":"events/1.json"}
{"id":"events/2.json"}
{"id":"events/1.json"}
{"id":"events/2.json"}
```

Count the attributes on the digest queue:
```bash

aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-2.amazonaws.com/541134664601/s3-sqs-bridge-digest-queue \
  --attribute-names ApproximateNumberOfMessages
```

Output (there should be double the digest messages from the replay plus the source):
```json
{
  "Attributes": {
    "ApproximateNumberOfMessages": "486"
  }
}
```

Run replay projection job:
```bash

BUCKET_NAME='s3-sqs-bridge-bucket' \
OBJECT_PREFIX='events/' \
OFFSETS_TABLE_NAME=s3-sqs-bridge-offsets-table \
PROJECTIONS_TABLE_NAME=s3-sqs-bridge-projections-table \
npm run replay-projection
```

### Handy Commands

Handy cleanup, Docker:
```bash

docker system prune --all --force --volumes
```

Handy cleanup, CDK:
```bash

rm -rf cdk.out
```

Handy cleanup, Node:
```bash

rm -rf node_modules ; rm -rf package-lock.json ; npm install
```

Example S3 Put event `s3-put-test-key.json`:
```json
{
  "Records": [
    {
      "eventVersion": "2.0",
      "eventSource": "aws:s3",
      "awsRegion": "eu-west-2",
      "eventTime": "2025-03-19T20:54:43.516Z",
      "eventName": "ObjectCreated:Put",
      "s3": {
        "s3SchemaVersion": "1.0",
        "bucket": {
          "name": "s3-sqs-bridge-bucket",
          "arn": "arn:aws:s3:::s3-sqs-bridge-bucket"
        },
        "object": {
          "key": "assets/test-key.json",
          "sequencer": "0A1B2C3D4E5F678901"
        }
      }
    }
  ]
}
```

Write with as many processes as possible for 1s to s3:
```bash

count=0; end=$(($(date +%s) + 1)); \
while [ $(date +%s) -lt $end ]; do \
  uuid=$(uuidgen); \
  echo "{\"id\":\"$uuid\"}" > "$uuid.json"; \
  aws s3 cp "$uuid.json" s3://s3-sqs-bridge-bucket/"$uuid.json" >/dev/null 2>&1 & \
  count=$((count+1)); \
done; \
wait; \
echo "Processes created: $count"; \
aws s3 ls s3://s3-sqs-bridge-bucket/ | tail -n 5
```

Delete log groups:
```bash

aws logs delete-log-group \
  --log-group-name "/aws/s3/s3-sqs-bridge-bucket"
aws logs delete-log-group \
  --log-group-name "/aws/lambda/s3-sqs-bridge-replay-batch-function"
aws logs delete-log-group \
  --log-group-name "/aws/lambda/s3-sqs-bridge-replay-function"
aws logs delete-log-group \
  --log-group-name "/aws/lambda/s3-sqs-bridge-source-function"
```

Handy cleanup, CDK:
```bash

rm -rf cdk.out
```

---

## License

Distributed under the [MIT License](LICENSE).

---
