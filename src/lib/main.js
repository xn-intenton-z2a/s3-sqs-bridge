#!/usr/bin/env node
// src/lib/main.js
// This file serves as both the logger and the GitHub Event Projections Lambda Handler.

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// Configuration for PostgreSQL retries
const MAX_ATTEMPTS = parseInt(process.env.PG_MAX_RETRIES, 10) || 3;
const RETRY_DELAY = parseInt(process.env.PG_RETRY_DELAY_MS, 10) || 1000;

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOperation(operation, maxAttempts = MAX_ATTEMPTS, delay = RETRY_DELAY) {
  let attempts = 0;
  let lastError;
  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      attempts++;
      if (attempts < maxAttempts) {
        // Log retry attempt
        console.warn(`Operation failed, retrying attempt ${attempts + 1} of ${maxAttempts} after ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

// Define logging functions
export function logInfo(message) {
  console.log(message);
}

export function logError(message, error) {
  console.error(message, error);
}

// Robust default configurations for GitHub Event Projection
const PG_CONNECTION_STRING = process.env.PG_CONNECTION_STRING || 'postgres://user:pass@localhost:5432/db';
const GITHUB_PROJECTIONS_TABLE = process.env.GITHUB_PROJECTIONS_TABLE || 'github_event_projections';
const GITHUB_EVENT_QUEUE_URL = process.env.GITHUB_EVENT_QUEUE_URL || 'https://test/000000000000/github-event-queue-test';

/**
 * Lambda handler for processing GitHub event messages from SQS and persisting projections in PostgreSQL.
 * Expected event record body format (JSON):
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
  const client = new Client({ connectionString: PG_CONNECTION_STRING });

  try {
    // Retry connecting to the PostgreSQL database
    await retryOperation(() => client.connect());

    const records = event.Records || [];
    for (const record of records) {
      let body;
      try {
        body = JSON.parse(record.body);
      } catch (parseError) {
        logError(`Failed to parse record body: ${record.body}`);
        continue;
      }

      const { repository, eventType, eventTimestamp, metadata } = body;
      if (!repository || !eventType || !eventTimestamp) {
        logError(`Missing required fields in GitHub event: ${record.body}`);
        continue;
      }

      const query = `
        INSERT INTO ${GITHUB_PROJECTIONS_TABLE} (repository, event_type, event_timestamp, metadata)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (repository) DO UPDATE SET
          event_type = EXCLUDED.event_type,
          event_timestamp = EXCLUDED.event_timestamp,
          metadata = EXCLUDED.metadata;
      `;
      const values = [repository, eventType, eventTimestamp, JSON.stringify(metadata || {})];

      // Retry the query operation in case of transient failure
      await retryOperation(() => client.query(query, values));

      logInfo(`Processed GitHub event for repository ${repository}`);
    }
    return { status: 'success' };
  } catch (error) {
    logError('Error processing GitHub events', error);
    throw error;
  } finally {
    // Ensure the client is closed regardless of success or failure
    try {
      await client.end();
    } catch (endError) {
      logError('Error closing the database connection', endError);
    }
  }
}

// If this module is executed directly, run a dummy event for local testing
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dummyEvent = { Records: [] };
  githubEventProjectionHandler(dummyEvent)
    .then((result) => logInfo(`Execution result: ${JSON.stringify(result)}`))
    .catch((err) => logError('Execution error', err));
}
