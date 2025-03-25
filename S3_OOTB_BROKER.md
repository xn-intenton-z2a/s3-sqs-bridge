# An Amazon S3 Bucket is a Message Broker.
(And an IRC style is a chat client.)

S3 has some broker like features:
* Always on (paying only for storage when idle) with 99.99% availability (ref. https://aws.amazon.com/s3/faqs/).
* Durable storage with 99.999999999% (11 nines) data durability (ref. https://aws.amazon.com/s3/faqs/).
* High throughput 3,500 PUT requests per second per prefix (ref. https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html).
* 5GB per single PUT request (ref. https://aws.amazon.com/s3/faqs/).
* Unlimited prefixes and an unlimited number of objects (ref. https://aws.amazon.com/s3/faqs/).
* Chronological write order is preserved for objects by key (and by second precision between objects in Standard Buckets).
* Built in object level data retention lifecycle management.
* Operation level access control using IAM policies (e.g. readonly consumers of a single prefix are possible).

S3 can feel a bit slow but S3 Express One Zone promises "single digit" millisecond latency, (ref. https://aws.amazon.com/s3/storage-classes/express-one-zone/).

This is an offshoot from another project where I began to set up [tansu io](https://github.com/tansu-io/tansu), a Kakfa replacement with 3S storage, but S3 was all I needed.

---

# Live Demo

## Starting with nothing
_(The Bucket does not exist.)_

List a non-existent bucket:
```bash

aws s3 ls s3://your-s3-ootb-broker-bucket
```

Expected output, if the bucket exists, but you don't have full access chose a different bucket name:
```log
An error occurred (NoSuchBucket) when calling the ListObjectsV2 operation: The specified bucket does not exist
```

## Create broker instance
_(Create an S3 Bucket.)_

Create a bucket:
```bash

aws s3 mb s3://your-s3-ootb-broker-bucket
```

Turn on versioning:
```bash

aws s3api put-bucket-versioning --bucket your-s3-ootb-broker-bucket --versioning-configuration Status=Enabled
```

## Create a topic
_(Create a prefix in an S3 Bucket.)_

Create a prefix in S3:
```bash

aws s3api put-object --bucket your-s3-ootb-broker-bucket --key topic/
```

View the prefix in the bucket:
```bash

aws s3 ls s3://your-s3-ootb-broker-bucket/topic/ --summarize
```

Output:
```log
2025-03-24 15:45:15          0 

Total Objects: 1
   Total Size: 0
```

## Publish messages to a topic
_(Copy files to the S3 prefix.)_

Copy 2 versions of message with key "id-1.json" to the topic amd 1 version of "id-2.json":
```bash

echo "{\"id\": \"1\", \"value\": \"001\"}" > id-1.json ; aws s3 cp id-1.json s3://your-s3-ootb-broker-bucket/topic/id-1.json
echo "{\"id\": \"1\", \"value\": \"002\"}" > id-1.json ; aws s3 cp id-1.json s3://your-s3-ootb-broker-bucket/topic/id-1.json
echo "{\"id\": \"2\", \"value\": \"001\"}" > id-2.json ; aws s3 cp id-2.json s3://your-s3-ootb-broker-bucket/topic/id-2.json
```

View the prefix in the bucket:
```bash

aws s3 ls s3://your-s3-ootb-broker-bucket/topic/ --summarize
```

Output:
```log
2025-03-24 15:45:15          0 
2025-03-24 15:48:07         28 id-1.json
2025-03-24 15:48:08         28 id-2.json

Total Objects: 3
   Total Size: 56
```

## View the messages by on the topic
_(List the objects in S3.)_

List the versions of all s3 objects:
```bash

aws s3api list-object-versions \
  --bucket your-s3-ootb-broker-bucket \
  --prefix topic/ \
  | jq -r '.Versions[] | "\(.LastModified) \(.Key) \(.VersionId) \(.IsLatest)"' \
  | head -50 \
  | tail -r > versions.txt
echo "\nLastModified              Key             VersionId                        IsLatest" ; cat versions.txt
```

Output:
```log
LastModified              Key             VersionId                        IsLatest
2025-03-24T16:42:08+00:00 topic/id-2.json .a4RW_WNEFeEHQdsczKFAJIWGUiCpWIM true
2025-03-24T16:42:07+00:00 topic/id-1.json Ae3Y9BaiYKtM_fIRH5.8xl3rzSLPaJVb false
2025-03-24T16:42:07+00:00 topic/id-1.json RHELrp0M4XaQu8nf4rYdAIIU5Ab6eSXc true
2025-03-24T16:41:58+00:00 topic/ 679rlVdv8mvoChefTxHTwLm4tNq9X6bR true
```

## Read the latest state of a message by key
_(Copy an object to the local filesystem.)_

Copy the latest version of the object "id-1.json" to the local filesystem:
```bash

aws s3 cp s3://your-s3-ootb-broker-bucket/topic/id-1.json copy-of-id-1.json
cat copy-of-id-1.json
```

Output:
```log
{"id": "1", "value": "002"}
```

## Consume all the states of a message by key
_(Copy all versions of an object to the local filesystem.)_

Copy the all the versions of the object "id-1.json" to the local filesystem:
```bash

for version in $(aws s3api list-object-versions \
    --bucket your-s3-ootb-broker-bucket \
    --prefix topic/id-1.json \
    --query 'reverse(Versions[].VersionId)' \
    --output text | tr ' ' '\n'); do 
      aws s3api get-object \
        --bucket your-s3-ootb-broker-bucket \
        --key topic/id-1.json \
        --version-id "$version" \
        ./id-tmp.json > /dev/null \
        && cat ./id-tmp.json \
        && rm ./id-tmp.json; 
done
```

Output:
```log
{"id": "1", "value": "002"}
{"id": "1", "value": "001"}
```

## Consume and begin polling for new messages
_(List all versions under the S3 prefix, remember the last item processed, and poll)_

Poll for messages showing new versions as they arrive:
```bash

last_modified_file="./last_modified.txt"
if [ ! -f "${last_modified_file?}" ]; then
  echo "1970-01-01T00:00:00Z" > "${last_modified_file?}"
fi
while true; do
  last_modified=$(cat "$last_modified_file")
  new_versions=$(aws s3api list-object-versions \
    --bucket your-s3-ootb-broker-bucket \
    --prefix topic/ \
    --query "sort_by(Versions[?LastModified > \`${last_modified?}\`], &LastModified)" \
    --output json)
  echo "$new_versions" | jq -c '.[]' | while read -r item; do
    key=$(echo "${item?}" | jq -r '.Key')
    version=$(echo "${item?}" | jq -r '.VersionId')
    last_modified=$(echo "${item?}" | jq -r '.LastModified')
    aws s3api get-object --bucket your-s3-ootb-broker-bucket \
      --key "${key?}" \
      --version-id "${version?}" \
      ./id-tmp.json > /dev/null && \
      cat ./id-tmp.json && \
      rm ./id-tmp.json
    echo "${last_modified?}" > "${last_modified_file?}"
  done
  sleep 1
done
```

In another terminal, or another country, write to S3 (2 keys, 2 times each, interleaved):
```bash

for value in $(seq 3 4); do
  for id in $(seq 1 2); do
    echo "{\"id\": \"${id?}\", \"value\": \"$(printf "%03d" "${value?}")\"}" > "id-${id?}.json"
    aws s3 cp "id-${id?}.json" s3://your-s3-ootb-broker-bucket/topic/"id-${id?}.json"
  done
done
```

Output, first the current state of the topic, then the new messages:
```log
{"id": "1", "value": "001"}
{"id": "1", "value": "002"}
{"id": "2", "value": "001"}
{"id": "1", "value": "003"}
{"id": "2", "value": "003"}
{"id": "1", "value": "004"}
{"id": "2", "value": "004"}

```

Crash out of the script with Ctrl-C:
```log
^CTraceback (most recent call last):
  File "/usr/local/bin/aws", line 19, in <module>
    import awscli.clidriver
  File "/usr/local/Cellar/awscli/2.24.24/libexec/lib/python3.12/site-packages/awscli/__init__.py", line 20, in <module>
    import importlib.abc
  File "<frozen importlib._bootstrap>", line 1360, in _find_and_load
  File "<frozen importlib._bootstrap>", line 1331, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 946, in _load_unlocked
KeyboardInterrupt
```

## Resume consumption from the previous offset
_(Read the last offset from a text file)_

Re-run the previous Poll for messages script and see :
```bash
(As above.)
```

In another terminal write to S3 (2 keys, 2 times each, interleaved, using ids 3 and 4):
```bash

for value in $(seq 3 4); do
  for id in $(seq 3 4); do
    echo "{\"id\": \"${id?}\", \"value\": \"$(printf "%03d" "${value?}")\"}" > "id-${id?}.json"
    aws s3 cp "id-${id?}.json" s3://your-s3-ootb-broker-bucket/topic/"id-${id?}.json"
  done
done
```

Output shows only the new messages:
```log
{"id": "3", "value": "003"}
{"id": "4", "value": "003"}
{"id": "3", "value": "004"}
{"id": "4", "value": "004"}
```

Tail the offset file:
```bash

tail -f last_modified.txt
```

Output updates one per polling interval:
```log
2025-03-24T18:06:05+00:00
2025-03-24T18:07:25+00:00
```

## Build a chat client
The script below uses the AWS CLI to publish and poll messages from an S3 bucket. It allows multiple users to chat in
real-time by writing messages to the S3 bucket and reading them back.

Create a chat prefix in S3:
```bash

aws s3api put-object --bucket your-s3-ootb-broker-bucket --key chat/
```

Save the script below as `./scripts/s3-chat.sh`, make it executable and run it.
e.g.
```bash

S3CHAT_USER='User-Left' ./scripts/s3-chat.sh
```
e.g.
```bash

S3CHAT_USER='User-Right' ./scripts/s3-chat.sh
```
The S3 Chat Bash script:
```bash

echo 'S3 Chat: An interactive chat session using Amazon S3 as a message broker.'
echo 'Setup:'
echo '1. Create an S3 bucket (if not already created):  aws s3 mb s3://your-chat-bucket'
echo '2. Enable versioning on the bucket:               aws s3api put-bucket-versioning --bucket your-chat-bucket --versioning-configuration Status=Enabled'
echo '3. Create a chat topic (prefix):                  aws s3api put-object --bucket your-chat-bucket --key chat/'
echo 'Usage:'
echo '1. Set BUCKET below to your S3 bucket name.'
echo '2. Optionally set the environment variable S3CHAT_USER to your preferred username (default is the output of whoami).'
echo '3. Run this script in as many bash terminals as you like.'
echo '4. Type your message at the prompt and press Enter. All participants will see every published message.'
echo '5. Type /exit to quit.'
BUCKET="your-s3-ootb-broker-bucket"
TOPIC="chat"
LAST_MODIFIED_FILE="/tmp/s3chat_last_modified_$$.txt"
if [ ! -f "$LAST_MODIFIED_FILE" ]; then
    echo "1970-01-01T00:00:00Z" > "$LAST_MODIFIED_FILE"
fi
publish_message() {
    local msg="$1"
    local user="${S3CHAT_USER:-$(whoami)}"
    local timestamp
    timestamp=$(date -Iseconds)
    local filename="msg-$(date +%s%N).json"
    echo "{\"user\": \"${user}\", \"message\": \"${msg}\", \"timestamp\": \"${timestamp}\"}" > "$filename"
    aws s3 cp "$filename" "s3://${BUCKET}/${TOPIC}/${filename}" > /dev/null 2>&1
    rm "$filename"
}
poll_messages() {
    while true; do
        last_modified=$(cat "$LAST_MODIFIED_FILE")
        new_msgs=$(aws s3api list-object-versions --bucket "$BUCKET" --prefix "${TOPIC}/" \
          --query "sort_by(Versions[?LastModified > \`${last_modified}\`], &LastModified)" --output json)
        echo "$new_msgs" | jq -c '.[]' | while read -r item; do
            key=$(echo "$item" | jq -r '.Key')
            version=$(echo "$item" | jq -r '.VersionId')
            msg_timestamp=$(echo "$item" | jq -r '.LastModified')
            aws s3api get-object --bucket "$BUCKET" --key "$key" --version-id "$version" /tmp/s3chat_msg.json > /dev/null 2>&1
            if [ -s /tmp/s3chat_msg.json ]; then
                user_field=$(jq -r '.user' /tmp/s3chat_msg.json)
                message_field=$(jq -r '.message' /tmp/s3chat_msg.json)
                timestamp_field=$(jq -r '.timestamp' /tmp/s3chat_msg.json)
                echo -e "\n[${timestamp_field}] ${user_field}: ${message_field}"
            fi
            echo "$msg_timestamp" > "$LAST_MODIFIED_FILE"
            rm -f /tmp/s3chat_msg.json
        done
        sleep 1
    done
}
poll_messages &
POLL_PID=$!
trap "kill $POLL_PID; exit" SIGINT SIGTERM
echo "Welcome to S3 Chat! Type your message and press Enter. Type /exit to quit."
while true; do
    read -r -p "> " user_input
    if [ "$user_input" = "/exit" ]; then
        kill $POLL_PID
        exit 0
    fi
    publish_message "$user_input"
done
```
(The S3 Chat source code is from ChatGPT o30-mini-high, it is above my bash skill level.)

Chat session from User-Left (timestamped messages include messages echoing to self, originating text has no timestamp):
```log
Welcome to S3 Chat! Type your message and press Enter. Type /exit to quit.
> Hello from right
> 
[2025-03-24T22:22:12+00:00] User-Right: Hello from right

[2025-03-24T22:22:27+00:00] User-Left: Hello from left
```

Chat session from User-Right:
```log
Welcome to S3 Chat! Type your message and press Enter. Type /exit to quit.
> 
[2025-03-24T22:22:12+00:00] User-Right: Hello from right
Hello from left 
> 
[2025-03-24T22:22:27+00:00] User-Left: Hello from left
```

Open it up to the world:
Below is a set of AWS CLI commands that will disable the public access blocks and then apply a bucket policy to allow 
public read and write (anonymous) access. *Be aware:* This makes your bucket publicly writable and readable by anyone on
the internet and can be a significant security risk.
```bash

aws s3api put-public-access-block \
  --bucket s3-public-chat-bucket-32db9bc3-d7e0-4871-85ed-5003e3a963a5 \
  --public-access-block-configuration '{
  "BlockPublicAcls": false,
  "IgnorePublicAcls": false,
  "BlockPublicPolicy": false,
  "RestrictPublicBuckets": false
}'
aws s3api put-bucket-policy \
  --bucket s3-public-chat-bucket-32db9bc3-d7e0-4871-85ed-5003e3a963a5 \
  --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicReadWrite",
      "Effect": "Allow",
      "Principal": "*",
      "Action": [
         "s3:GetObject",
         "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::s3-public-chat-bucket-32db9bc3-d7e0-4871-85ed-5003e3a963a5/*"
    }
  ]
}'
```

## Decommission the broker

Delete all versions of all objects then delete the bucket:
```bash

aws s3api list-object-versions --bucket your-s3-ootb-broker-bucket --output json | \
  jq -r '.Versions[] | "aws s3api delete-object --bucket your-s3-ootb-broker-bucket --key \(.Key) --version-id \(.VersionId)"' | bash
aws s3api list-object-versions --bucket your-s3-ootb-broker-bucket --output json | \
  jq -r '.DeleteMarkers[] | "aws s3api delete-object --bucket your-s3-ootb-broker-bucket --key \(.Key) --version-id \(.VersionId)"' | bash
aws s3 rb s3://your-s3-ootb-broker-bucket
```

Final check to list a non-existent bucket again:
```bash

aws s3 ls s3://your-s3-ootb-broker-bucket
```

Output:
```log
An error occurred (NoSuchBucket) when calling the ListObjectsV2 operation: The specified bucket does not exist
```

---

# Users

If following the steps in the (README.md)[README.md] then the following script will assume a role and export the credentials

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

```bash

unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN
unset EXPIRATION
```


---

# Portability

Shell scripts have only run on my MacBook Pro with the AWS CLI v2.24.24 and jq v1.7.1. The scripts are not portable to other platforms or versions of the AWS CLI.
```bash

uname -a
```
```log
Darwin MacBook-Pro.local 24.3.0 Darwin Kernel Version 24.3.0: Thu Jan  2 20:22:00 PST 2025; root:xnu-11215.81.4~3/RELEASE_X86_64 x86_64
```

---

# License

Distributed under the [MIT License](LICENSE).
