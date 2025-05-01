#!/usr/bin/env node
// src/lib/main.js
// This file serves as both the logger and the GitHub Event Projections Lambda Handler.
// It processes GitHub event messages from an SQS queue and stores projections in PostgreSQL with robust retry logic,
// basic metrics collection, and now an optional HTTP metrics endpoint using Express, as well as a status endpoint,
// and dead-letter queue support for failed records.

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import express from 'express';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

dotenv.config();

// Metrics counters for tracking event processing
export const metrics = {
  totalEvents: 0,
  successfulEvents: 0,
  skippedEvents: 0,
  dbFailures: 0,
  dbRetryCount: 0,
  deadLetterEvents: 0
};

export function resetMetrics() {
  metrics.totalEvents = 0;
  metrics.successfulEvents = 0;
  metrics.skippedEvents = 0;
  metrics.dbFailures = 0;
  metrics.dbRetryCount = 0;
  metrics.deadLetterEvents = 0;
}

export function getMetrics() {
  return { ...metrics };
}

// Helper to mask sensitive information in PostgreSQL connection string
function maskConnectionString(connStr) {
  // Replace password part with ***, if present
  return connStr.replace(/(\/\/[^:]+:)[^@]+(@)/, '$1***$2');
}

// New helper function to compute exponential backoff retry delay
function computeRetryDelay(baseDelay, attempt) {
  // Exponential backoff: baseDelay * (2^(attempt - 1))
  return baseDelay * Math.pow(2, attempt - 1);
}

// Export computeRetryDelay for testing purposes
export { computeRetryDelay };

// Helper function to log retry errors
function logRetryError(error, nextAttempt, maxAttempts, delay) {
  console.warn(`Operation failed, retrying attempt ${nextAttempt} of ${maxAttempts} after ${delay}ms...`);
}

// Utility function to pause for a given number of milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generic retry operation using helper functions
async function retryOperation(operation, maxAttempts = MAX_ATTEMPTS, delay = RETRY_DELAY) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }
      // Increment dbRetryCount each time a retry is attempted
      metrics.dbRetryCount++;
      const computedDelay = computeRetryDelay(delay, attempt);
      logRetryError(err, attempt + 1, maxAttempts, computedDelay);
      await sleep(computedDelay);
    }
  }
}

// Configuration for PostgreSQL retries and defaults
const MAX_ATTEMPTS = parseInt(process.env.PG_MAX_RETRIES, 10) || 3;
const RETRY_DELAY = parseInt(process.env.PG_RETRY_DELAY_MS, 10) || 1000;

const PG_CONNECTION_STRING = process.env.PG_CONNECTION_STRING || 'postgres://user:pass@localhost:5432/db';
const GITHUB_PROJECTIONS_TABLE = process.env.GITHUB_PROJECTIONS_TABLE || 'github_event_projections';
const GITHUB_EVENT_QUEUE_URL = process.env.GITHUB_EVENT_QUEUE_URL || 'https://test/000000000000/github-event-queue-test';

// Pool configuration
const PG_POOL_SIZE = parseInt(process.env.PG_POOL_SIZE, 10) || 10;
const pool = new Pool({ connectionString: PG_CONNECTION_STRING, max: PG_POOL_SIZE });

// Initialize SQS client
const sqsClient = new SQSClient();

/**
 * Send a message to the configured Dead Letter Queue.
 * @param {string} body - The raw record body to send
 */
export async function sendToDeadLetterQueue(body) {
  const queueUrl = process.env.DEAD_LETTER_QUEUE_URL;
  if (!queueUrl) {
    // No DLQ configured; skip sending
    return;
  }
  try {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: body
      })
    );
  } catch (err) {
    logError(`Failed to send message to DLQ: ${queueUrl}`, err);
  }
}

// Consolidated connectWithRetry function using retryOperation and pooling
export async function connectWithRetry() {
  return await retryOperation(async () => {
    try {
      return await pool.connect();
    } catch (err) {
      logConnectionError(err);
      throw err;
    }
  });
}

// Helper function to log connection errors with masked connection strings
function logConnectionError(error) {
  const masked = maskConnectionString(PG_CONNECTION_STRING);
  console.warn(`Connection failed using ${masked}. Retrying...`);
}

// Zod schema for validating GitHub event projection messages
const GitHubEventSchema = z.object({
  repository: z.string({ required_error: 'repository is required' }),
  eventType: z.string({ required_error: 'eventType is required' }),
  eventTimestamp: z
    .string({ required_error: 'eventTimestamp is required' })
    .refine(val => !isNaN(Date.parse(val)), { message: 'Invalid ISO date format' }),
  metadata: z.optional(z.object({}).passthrough())
});

// Define logging functions
export function logInfo(message) {
  console.log(message);
}

export function logError(message, error) {
  console.error(message, error);
}

/**
 * Lambda handler for processing GitHub event messages from SQS and persisting projections in PostgreSQL.
 * The expected SQS event record body format (JSON):
 * {
 *    "repository": "repo-name",
 *    "eventType": "push",
 *    "eventTimestamp": "2025-03-17T12:00:00Z",
 *    "metadata": { ... }
 * }
 * 
 * @param {object} event - The SQS event containing GitHub messages.
 * @returns {Promise<object>} - Processing result status.
 */
export async function githubEventProjectionHandler(event) {
  logInfo(`GitHub Event Projection Handler received event: ${JSON.stringify(event)}`);
  // If there are no records, skip connecting to the database
  if (!event.Records || event.Records.length === 0) {
    logInfo('No records to process, exiting early.');
    return { status: 'success' };
  }

  let client;
  try {
    client = await connectWithRetry();

    const records = event.Records;
    for (const record of records) {
      metrics.totalEvents++;
      let body;
      try {
        body = JSON.parse(record.body);
      } catch (parseError) {
        logError(`Failed to parse record body: ${record.body}`, parseError);
        metrics.skippedEvents++;
        continue;
      }

      // Validate the parsed body using Zod schema
      const validation = GitHubEventSchema.safeParse(body);
      if (!validation.success) {
        logError(`Validation failed for GitHub event: ${record.body}`, validation.error);
        metrics.skippedEvents++;
        continue;
      }
      const validData = validation.data;
      const { repository, eventType, eventTimestamp, metadata } = validData;

      const query = `
        INSERT INTO ${GITHUB_PROJECTIONS_TABLE} (repository, event_type, event_timestamp, metadata)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (repository) DO UPDATE SET
          event_type = EXCLUDED.event_type,
          event_timestamp = EXCLUDED.event_timestamp,
          metadata = EXCLUDED.metadata;
      `;
      const values = [repository, eventType, eventTimestamp, JSON.stringify(metadata || {})];

      try {
        await retryOperation(async () => {
          try {
            return await client.query(query, values);
          } catch (err) {
            logError(`Query failed for repository ${repository} (eventType: ${eventType}). Retrying...`, err);
            throw err;
          }
        });
        metrics.successfulEvents++;
        logInfo(`Processed GitHub event for repository ${repository}`);
      } catch (err) {
        // On repeated DB failure, send to DLQ instead of failing the batch
        metrics.dbFailures++;
        await sendToDeadLetterQueue(record.body);
        metrics.deadLetterEvents++;
        logError(`Failed to process GitHub event for repository ${repository}, routing to DLQ.`, err);
        continue;
      }
    }
    logInfo(`Metrics: ${JSON.stringify(getMetrics())}`);
    return { status: 'success' };
  } catch (error) {
    logError('Error processing GitHub events', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        logError('Error releasing the database client', releaseError);
      }
    }
  }
}

// Function to create an Express server exposing the /metrics endpoint
export function createMetricsServer() {
  const app = express();
  app.get('/metrics', (req, res) => {
    res.json(getMetrics());
  });
  return app;
}

// New function to create an Express server exposing the /status endpoint
export function createStatusServer() {
  const app = express();
  app.get('/status', (req, res) => {
    res.json(getMetrics());
  });
  return app;
}

// New function to start the status endpoint server
export function startStatusEndpoint() {
  const app = createStatusServer();
  const port = process.env.STATUS_PORT || 3000;
  app.listen(port, () => logInfo(`Status server listening on port ${port}`));
}

// If this module is executed directly, run a dummy event for local testing
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dummyEvent = { Records: [] };
  githubEventProjectionHandler(dummyEvent)
    .then((result) => logInfo(`Execution result: ${JSON.stringify(result)}`))
    .catch((err) => logError('Execution error', err));
}

// Start the HTTP metrics endpoint if the '--metrics' flag is provided
if (process.argv.includes('--metrics')) {
  const app = createMetricsServer();
  const port = process.env.METRICS_PORT || 3000;
  app.listen(port, () => logInfo(`Metrics server listening on port ${port}`));
}

// Start the HTTP status endpoint if the '--status-endpoint' flag is provided
if (process.argv.includes('--status-endpoint')) {
  startStatusEndpoint();
}

// Graceful shutdown: close pool on process termination
async function shutdown() {
  try {
    await pool.end();
    logInfo('Database pool has been closed.');
  } catch (err) {
    logError('Error closing database pool', err);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
