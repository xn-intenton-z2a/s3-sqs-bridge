#!/usr/bin/env node
// src/lib/main.js
// S3 SQS Bridge (v0.2.0) - S3 event sourcing, SQS bridging, Lambda projections.

import dotenv from 'dotenv';
import { z } from 'zod';
import express from 'express';
import { S3Client, ListObjectVersionsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

dotenv.config();

if (process.env.VITEST || process.env.NODE_ENV === "development") {
  process.env.BUCKET_NAME = process.env.BUCKET_NAME || " s3-sqs-bridge-bucket-test";
  process.env.OBJECT_PREFIX = process.env.OBJECT_PREFIX || "events/";
  process.env.REPLAY_QUEUE_URL = process.env.REPLAY_QUEUE_URL || "http://test/000000000000/s3-sqs-bridge-replay-queue-test";
  process.env.AWS_ENDPOINT = process.env.AWS_ENDPOINT || "http://test";
}

const configSchema = z.object({
  BUCKET_NAME: z.string().nonempty(),
  OBJECT_PREFIX: z.string().optional(),
  REPLAY_QUEUE_URL: z.string().nonempty(),
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
      AWS_ENDPOINT: config.AWS_ENDPOINT
    }
  }));
}
logConfig();

// Use the separate endpoints if provided; otherwise use AWS_ENDPOINT.
const s3 = new S3Client({ endpoint: config.AWS_ENDPOINT, forcePathStyle: true });
const sqs = new SQSClient({ endpoint: config.AWS_ENDPOINT });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function logInfo(message) {
  console.log(JSON.stringify({ level: "info", timestamp: new Date().toISOString(), message }));
}

function logError(message, error) {
  console.error(JSON.stringify({ level: "error", timestamp: new Date().toISOString(), message, error: error ? error.toString() : undefined }));
}

// ---------------------------------------------------------------------------------------------------------------------
// Replay Task
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
    versions.push(...response.Versions);
    params.KeyMarker = response.NextKeyMarker;
    params.VersionIdMarker = response.NextVersionIdMarker;
  } while (response.IsTruncated);

  versions.sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified));
  return versions;
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

export async function replay() {
  logInfo(`Starting replay job for bucket ${config.BUCKET_NAME} prefix ${config.OBJECT_PREFIX}`);
  const versions = await listAndSortAllObjectVersions();
  logInfo(`Processing ${versions.length} versions...`);
  for (const version of versions) {
    const event = {
      bucket: config.BUCKET_NAME,
      key: version.Key,
      versionId: version.VersionId,
      eventTime: version.LastModified
    };
    await sendEventToSqs(event);
  }
  logInfo('replay job complete.');
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

export async function sourceLambdaHandler(event) {
  logInfo(`Source Lambda received event: ${JSON.stringify(event, null, 2)}`);
  for (const record of event.Records) {
    logInfo(`Create source-projection from: ${record.body}.`);
  }
  return { status: "logged" };
}

export async function replayLambdaHandler(event) {
  logInfo(`Replay Lambda received event: ${JSON.stringify(event, null, 2)}`);
  for (const record of event.Records) {
    logInfo(`Create replay-projection from: ${record.body}.`);
  }
  return { status: "logged" };
}

// ---------------------------------------------------------------------------------------------------------------------
// Main CLI
// ---------------------------------------------------------------------------------------------------------------------

export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log(`
      Usage:
      --help                     Show this help message (default)
      --source-projection        Run realtime Lambda handler
      --replay-projection        Run replay Lambda handler
      --replay                   Run full bucket replay
      --healthcheck              Run healthcheck server
    `);
    return;
  }

  if (args.includes('--replay')) {
    await replay();
  } else if (args.includes('--source-projection')) {
    await sourceLambdaHandler({ "source": "main" });
  } else if (args.includes('--replay-projection')) {
    await replayLambdaHandler({ "source": "main" });
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

