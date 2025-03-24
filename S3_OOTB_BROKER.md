# An Amazon S3 Bucket is a Message Broker.

S3 has some broker like features:
* Always on (paying only for storage when idle) with 99.99% availability (ref. https://aws.amazon.com/s3/faqs/).
* Durable storage with 99.999999999% (11 nines) data durability (ref. https://aws.amazon.com/s3/faqs/).
* High throughput 3,500 PUT requests per second per prefix (ref. https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html).
* 5GB per single PUT request (ref. https://aws.amazon.com/s3/faqs/).
* Unlimited prefixes and an unlimited number of objects (ref. https://aws.amazon.com/s3/faqs/).
* Chronological write order is preserved allow any intermediate state to be reconstructed.
* Built in data retention lifecycle management.
* Operation level access control using IAM policies (e.g. readonly consumers are possible).

(S3 can feel a bit slow but S3 Express One Zone promises "single digit" millisecond latency, ref. https://aws.amazon.com/s3/storage-classes/express-one-zone/).

This is an offshoot from another project where I began to set up Tansu io backed by 3S and switched to use S3 directly (ref. https://github.com/tansu-io/tansu).

---

## Starting with nothing
_(The Bucket does not exist.)_

List a non-existent bucket:
```bash

aws s3 ls s3://s3-ootb-broker
```

## Create broker instance
_(Create an S3 Bucket.)_

Create a bucket:
```bash

aws s3 mb s3://s3-ootb-broker
```

Turn on versioning:
```bash

aws s3api put-bucket-versioning --bucket s3-ootb-broker --versioning-configuration Status=Enabled
```

## Create a topic
_(Create a prefix in an S3 Bucket.)_

Create a pre-fix in S3:
```bash

aws s3api put-object --bucket s3-ootb-broker --key topic/
```

View the prefix in the bucket:
```bash

aws s3 ls s3://s3-ootb-broker/topic/ --summarize
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

echo "{\"id\": \"1\", \"value\": \"001\"}" > id-1.json ; aws s3 cp id-1.json s3://s3-ootb-broker/topic/id-1.json
echo "{\"id\": \"1\", \"value\": \"002\"}" > id-1.json ; aws s3 cp id-1.json s3://s3-ootb-broker/topic/id-1.json
echo "{\"id\": \"2\", \"value\": \"001\"}" > id-2.json ; aws s3 cp id-2.json s3://s3-ootb-broker/topic/id-2.json
```

View the prefix in the bucket:
```bash

aws s3 ls s3://s3-ootb-broker/topic/ --summarize
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
  --bucket s3-ootb-broker \
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

aws s3 cp s3://s3-ootb-broker/topic/id-1.json copy-of-id-1.json
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
    --bucket s3-ootb-broker \
    --prefix topic/id-1.json \
    --query 'reverse(Versions[].VersionId)' \
    --output text | tr ' ' '\n'); do 
      aws s3api get-object \
        --bucket s3-ootb-broker \
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
    --bucket s3-ootb-broker \
    --prefix topic/ \
    --query "sort_by(Versions[?LastModified > \`${last_modified?}\`], &LastModified)" \
    --output json)
  echo "$new_versions" | jq -c '.[]' | while read -r item; do
    key=$(echo "${item?}" | jq -r '.Key')
    version=$(echo "${item?}" | jq -r '.VersionId')
    last_modified=$(echo "${item?}" | jq -r '.LastModified')
    aws s3api get-object --bucket s3-ootb-broker \
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
    aws s3 cp "id-${id?}.json" s3://s3-ootb-broker/topic/"id-${id?}.json"
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
```bash
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
    aws s3 cp "id-${id?}.json" s3://s3-ootb-broker/topic/"id-${id?}.json"
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

## Build a chat client in 50 lines of Bash
It is possible to build a chat client in 50 lines of Bash using S3 as a message broker. The script below uses 
the AWS CLI to publish and poll messages from an S3 bucket. It allows multiple users to chat in real-time by 
writing messages to the S3 bucket and reading them back.

Save this script as `s3-chat.sh`, make it executable and run it.
```bash

#!/bin/bash
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
BUCKET="s3-ootb-broker"
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
                # Extract fields and display in a friendly format.
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

## Decommission the broker

Delete all versions of all objects then delete the bucket:
```bash

aws s3api list-object-versions --bucket s3-ootb-broker --output json | \
  jq -r '.Versions[] | "aws s3api delete-object --bucket s3-ootb-broker --key \(.Key) --version-id \(.VersionId)"' | bash
aws s3api list-object-versions --bucket s3-ootb-broker --output json | \
  jq -r '.DeleteMarkers[] | "aws s3api delete-object --bucket s3-ootb-broker --key \(.Key) --version-id \(.VersionId)"' | bash
aws s3 rb s3://s3-ootb-broker
```

Final check to list a non-existent bucket again:
```bash

aws s3 ls s3://s3-ootb-broker
```

Output:
```log
An error occurred (NoSuchBucket) when calling the ListObjectsV2 operation: The specified bucket does not exist
```
