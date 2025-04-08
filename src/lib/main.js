#!/usr/bin/env node
// src/lib/main.js
// This file serves as both the logger and the GitHub Event Projections Lambda Handler.

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

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
    await client.connect();
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
      await client.query(query, values);
      logInfo(`Processed GitHub event for repository ${repository}`);
    }
    await client.end();
    return { status: 'success' };
  } catch (error) {
    logError('Error processing GitHub events', error);
    await client.end();
    throw error;
  }
}

// If this module is executed directly, run a dummy event for local testing
if (require.main === module) {
  const dummyEvent = { Records: [] };
  githubEventProjectionHandler(dummyEvent)
    .then((result) => logInfo(`Execution result: ${JSON.stringify(result)}`))
    .catch((err) => logError('Execution error', err));
}
