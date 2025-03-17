#!/bin/sh
set -e

echo "Starting tansu broker... to be available on ${LISTENER_URL?} and ${ADVERTISED_LISTENER_URL?}"
echo "The Storage engine is ${STORAGE_ENGINE?} and the cluster id is ${CLUSTER_ID?}"
/tansu-server \
  --kafka-listener-url ${LISTENER_URL?} \
  --kafka-advertised-listener-url ${ADVERTISED_LISTENER_URL?} \
  --kafka-cluster-id ${CLUSTER_ID?} \
  --storage-engine ${STORAGE_ENGINE?} &

echo "Waiting for broker to initialize..."
sleep 2

# TODO: Add producer mode which doesn't require a queue URL
# (Action passes in environment variables: PRODUCER_MODE=true, CONSUMER_GROUP, TOPIC_NAME)

echo "Starting consumer... for consumer group ${CONSUMER_GROUP?} on broker ${BROKER_URL?}"
echo "If Topic ${TOPIC_NAME?} doesn't exist, it will be created is ${USE_EXISTING_TOPIC?} !== 'true'."
echo "Messages from topic ${TOPIC_NAME?} will be placed on SQS queue ${SQS_QUEUE_URL?}"
exec npm run tansu-consumer-to-sqs

# TODO: Also run the consumer from a github action for a way of getting projections without the app runner. It could put the projections on s3.
