# s3-sqs-bridge (Developer Documentation)

---

## Project Structure

The key components of the project are organized as follows:

```text
.
├── Dockerfile
├── package.json
├── cdk.json
├── pom.xml
├── compose.yml
├── entrypoint.sh
├── src/lib/main.js
├── aws/main/java/com/intention/S3SqsBridge/S3SqsBridgeApp.java
├── aws/main/java/com/intention/S3SqsBridge/S3SqsBridgeStack.java
├── aws/test/java/com/intentïon/S3SqsBridge/S3SqsBridgeStackTest.java
└── tests/unit/main.test.js
```

Additional files include GitHub workflows (for CI/CD and maintenance scripts) and various helper scripts under the `scripts/` directory.

---

## Getting Started

### Prerequisites

- [Node.js v20+](https://nodejs.org/)
- [AWS CLI](https://aws.amazon.com/cli/) (configured with sufficient permissions)
- [Java JDK 11+](https://openjdk.java.net/)
- [Apache Maven](https://maven.apache.org/)
- [AWS CDK 2.x](https://docs.aws.amazon.com/cdk/v2/guide/home.html) (your account should be CDK bootstrapped)
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/)

---

## Local Development Environment

### Clone the Repository

```bash

git clone https://github.com/your-username/s3-sqs-bridge.git
cd s3-sqs-bridge
```

### Install Node.js dependencies and test

```bash

npm install
npm test
```

### Build and test the Java Application

```bash
./mvnw clean package
```

## Setup for AWS CDK

You'll need to have run `cdk bootstrap` to set up the environment for the CDK. This is a one-time setup per AWS account and region.
General administrative permissions are required to run this command. (NPM installed the CDK.)

In this example for user `antony-local-user` and `s3-sqs-bridge-github-actions-role` we would add the following
trust policy so that they can assume the role: `s3-sqs-bridge-deployment-role`:
```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "Statement1",
			"Effect": "Allow",
			"Action": ["sts:AssumeRole", "sts:TagSession"],
			"Resource": ["arn:aws:iam::541134664601:role/s3-sqs-bridge-deployment-role"]
		}
	]
}
```

The `s3-sqs-bridge-github-actions-role` also needs the following trust entity to allow GitHub Actions to assume the role:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::541134664601:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:xn-intenton-z2a/s3-sqs-bridge:*"
                }
            }
        }
    ]
}
```

Create the IAM role with the necessary permissions to assume role from your authenticated user:
```bash

cat <<'EOF' > s3-sqs-bridge-deployment-trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::541134664601:user/antony-local-user",
          "arn:aws:iam::541134664601:role/s3-sqs-bridge-github-actions-role"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
aws iam create-role \
  --role-name s3-sqs-bridge-deployment-role \
  --assume-role-policy-document file://s3-sqs-bridge-deployment-trust-policy.json
```

Add the necessary permissions to deploy `s3-sqs-bridge`:
```bash

cat <<'EOF' > s3-sqs-bridge-deployment-permissions-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "iam:*",
        "s3:*",
        "cloudtrail:*",
        "logs:*",
        "events:*",
        "lambda:*",
        "dynamodb:*",
        "sqs:*",
        "sts:AssumeRole"
      ],
      "Resource": "*"
    }
  ]
}
EOF
aws iam put-role-policy \
  --role-name s3-sqs-bridge-deployment-role \
  --policy-name s3-sqs-bridge-deployment-permissions-policy \
  --policy-document file://s3-sqs-bridge-deployment-permissions-policy.json
```

Assume the deployment role:
```bash

ROLE_ARN="arn:aws:iam::541134664601:role/s3-sqs-bridge-deployment-role"
SESSION_NAME="s3-sqs-bridge-deployment-session-local"
ASSUME_ROLE_OUTPUT=$(aws sts assume-role --role-arn "$ROLE_ARN" --role-session-name "$SESSION_NAME" --output json)
if [ $? -ne 0 ]; then
  echo "Error: Failed to assume role."
  exit 1
fi
export AWS_ACCESS_KEY_ID=$(echo "$ASSUME_ROLE_OUTPUT" | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo "$ASSUME_ROLE_OUTPUT" | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo "$ASSUME_ROLE_OUTPUT" | jq -r '.Credentials.SessionToken')
EXPIRATION=$(echo "$ASSUME_ROLE_OUTPUT" | jq -r '.Credentials.Expiration')
echo "Assumed role successfully. Credentials valid until: $EXPIRATION"
```
Output:
```log
Assumed role successfully. Credentials valid until: 2025-03-25T02:27:18+00:00
```

Check the session:
```bash

aws sts get-caller-identity
```

Output:
```json
{
  "UserId": "AROAX37RDWOM7ZHORNHKD:3-sqs-bridge-deployment-session",
  "Account": "541134664601",
  "Arn": "arn:aws:sts::541134664601:assumed-role/s3-sqs-bridge-deployment-role/3-sqs-bridge-deployment-session"
}
```

Check the permissions of the role:
```bash

aws iam list-role-policies \
  --role-name s3-sqs-bridge-deployment-role
```
Output (the policy we created above):
```json
{
  "PolicyNames": [
    "s3-sqs-bridge-deployment-permissions-policy"
  ]
}
```

An example of the GitHub Actions role being assumed in a GitHub Actions Workflow:
```yaml
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::541134664601:role/s3-sqs-bridge-deployment-role
          aws-region: eu-west-2
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install -g aws-cdk
      - run: aws s3 ls --region eu-west-2
```

## Deployment to AWS

See also:
* local running using [Localstack](LOCALSTACK.md).
* Debugging notes for the AWS deployment here [DEBUGGING](DEBUGGING.md).

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

npx cdk destroy
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

Deploys the AWS infrastructure including an App Runner service, an SQS queue, Lambda functions, and a PostgresSQL table.
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
