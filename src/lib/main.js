#!/usr/bin/env node
// src/lib/main.js
// S3 SQS Bridge (v0.2.0) - S3 event sourcing, SQS bridging, Lambda projections.

import dotenv from 'dotenv';
import { z } from 'zod';
import express from 'express';
import { S3Client, ListObjectVersionsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

dotenv.config();

const configSchema = z.object({
  BUCKET_NAME: z.string().nonempty(),
  QUEUE_URL: z.string().nonempty(),
  // Allow separate endpoints for S3 and SQS for local testing. If not provided, fall back to AWS_ENDPOINT.
  S3_ENDPOINT: z.string().optional(),
  SQS_ENDPOINT: z.string().optional(),
  AWS_ENDPOINT: z.string().optional()
});

const config = configSchema.parse(process.env);

// Log non-sensitive configuration details.
function logConfig() {
  console.log(JSON.stringify({
    level: "info",
    timestamp: new Date().toISOString(),
    message: "Configuration loaded",
    config: { BUCKET_NAME: config.BUCKET_NAME, QUEUE_URL: config.QUEUE_URL }
  }));
}
logConfig();

// Use the separate endpoints if provided; otherwise use AWS_ENDPOINT.
const s3 = new S3Client({ endpoint: config.S3_ENDPOINT || config.AWS_ENDPOINT });
const sqs = new SQSClient({ endpoint: config.SQS_ENDPOINT || config.AWS_ENDPOINT });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function logInfo(message) {
  console.log(JSON.stringify({ level: "info", timestamp: new Date().toISOString(), message }));
}

function logError(message, error) {
  console.error(JSON.stringify({ level: "error", timestamp: new Date().toISOString(), message, error: error ? error.toString() : undefined }));
}

async function listAndSortAllObjectVersions() {
  let versions = [];
  let params = { Bucket: config.BUCKET_NAME };
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

function buildSQSMessageParams(event) {
  return {
    QueueUrl: config.QUEUE_URL,
    MessageBody: JSON.stringify(event)
  };
}

async function sendEventToSqs(event) {
  const params = buildSQSMessageParams(event);
  try {
    const result = await retryOperationExponential(async () =>
        await sqs.send(new SendMessageCommand(params))
    );
    logInfo(`Sent message to SQS, MessageId: ${result.MessageId}`);
  } catch (err) {
    logError("Failed to send message to SQS", err);
    throw err;
  }
}

function parseMessageBody(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function validateConfig(cfg) {
  return cfg.BUCKET_NAME && cfg.QUEUE_URL;
}

async function retryOperationExponential(operation, retries = 3, delay = 100) {
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

export async function realtimeLambdaHandler(event) {
  logInfo(`Received realtime event: ${JSON.stringify(event)}`);
  for (const record of event.Records) {
    const { s3 } = record;
    const eventDetail = {
      bucket: s3.bucket.name,
      key: s3.object.key,
      eventTime: record.eventTime,
      versionId: s3.object.versionId,
      sequencer: s3.object.sequencer
    };
    await sendEventToSqs(eventDetail);
  }
}

export async function reseed() {
  logInfo(`Starting reseed job for bucket ${config.BUCKET_NAME}`);
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
  logInfo('Reseed job complete.');
}

function healthCheckServer() {
  const app = express();
  app.get('/', (req, res) => res.send('S3 SQS Bridge OK'));
  app.listen(8080, () => logInfo('Healthcheck available at :8080'));
}

async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log(`
      Usage:
      --realtime-lambda          Run realtime Lambda handler
      --reseed                   Run full bucket reseed
      --healthcheck              Run healthcheck server
    `);
    return;
  }

  if (args.includes('--reseed')) {
    await reseed();
  } else if (args.includes('--realtime-lambda')) {
    console.log('Realtime lambda handler requires AWS Lambda invocation context.');
  } else if (args.includes('--healthcheck')) {
    healthCheckServer();
  } else {
    console.log('Invalid or missing argument. Run with --help for usage.');
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  main().catch((err) => {
    logError('Fatal error in main execution', err);
    process.exit(1);
  });
}

export { main, parseMessageBody, buildSQSMessageParams, validateConfig, sendEventToSqs, retryOperationExponential, listAndSortAllObjectVersions };
