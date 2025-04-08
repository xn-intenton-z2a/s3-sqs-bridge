#!/usr/bin/env node
// src/lib/main.js
// S3 SQS Bridge (v0.2.0) - S3 event sourcing, SQS bridging, Lambda projections.

import dotenv from "dotenv";
import { z } from "zod";
import express from "express";
import { S3Client, ListObjectVersionsCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient, GetItemCommand, ScanCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { LambdaClient, ListEventSourceMappingsCommand, UpdateEventSourceMappingCommand } from "@aws-sdk/client-lambda";

dotenv.config();

if (process.env.VITEST || process.env.NODE_ENV === "development") {
  process.env.BUCKET_NAME = process.env.BUCKET_NAME || "s3-sqs-bridge-bucket-test";
  process.env.OBJECT_PREFIX = process.env.OBJECT_PREFIX || "events/";
  process.env.REPLAY_QUEUE_URL =
    process.env.REPLAY_QUEUE_URL || "http://test/000000000000/s3-sqs-bridge-replay-queue-test";
  process.env.DIGEST_QUEUE_URL =
    process.env.DIGEST_QUEUE_URL || "http://test/000000000000/s3-sqs-bridge-digest-queue-test";
  process.env.OFFSETS_TABLE_NAME = process.env.OFFSETS_TABLE_NAME || "s3-sqs-bridge-offsets-table-test";
  process.env.PROJECTIONS_TABLE_NAME = process.env.PROJECTIONS_TABLE_NAME || "s3-sqs-bridge-projections-table-test";
  process.env.SOURCE_LAMBDA_FUNCTION_NAME =
    process.env.SOURCE_LAMBDA_FUNCTION_NAME || "s3-sqs-bridge-source-lambda-test";
  process.env.AWS_ENDPOINT = process.env.AWS_ENDPOINT || "http://test";
}

const configSchema = z.object({
  BUCKET_NAME: z.string().optional(),
  OBJECT_PREFIX: z.string().optional(),
  REPLAY_QUEUE_URL: z.string().optional(),
  DIGEST_QUEUE_URL: z.string().optional(),
  OFFSETS_TABLE_NAME: z.string().optional(),
  PROJECTIONS_TABLE_NAME: z.string().optional(),
  SOURCE_LAMBDA_FUNCTION_NAME: z.string().optional(),
  AWS_ENDPOINT: z.string().optional(),
});

export const config = configSchema.parse(process.env);

export function logConfig() {
  console.log(
    JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      message: "Configuration loaded",
      config: {
        BUCKET_NAME: config.BUCKET_NAME,
        OBJECT_PREFIX: config.OBJECT_PREFIX,
        REPLAY_QUEUE_URL: config.REPLAY_QUEUE_URL,
        DIGEST_QUEUE_URL: config.DIGEST_QUEUE_URL,
        OFFSETS_TABLE_NAME: config.OFFSETS_TABLE_NAME,
        PROJECTIONS_TABLE_NAME: config.PROJECTIONS_TABLE_NAME,
        SOURCE_LAMBDA_FUNCTION_NAME: config.SOURCE_LAMBDA_FUNCTION_NAME,
        AWS_ENDPOINT: config.AWS_ENDPOINT,
      },
    }),
  );
}
logConfig();

export const s3 = new S3Client({ endpoint: config.AWS_ENDPOINT, forcePathStyle: true });
export const sqs = new SQSClient({ endpoint: config.AWS_ENDPOINT });
export const dynamodb = new DynamoDBClient({ endpoint: config.AWS_ENDPOINT });
export const lambda = new LambdaClient();

// ---------------------------------------------------------------------------------------------------------------------
// AWS Utility functions
// ---------------------------------------------------------------------------------------------------------------------

export async function listAndSortAllObjectVersions() {
  const versions = [];
  const params = {
    Bucket: config.BUCKET_NAME,
    Prefix: config.OBJECT_PREFIX,
  };
  let response;
  do {
    response = await s3.send(new ListObjectVersionsCommand(params));
    if (response.Versions) {
      versions.push(...response.Versions);
      params.KeyMarker = response.NextKeyMarker;
      params.VersionIdMarker = response.NextVersionIdMarker;
    } else {
      logInfo(`No versions found in the response for ${config.BUCKET_NAME}: ${JSON.stringify(response)}`);
      break;
    }
  } while (response.IsTruncated);

  versions.sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified));
  return versions;
}

export async function listAllObjectVersionsOldestFirst() {
  const versions = [];
  const params = {
    Bucket: config.BUCKET_NAME,
    Prefix: config.OBJECT_PREFIX,
  };
  let response;
  do {
    response = await s3.send(new ListObjectVersionsCommand(params));
    if (response.Versions) {
      versions.push(...response.Versions);
      params.KeyMarker = response.NextKeyMarker;
      params.VersionIdMarker = response.NextVersionIdMarker;
    } else {
      logInfo(`No versions found in the response for ${config.BUCKET_NAME}: ${JSON.stringify(response)}`);
      break;
    }
  } while (response.IsTruncated);

  // Group versions by object key.
  const grouped = versions.reduce((acc, version) => {
    const key = version.Key;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(version);
    return acc;
  }, {});

  // For each key, reverse the array so that versions are in upload order (oldest first)
  Object.keys(grouped).forEach((key) => {
    grouped[key] = grouped[key].reverse();
  });

  // Now merge the sorted arrays (each group) into a single list ordered by LastModified.
  // This is a k-way merge.
  const lists = Object.values(grouped); // each is an array sorted oldest-first
  const merged = [];

  while (lists.some((list) => list.length > 0)) {
    // Find the list with the smallest (oldest) head element.
    let minIndex = -1;
    let minVersion = null;
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].length > 0) {
        const candidate = lists[i][0];
        if (!minVersion || new Date(candidate.LastModified) < new Date(minVersion.LastModified)) {
          minVersion = candidate;
          minIndex = i;
        }
      }
    }
    // Remove the smallest head element and push it to the merged list.
    if (minIndex >= 0) {
      merged.push(lists[minIndex].shift());
    }
  }
  return merged;
}

export function buildSQSMessageParams(body, sqsQueueUrl) {
  return {
    QueueUrl: sqsQueueUrl,
    MessageBody: JSON.stringify(body),
  };
}

export async function sendToSqs(body, sqsQueueUrl) {
  const params = buildSQSMessageParams(body, sqsQueueUrl);
  try {
    const result = await retryOperationExponential(async () => await sqs.send(new SendMessageCommand(params)));
    logInfo(`Sent message to SQS queue ${sqsQueueUrl}, MessageId: ${result.MessageId}`);
  } catch (err) {
    logError(`Failed to send message to SQS queue ${sqsQueueUrl}`, err);
    throw err;
  }
}

export async function writeLastOffsetProcessedToOffsetsTable(item) {
  const lastOffsetProcessed = item.lastOffsetProcessed ? { S: item.lastOffsetProcessed } : null;
  const params = {
    TableName: config.OFFSETS_TABLE_NAME,
    Item: {
      id: { S: item.id },
      lastOffsetProcessed,
    },
  };
  await writeToTable(item, params);
  logInfo(
    `Successfully wrote offset ${JSON.stringify(item.lastOffsetProcessed)} to DynamoDB table ${config.OFFSETS_TABLE_NAME}`,
  ); // : ${JSON.stringify(item)}
}

export async function readLastOffsetProcessedFromOffsetsTableById(id) {
  const params = {
    TableName: config.OFFSETS_TABLE_NAME,
    Key: {
      id: { S: id },
    },
    ConsistentRead: true,
  };

  logInfo(`Getting item with id "${id}" from table ${config.OFFSETS_TABLE_NAME}.`);
  const result = await dynamodb.send(new GetItemCommand(params));

  if (!result.Item) {
    throw new Error(`Item with id "${id}" not found in table ${config.OFFSETS_TABLE_NAME}.`);
  } else {
    logInfo(`Got item with id "${id}" from table ${config.OFFSETS_TABLE_NAME}: ${JSON.stringify(result.Item)}.`);
  }

  return result.Item.lastOffsetProcessed === undefined ? undefined : result.Item.lastOffsetProcessed.S;
}

export async function writeValueToProjectionsTable(item) {
  const value = item.value ? { S: item.value } : null;
  const params = {
    TableName: config.PROJECTIONS_TABLE_NAME,
    Item: {
      id: { S: item.id },
      value,
    },
  };
  await writeToTable(item, params);
  logInfo(`Successfully wrote value ${JSON.stringify(item.value)} to DynamoDB table ${config.PROJECTIONS_TABLE_NAME}`); // : ${JSON.stringify(item)}
}

export async function writeToTable(item, params) {
  try {
    await dynamodb.send(new PutItemCommand(params));
  } catch (error) {
    logError(`Error writing offset to DynamoDB table ${params.TableName}`, error);
    throw error;
  }
}

export async function retryOperationExponential(operation, retries = 3, delay = 100) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      if (attempt >= retries) {
        throw err;
      }
      await sleep(delay * Math.pow(2, attempt));
    }
  }
}

export function createS3EventFromVersion({ key, versionId, lastModified }) {
  return {
    Records: [
      {
        eventVersion: "2.0",
        eventSource: "aws:s3",
        eventTime: lastModified,
        eventName: "ObjectCreated:Put",
        s3: {
          s3SchemaVersion: "1.0",
          bucket: {
            name: config.BUCKET_NAME,
            arn: "arn:aws:s3:::" + config.BUCKET_NAME,
          },
          object: {
            key,
            versionId,
          },
        },
      },
    ],
  };
}

export function createSQSEventFromS3Event(s3Event) {
  return {
    Records: [
      {
        eventVersion: "2.0",
        eventSource: "aws:sqs",
        eventTime: s3Event.Records[0].eventTime,
        eventName: "SendMessage",
        body: JSON.stringify(s3Event),
      },
    ],
  };
}

export function streamToString(stream) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    stream.on("data", function (chunk) {
      chunks.push(chunk);
    });
    stream.on("error", function (err) {
      reject(err);
    });
    stream.on("end", function () {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
  });
}

export async function getS3ObjectWithContentAndVersion(s3BucketName, key, versionId) {
  const version = await getS3ObjectVersion(s3BucketName, key, versionId);
  const { objectMetaData, object } = await getS3ObjectWithContent(s3BucketName, key, versionId);
  return { objectMetaData, object, version };
}

export async function getS3ObjectWithContent(s3BucketName, key, versionId) {
  const objectMetaData = await getS3ObjectMetadata(s3BucketName, key, versionId);
  const object = await streamToString(objectMetaData.Body);
  return { objectMetaData, object };
}

export async function getS3ObjectMetadata(s3BucketName, key, versionId) {
  const params = {
    Bucket: s3BucketName,
    Key: key,
    VersionId: versionId,
  };
  const objectMetaData = await s3.send(new GetObjectCommand(params));
  return objectMetaData;
}

export async function getS3ObjectVersion(s3BucketName, key, versionId) {
  const params = {
    Bucket: s3BucketName,
    Key: key,
    VersionId: versionId,
  };
  const objectMetaData = await s3.send(new GetObjectCommand(params));
  return objectMetaData;
}

// Function to scan through all pages in the projections table and return a map:
// { <id>: { id: <id> } } for each projection.
export async function getProjectionIdsMap(ignoreKeys) {
  let lastEvaluatedKey = undefined;
  const idsMap = {};

  // Continue scanning while there are more pages.
  do {
    const params = {
      TableName: config.PROJECTIONS_TABLE_NAME,
      ExclusiveStartKey: lastEvaluatedKey,
      // Use a ProjectionExpression to get only the id attribute.
      ProjectionExpression: "id",
      // Using strong consistency in the read so that we see the most recent write.
      ConsistentRead: true,
    };

    const result = await dynamodb.send(new ScanCommand(params));

    if (result && result.Items) {
      for (const item of result.Items) {
        // If you're using the low-level DynamoDB API, attributes might be in the form { S: 'value' }.
        // Here we assume that a transformation (for example, using DynamoDB DocumentClient) already yields plain values.
        const id = item.id.S;
        if (ignoreKeys && ignoreKeys.includes(id)) {
          continue;
        }
        idsMap[id] = { id };
      }
    }

    lastEvaluatedKey = result === undefined ? undefined : result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return idsMap;
}

export async function enableDisableEventSourceMapping(functionName, enable) {
  const listMappingsCommand = new ListEventSourceMappingsCommand({
    FunctionName: functionName,
  });
  const mappingsResponse = await lambda.send(listMappingsCommand);

  if (!mappingsResponse.EventSourceMappings || mappingsResponse.EventSourceMappings.length === 0) {
    throw new Error(`No event source mappings found for function ${functionName}`);
  }

  const uuid = mappingsResponse.EventSourceMappings[0].UUID;
  if (!uuid) {
    throw new Error("Unable to retrieve UUID from event source mapping.");
  }

  const updateMappingCommand = new UpdateEventSourceMappingCommand({
    UUID: uuid,
    Enabled: enable,
  });
  const updateResponse = await lambda.send(updateMappingCommand);
  logInfo("Event source mapping disabled:", updateResponse);
}

// ---------------------------------------------------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------------------------------------------------

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function logInfo(message) {
  console.log(JSON.stringify({ level: "info", timestamp: new Date().toISOString(), message }));
}

export function logError(message, error) {
  console.error(
    JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      message,
      error: error ? error.toString() : undefined,
    }),
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Replay functions
// ---------------------------------------------------------------------------------------------------------------------

export async function replay() {
  logInfo(`Starting replay job for bucket ${config.BUCKET_NAME} prefix ${config.OBJECT_PREFIX}`);
  await writeLastOffsetProcessedToOffsetsTable({
    id: `${config.BUCKET_NAME}/${config.OBJECT_PREFIX}`,
    lastOffsetProcessed: null,
  });
  await writeLastOffsetProcessedToOffsetsTable({
    id: config.REPLAY_QUEUE_URL,
    lastOffsetProcessed: null,
  });
  const versions = await listAllObjectVersionsOldestFirst();
  logInfo(`Processing ${versions.length} versions...`);
  let lastOffsetProcessed = null;
  let eventsReplayed = 0;
  if (versions.length === 0) {
    logInfo("No versions found to process.");
    lastOffsetProcessed = `${new Date().toISOString()} No versions found to replay`;
    await writeLastOffsetProcessedToOffsetsTable({
      id: config.REPLAY_QUEUE_URL,
      lastOffsetProcessed,
    });
    await writeLastOffsetProcessedToOffsetsTable({
      id: `${config.BUCKET_NAME}/${config.OBJECT_PREFIX}`,
      lastOffsetProcessed,
    });
  } else {
    for (const version of versions) {
      logInfo(`Replaying version: ${JSON.stringify(version)}`);
      const id = version.Key;
      const versionId = version.VersionId;
      const objectMetaData = await getS3ObjectMetadata(config.BUCKET_NAME, id, versionId);
      const lastModified =
        objectMetaData === undefined || objectMetaData.LastModified === undefined
          ? undefined
          : objectMetaData.LastModified.toISOString();
      const versionMetadata = {
        key: id,
        versionId: versionId,
        lastModified,
      };
      logInfo(
        `Creating s3 Put event from versionMetadata: ${JSON.stringify(versionMetadata)} from object metadata LastModified: ${objectMetaData.LastModified}`,
      );
      const s3Event = createS3EventFromVersion(versionMetadata);

      await sendToSqs(s3Event, config.REPLAY_QUEUE_URL);

      lastOffsetProcessed = `${lastModified} ${id} ${versionId}`;
      await writeLastOffsetProcessedToOffsetsTable({
        id: config.REPLAY_QUEUE_URL,
        lastOffsetProcessed,
      });

      eventsReplayed++;
    }
  }
  logInfo("replay job complete.");
  return { versions: versions.length, eventsReplayed, lastOffsetProcessed };
}

// ---------------------------------------------------------------------------------------------------------------------
// Projection functions
// ---------------------------------------------------------------------------------------------------------------------

export async function createProjections(s3Event) {
  logInfo(`Creating projections from: ${JSON.stringify(s3Event)}...`);
  const s3EventRecords = s3Event.Records || [];
  let digest = null;
  for (const s3EventRecord of s3EventRecords) {
    if (s3EventRecord.eventName !== "ObjectCreated:Put") {
      throw new Error(`Unsupported event name: ${s3EventRecord.eventName}`);
    }
    digest = await createProjection(s3EventRecord);
  }
  return digest;
}

export async function createProjection(s3PutEventRecord) {
  const id = s3PutEventRecord.s3.object.key;
  const versionId = s3PutEventRecord.s3.object.versionId;
  const { objectMetaData, object, version } = await getS3ObjectWithContentAndVersion(config.BUCKET_NAME, id, versionId);
  // const object = await s3.send(new GetObjectCommand(params));
  // logInfo(`versionId is: ${JSON.stringify(version.versionId)} for actual object ${object} expected ${versionId}`);
  if (version && !version.IsLatest) {
    logError(`This is not the latest version of the object: ${id} ${versionId}`);
    // TODO: Add the version to the projection and check if we are older than that (rather than the latest as above)
    // TODO: Add a count of the number of versions to the projection.
  } // else {
  await writeValueToProjectionsTable({
    id,
    value: object,
  });
  // }
  const digest = await computeDigest(["digest"]);
  await writeValueToProjectionsTable({
    id: "digest",
    value: JSON.stringify(digest),
  });
  const lastOffsetProcessed = `${objectMetaData.LastModified.toISOString()} ${id} ${versionId}`;
  const bucketLastOffsetProcessed = await readLastOffsetProcessedFromOffsetsTableById(
    `${config.BUCKET_NAME}/${config.OBJECT_PREFIX}`,
  );
  if (lastOffsetProcessed < bucketLastOffsetProcessed) {
    logError(
      `Bucket offset ${bucketLastOffsetProcessed} is already at or ahead of this object's offset at ${lastOffsetProcessed}. Skipping offset update.`,
    );
  } else {
    logInfo(
      `Bucket offset ${bucketLastOffsetProcessed} is being replaced by this object's offset at ${lastOffsetProcessed}.`,
    );
    await writeLastOffsetProcessedToOffsetsTable({
      id: `${config.BUCKET_NAME}/${config.OBJECT_PREFIX}`,
      lastOffsetProcessed,
    });
  }

  return digest;
}

export async function computeDigest(ignoreKeys) {
  const digest = await getProjectionIdsMap(ignoreKeys);
  return digest;
}

// ---------------------------------------------------------------------------------------------------------------------
// SQS Lambda Handlers
// ---------------------------------------------------------------------------------------------------------------------

export async function replayBatchLambdaHandler(event) {
  logInfo(`Replay Batch Lambda received event: ${JSON.stringify(event)}`);
  // await enableDisableEventSourceMapping(config.SOURCE_LAMBDA_FUNCTION_NAME, false);
  const { versions, eventsReplayed, lastOffsetProcessed } = await replay();
  // await enableDisableEventSourceMapping(config.SOURCE_LAMBDA_FUNCTION_NAME, true);
  return { handler: "src/lib/main.replayBatchLambdaHandler", versions, eventsReplayed, lastOffsetProcessed };
}

export async function sourceLambdaHandler(sqsEvent) {
  logInfo(`Source Lambda received event: ${JSON.stringify(sqsEvent)}`);

  // If the latest bucket offset processed is null or behind the latest queue offset processed, error out, replay needed.
  const replayQueueLastOffsetProcessed = await readLastOffsetProcessedFromOffsetsTableById(config.REPLAY_QUEUE_URL);
  const bucketLastOffsetProcessed = await readLastOffsetProcessedFromOffsetsTableById(
    `${config.BUCKET_NAME}/${config.OBJECT_PREFIX}`,
  );
  if (!bucketLastOffsetProcessed || bucketLastOffsetProcessed < replayQueueLastOffsetProcessed) {
    throw new Error(
      `Bucket offset processed ${bucketLastOffsetProcessed} is behind replay queue offset processed ${replayQueueLastOffsetProcessed}. Replay needed.`,
    );
  } else {
    logInfo(
      `Bucket offset processed ${bucketLastOffsetProcessed} is at or ahead of the replay queue offset processed ${replayQueueLastOffsetProcessed}. Ready to read from source.`,
    );
  }

  // If event.Records is an array, use it. Otherwise, treat the event itself as one record.
  const sqsEventRecords = Array.isArray(sqsEvent.Records) ? sqsEvent.Records : [sqsEvent];

  // Array to collect the identifiers of the failed records
  const batchItemFailures = [];

  for (const sqsEventRecord of sqsEventRecords) {
    try {
      const s3Event = JSON.parse(sqsEventRecord.body);
      const digest = await createProjections(s3Event);
      await sendToSqs(digest, config.DIGEST_QUEUE_URL);
      logInfo(`Created source-projection for with digest (and TODO dispatched to SQS): ${JSON.stringify(digest)}`);
    } catch (error) {
      // Log the error and add the record's messageId to the partial batch response
      logError(`Error processing record ${sqsEventRecord.messageId}: ${error.message}`, error);
      batchItemFailures.push({ itemIdentifier: sqsEventRecord.messageId });
    }
  }

  // Return the list of failed messages so that AWS SQS can attempt to reprocess them.
  return {
    batchItemFailures,
    handler: "src/lib/main.sourceLambdaHandler",
  };
}

export async function replayLambdaHandler(sqsEvent) {
  logInfo(`Replay Lambda received event: ${JSON.stringify(sqsEvent)}`);

  // If event.Records is an array, use it.
  // Otherwise, treat the event itself as one record.
  const sqsEventRecords = Array.isArray(sqsEvent.Records) ? sqsEvent.Records : [sqsEvent];

  // Array to collect identifiers for records that failed processing
  const batchItemFailures = [];

  for (const sqsEventRecord of sqsEventRecords) {
    try {
      const s3Event = JSON.parse(sqsEventRecord.body);
      const digest = await createProjections(s3Event);
      // NOTE: Replay does not send the digest via SQS.
      logInfo(`Created replay-projection with digest: ${JSON.stringify(digest)}`);
    } catch (error) {
      // Log the error and add the record's messageId to the partial batch response
      logError(`Error processing record ${sqsEventRecord.messageId}: ${error.message}`, error);
      batchItemFailures.push({ itemIdentifier: sqsEventRecord.messageId });
    }
  }

  return {
    handler: "src/lib/main.replayLambdaHandler",
    batchItemFailures,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Health check server
// ---------------------------------------------------------------------------------------------------------------------

export function healthCheckServer() {
  const app = express();
  app.get("/", (req, res) => res.send("S3 SQS Bridge OK"));
  app.listen(8080, () => logInfo("Healthcheck available at :8080"));
}

// ---------------------------------------------------------------------------------------------------------------------
// Main CLI
// ---------------------------------------------------------------------------------------------------------------------

export async function main(args = process.argv.slice(2)) {
  const exampleS3ObjectVersion = {
    key: "events/1.json",
    versionId: "AZW7UcKuQ.8ZZ5GnL9TaTMnK10xH1DON",
    lastModified: new Date().toISOString(),
  };
  if (args.includes("--help")) {
    console.log(`
      Usage:
      --help                     Show this help message (default)
      --source-projection        Run Lambda handler for events from source
      --replay-projection        Run Lambda handler for events created by replay
      --replay                   Run full bucket replay
      --healthcheck              Run healthcheck server
     Lambda handlers for --source-projection --replay-projection process a put event for the following object:
     ${JSON.stringify(exampleS3ObjectVersion, null, 2)}
    `);
    return;
  }

  if (args.includes("--replay")) {
    await replay();
  } else if (args.includes("--source-projection")) {
    const s3Event = createS3EventFromVersion(exampleS3ObjectVersion);
    const sqsEvent = createSQSEventFromS3Event(s3Event);
    await sourceLambdaHandler(sqsEvent);
  } else if (args.includes("--replay-projection")) {
    const s3Event = createS3EventFromVersion(exampleS3ObjectVersion);
    const sqsEvent = createSQSEventFromS3Event(s3Event);
    await replayLambdaHandler(sqsEvent);
  } else if (args.includes("--healthcheck")) {
    healthCheckServer();
  } else {
    console.log("No command argument supplied.");
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  main().catch((err) => {
    logError("Fatal error in main execution", err);
    process.exit(1);
  });
}
