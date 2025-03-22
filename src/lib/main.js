#!/usr/bin/env node
// src/lib/main.js
// S3 SQS Bridge (v0.2.0) - S3 event sourcing, SQS bridging, Lambda projections.

import dotenv from 'dotenv';
import { z } from 'zod';
import express from 'express';
import { S3Client, ListObjectVersionsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

dotenv.config();

if (process.env.VITEST || process.env.NODE_ENV === "development") {
  process.env.BUCKET_NAME = process.env.BUCKET_NAME || " s3-sqs-bridge-bucket-test";
  process.env.OBJECT_PREFIX = process.env.OBJECT_PREFIX || "events/";
  process.env.REPLAY_QUEUE_URL = process.env.REPLAY_QUEUE_URL || "http://test/000000000000/s3-sqs-bridge-replay-queue-test";
  process.env.OFFSETS_TABLE_NAME = process.env.OFFSETS_TABLE_NAME || "s3-sqs-bridge-offsets-table-test";
  process.env.PROJECTIONS_TABLE_NAME = process.env.PROJECTIONS_TABLE_NAME || "s3-sqs-bridge-projections-table-test";
  process.env.AWS_ENDPOINT = process.env.AWS_ENDPOINT || "http://test";
}

const configSchema = z.object({
  BUCKET_NAME: z.string().optional(),
  OBJECT_PREFIX: z.string().optional(),
  REPLAY_QUEUE_URL: z.string().optional(),
  OFFSETS_TABLE_NAME: z.string().optional(),
  PROJECTIONS_TABLE_NAME: z.string().optional(),
  AWS_ENDPOINT: z.string().optional()
});

const config = configSchema.parse(process.env);

function logConfig() {
  console.log(JSON.stringify({
    level: "info",
    timestamp: new Date().toISOString(),
    message: "Configuration loaded",
    config: {
      BUCKET_NAME: config.BUCKET_NAME,
      OBJECT_PREFIX: config.OBJECT_PREFIX,
      REPLAY_QUEUE_URL: config.REPLAY_QUEUE_URL,
      OFFSETS_TABLE_NAME: config.OFFSETS_TABLE_NAME,
      PROJECTIONS_TABLE_NAME: config.PROJECTIONS_TABLE_NAME,
      AWS_ENDPOINT: config.AWS_ENDPOINT
    }
  }));
}
logConfig();

const s3 = new S3Client({ endpoint: config.AWS_ENDPOINT, forcePathStyle: true });
const sqs = new SQSClient({ endpoint: config.AWS_ENDPOINT });
const dynamoClient = new DynamoDBClient({ endpoint: config.AWS_ENDPOINT });

// ---------------------------------------------------------------------------------------------------------------------
// AWS Utility functions
// ---------------------------------------------------------------------------------------------------------------------

export async function listAndSortAllObjectVersions() {
  let versions = [];
  let params = {
    Bucket: config.BUCKET_NAME,
    Prefix: config.OBJECT_PREFIX
  };
  let response;
  do {
    response = await s3.send(new ListObjectVersionsCommand(params));
    if(response.Versions) {
      versions.push(...response.Versions);
      params.KeyMarker = response.NextKeyMarker;
      params.VersionIdMarker = response.NextVersionIdMarker;
    }else {
      logInfo(`No versions found in the response for ${config.BUCKET_NAME}: ${JSON.stringify(response)}`);
      break;
    }
  } while (response.IsTruncated);

  versions.sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified));
  return versions;
}

export async function listAllObjectVersionsOldestFirst() {
  let versions = [];
  let params = {
    Bucket: config.BUCKET_NAME,
    Prefix: config.OBJECT_PREFIX
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
  Object.keys(grouped).forEach(key => {
    grouped[key] = grouped[key].reverse();
  });

  // Now merge the sorted arrays (each group) into a single list ordered by LastModified.
  // This is a k-way merge.
  const lists = Object.values(grouped); // each is an array sorted oldest-first
  const merged = [];

  while (lists.some(list => list.length > 0)) {
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

export function buildSQSMessageParams(event) {
  return {
    QueueUrl: config.REPLAY_QUEUE_URL,
    MessageBody: JSON.stringify(event)
  };
}

export async function sendEventToSqs(event) {
  const params = buildSQSMessageParams(event);
  try {
    const result = await retryOperationExponential(async () =>
        await sqs.send(new SendMessageCommand(params))
    );
    logInfo(`Sent message to SQS queue ${config.REPLAY_QUEUE_URL}, MessageId: ${result.MessageId}`);
  } catch (err) {
    logError(`Failed to send message to SQS queue ${config.REPLAY_QUEUE_URL}`, err);
    throw err;
  }
}

export async function writeToOffsetsTable(item) {
  const lastOffsetProcessed = item.lastOffsetProcessed ? { S: item.lastOffsetProcessed } : null;
  const params = {
    TableName: config.OFFSETS_TABLE_NAME,
    Item: {
      id: { S: item.id },
      lastModified: { S: item.lastModified.toString() },
      lastOffsetProcessed
    }
  };
  await writeToTable(item, params);
}

export async function writeToProjectionsTable(item) {
  const value = item.value ? { S: item.value } : null;
  const params = {
    TableName: config.PROJECTIONS_TABLE_NAME,
    Item: {
      id: { S: item.id },
      lastModified: { S: item.lastModified.toString() },
      value
    }
  };
  await writeToTable(item, params);
}

export async function writeToTable(item, params) {
  try {
    await dynamoClient.send(new PutItemCommand(params));
    logInfo(`Successfully written offset to DynamoDB ${config.OFFSETS_TABLE_NAME}`); // : ${JSON.stringify(item)}
  } catch (error) {
    logError("Error writing offset to DynamoDB", error);
    // Rethrow the error or handle it as needed
    throw error;
  }
}

export function parseMessageBody(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
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

export function createS3EventFromVersion({key, versionId, lastModified}) {
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
            arn: "arn:aws:s3:::" + config.BUCKET_NAME
          },
          object: {
            key,
            versionId
          }
        }
      }
    ]
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
        body: JSON.stringify(s3Event)
      }
    ]
  };
}

function streamToString(stream) {
  return new Promise(function(resolve, reject) {
    const chunks = [];
    stream.on("data", function(chunk) {
      chunks.push(chunk);
    });
    stream.on("error", function(err) {
      reject(err);
    });
    stream.on("end", function() {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
  });
}

function getObjectContent(params, s3) {
  return s3.send(new GetObjectCommand(params))
    .then(function(object) {
      return streamToString(object.Body);
    });
}

// ---------------------------------------------------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------------------------------------------------

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function logInfo(message) {
  console.log(JSON.stringify({ level: "info", timestamp: new Date().toISOString(), message }));
}

function logError(message, error) {
  console.error(JSON.stringify({ level: "error", timestamp: new Date().toISOString(), message, error: error ? error.toString() : undefined }));
}

// ---------------------------------------------------------------------------------------------------------------------
// Replay functions
// ---------------------------------------------------------------------------------------------------------------------

export async function replay() {
  logInfo(`Starting replay job for bucket ${config.BUCKET_NAME} prefix ${config.OBJECT_PREFIX}`);
  const versions = await listAllObjectVersionsOldestFirst();
  logInfo(`Processing ${versions.length} versions...`);
  const latestVersion = versions[versions.length - 1];
  const now = new Date().toISOString();
  let lastOffsetProcessed = null;
  if (latestVersion) {
    lastOffsetProcessed = `${latestVersion.Key} ${latestVersion.LastModified} ${latestVersion.VersionId}`;
  }
  await writeToOffsetsTable({
    id: `${config.BUCKET_NAME}/${config.OBJECT_PREFIX}`,
    lastModified: now,
    lastOffsetProcessed
  });
  let eventsReplayed = 0;
  for (const version of versions) {
    const s3Event = createS3EventFromVersion({key: version.Key, versionId: version.VersionId, lastModified: version.LastModified});

    await sendEventToSqs(s3Event);

    await writeToOffsetsTable({
      id: config.REPLAY_QUEUE_URL,
      lastModified: now,
      lastOffsetProcessed: `${version.Key} ${version.LastModified} ${version.VersionId}`
    });

    eventsReplayed++;
  }
  logInfo('replay job complete.');
  return { versions: versions.length, eventsReplayed, lastOffsetProcessed };
}

// ---------------------------------------------------------------------------------------------------------------------
// Projection functions
// ---------------------------------------------------------------------------------------------------------------------

export async function createProjections(s3Event) {
  logInfo(`Creating projections from: ${JSON.stringify(s3Event, null, 2)}...`);
  const s3EventRecords = s3Event.Records || [];
  for (const s3EventRecord of s3EventRecords) {
    if (s3EventRecord.eventName === 'ObjectCreated:Put') {
      await createProjection(s3EventRecord)
    } else {
      logError(`Unsupported event name: ${s3EventRecord.eventName}`);
    }
  }
}

export async function createProjection(s3PutEventRecord) {
  if (s3PutEventRecord.eventName === 'ObjectCreated:Put') {
    const id = s3PutEventRecord.s3.object.key;
    const now = new Date().toISOString();
    const params = {
      Bucket: config.BUCKET_NAME,
      Key: id,
      VersionId: s3PutEventRecord.s3.object.versionId
    }
    const object = await getObjectContent(params, s3);
    //const object = await s3.send(new GetObjectCommand(params));
    //logInfo(`Version body is: ${JSON.stringify(object.Body)}...`);
    await writeToProjectionsTable({
      id,
      lastModified: now,
      value: object.Body //JSON.stringify(object.Body)
    });
    await writeToOffsetsTable({
      id: `${config.BUCKET_NAME}/${config.OBJECT_PREFIX}`,
      lastModified: now,
      lastOffsetProcessed: `${object.Key} ${object.LastModified} ${object.VersionId}`
    });
  } else {
    logError(`Unsupported event name: ${s3PutEventRecord.eventName}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Health check server
// ---------------------------------------------------------------------------------------------------------------------

function healthCheckServer() {
  const app = express();
  app.get('/', (req, res) => res.send('S3 SQS Bridge OK'));
  app.listen(8080, () => logInfo('Healthcheck available at :8080'));
}

// ---------------------------------------------------------------------------------------------------------------------
// SQS Lambda Handlers
// ---------------------------------------------------------------------------------------------------------------------

export async function replayBatchLambdaHandler(event) {
  logInfo(`Replay Batch Lambda received event: ${JSON.stringify(event, null, 2)}`);
  const { versions, eventsReplayed, lastOffsetProcessed } = await replay();
  return { handler: "src/lib/main.replayBatchLambdaHandler", versions, eventsReplayed, lastOffsetProcessed };
}

export async function sourceLambdaHandler(sqsEvent) {
  logInfo(`Source Lambda received event: ${JSON.stringify(sqsEvent, null, 2)}`);

  // If event.Records is an array, use it.
  // Otherwise, treat the event itself as one record.
  const sqsEventRecords = Array.isArray(sqsEvent.Records) ? sqsEvent.Records : [sqsEvent];

  for (const sqsEventRecord of sqsEventRecords) {
    const s3Event = parseMessageBody(sqsEventRecord.body);
    await createProjections(s3Event);
    logInfo(`Created source-projection.`);
  }

  // TODO: When we have gathered a sample of events, compute the digests.

  // TODO: Send the digest via SQS to decide if we should schedule an action.

  return { handler: "src/lib/main.sourceLambdaHandler" };
}

export async function replayLambdaHandler(sqsEvent) {
  logInfo(`Replay Lambda received event: ${JSON.stringify(sqsEvent, null, 2)}`);

  // If event.Records is an array, use it.
  // Otherwise, treat the event itself as one record.
  const sqsEventRecords = Array.isArray(sqsEvent.Records) ? sqsEvent.Records : [sqsEvent];

  for (const sqsEventRecord of sqsEventRecords) {
    const s3Event = parseMessageBody(sqsEventRecord.body);
    await createProjections(s3Event);
    logInfo(`Created replay-projection.`);
  }
  return { handler: "src/lib/main.replayLambdaHandler" };
}

// ---------------------------------------------------------------------------------------------------------------------
// Main CLI
// ---------------------------------------------------------------------------------------------------------------------

export async function main(args = process.argv.slice(2)) {
  const exampleS3ObjectVersion = {
    key: 'events/1.json',
    versionId: 'AZW7UcKuQ.8ZZ5GnL9TaTMnK10xH1DON',
    lastModified: new Date().toISOString()
  }
  if (args.includes('--help')) {
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

  if (args.includes('--replay')) {
    await replay();
  } else if (args.includes('--source-projection')) {
    const s3Event = createS3EventFromVersion(exampleS3ObjectVersion);
    const sqsEvent = createSQSEventFromS3Event(s3Event);
    await sourceLambdaHandler(sqsEvent);
  } else if (args.includes('--replay-projection')) {
    const s3Event = createS3EventFromVersion(exampleS3ObjectVersion);
    const sqsEvent = createSQSEventFromS3Event(s3Event);
    await replayLambdaHandler(sqsEvent);
  } else if (args.includes('--healthcheck')) {
    healthCheckServer();
  } else {
    console.log('No command argument supplied.');
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  main().catch((err) => {
    logError('Fatal error in main execution', err);
    process.exit(1);
  });
}

