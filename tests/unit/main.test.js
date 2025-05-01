// tests/unit/main.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock AWS SQS
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-sqs', () => {
  class SQSClient {
    send(command) {
      return mockSend(command);
    }
  }
  class SendMessageCommand {
    constructor(input) {
      this.input = input;
    }
  }
  return { SQSClient, SendMessageCommand };
});

// Mocks for pg.Pool
const mockConnect = vi.fn();
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockPoolEnd = vi.fn();
vi.mock('pg', () => {
  class Pool {
    constructor(opts) {}
    async connect() {
      await mockConnect();
      return { query: mockQuery, release: mockRelease };
    }
    async end() {
      await mockPoolEnd();
    }
  }
  return { Pool };
});

// Provide a Dead Letter Queue URL for testing
process.env.DEAD_LETTER_QUEUE_URL = 'https://dlq.queue/test';

import {
  githubEventProjectionHandler,
  getMetrics,
  resetMetrics,
  createMetricsServer,
  createStatusServer,
  computeRetryDelay,
  sendToDeadLetterQueue,
  connectWithRetry
} from '../../src/lib/main.js';

// Reset mocks and metrics before each test
beforeEach(() => {
  mockConnect.mockClear();
  mockQuery.mockClear();
  mockRelease.mockClear();
  mockPoolEnd.mockClear();
  mockSend.mockClear();
  resetMetrics();
});

describe('computeRetryDelay', () => {
  it('returns correct exponential delays', () => {
    const baseDelay = 1000;
    expect(computeRetryDelay(baseDelay, 1)).toBe(1000);
    expect(computeRetryDelay(baseDelay, 2)).toBe(2000);
    expect(computeRetryDelay(baseDelay, 3)).toBe(4000);
  });
});

describe('sendToDeadLetterQueue', () => {
  it('sends message to the configured DLQ', async () => {
    mockSend.mockResolvedValue({});
    const body = '{"test":"data"}';
    await sendToDeadLetterQueue(body);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input).toEqual({ QueueUrl: process.env.DEAD_LETTER_QUEUE_URL, MessageBody: body });
  });
});

// New tests for connectWithRetry
describe('connectWithRetry', () => {
  it('retries on initial connection failures and returns a client', async () => {
    // First connect fails, then succeeds
    mockConnect.mockRejectedValueOnce(new Error('Initial failure'));
    mockConnect.mockResolvedValue();
    const client = await connectWithRetry();
    expect(mockConnect).toHaveBeenCalledTimes(2);
    // Ensure returned client has query and release
    expect(client).toHaveProperty('query');
    expect(client).toHaveProperty('release');
    // Retry attempts should be recorded
    const metricsResult = getMetrics();
    expect(metricsResult.dbRetryCount).toBe(1);
    // Release not called here (client returned)
  });

  it('throws after maximum retry attempts', async () => {
    // Always fail
    mockConnect.mockRejectedValue(new Error('Failure'));
    await resetMetrics();
    await expect(connectWithRetry()).rejects.toThrow('Failure');
    // It should have attempted max attempts (default 3)
    expect(mockConnect).toHaveBeenCalledTimes(3);
    const metricsResult = getMetrics();
    expect(metricsResult.dbRetryCount).toBe(2);
  });
});

describe('githubEventProjectionHandler', () => {
  it('processes valid GitHub event messages and retries on initial connection failure', async () => {
    // Simulate connection failure on first attempt then success
    mockConnect.mockRejectedValueOnce(new Error('Connect error'));
    mockConnect.mockResolvedValue();
    mockQuery.mockResolvedValue({ rowCount: 1 });

    const event = {
      Records: [
        {
          body: JSON.stringify({
            repository: 'my-repo',
            eventType: 'push',
            eventTimestamp: '2025-03-17T12:00:00Z',
            metadata: { ref: 'refs/heads/main' }
          })
        }
      ]
    };

    const result = await githubEventProjectionHandler(event);
    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'success' });
    const metricsResult = getMetrics();
    expect(metricsResult).toEqual({ totalEvents: 1, successfulEvents: 1, skippedEvents: 0, dbFailures: 0, dbRetryCount: 1, deadLetterEvents: 0 });
  });

  it('skips records with invalid JSON', async () => {
    mockConnect.mockResolvedValue();
    mockQuery.mockResolvedValue({ rowCount: 1 });

    const event = {
      Records: [
        { body: 'invalid-json' },
        {
          body: JSON.stringify({
            repository: 'repo2',
            eventType: 'pull_request',
            eventTimestamp: '2025-03-17T13:00:00Z',
            metadata: { action: 'opened' }
          })
        }
      ]
    };

    const result = await githubEventProjectionHandler(event);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'success' });
    const metricsResult = getMetrics();
    expect(metricsResult).toEqual({ totalEvents: 2, successfulEvents: 1, skippedEvents: 1, dbFailures: 0, dbRetryCount: 0, deadLetterEvents: 0 });
  });

  it('skips records with missing required fields', async () => {
    mockConnect.mockResolvedValue();

    const event = {
      Records: [
        {
          body: JSON.stringify({ repository: 'repo3', metadata: {} })
        }
      ]
    };

    const result = await githubEventProjectionHandler(event);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'success' });
    const metricsResult = getMetrics();
    expect(metricsResult).toEqual({ totalEvents: 1, successfulEvents: 0, skippedEvents: 1, dbFailures: 0, dbRetryCount: 0, deadLetterEvents: 0 });
  });

  it('skips records with invalid data types', async () => {
    mockConnect.mockResolvedValue();

    const event = {
      Records: [
        {
          body: JSON.stringify({ repository: 123, eventType: 'push', eventTimestamp: '2025-03-17T12:00:00Z' })
        }
      ]
    };
    const result = await githubEventProjectionHandler(event);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'success' });
    const metricsResult = getMetrics();
    expect(metricsResult).toEqual({ totalEvents: 1, successfulEvents: 0, skippedEvents: 1, dbFailures: 0, dbRetryCount: 0, deadLetterEvents: 0 });
  });

  it('routes failed record to DLQ and continues without throwing', async () => {
    mockConnect.mockResolvedValue();
    mockQuery.mockRejectedValue(new Error('DB error'));

    const event = {
      Records: [
        {
          body: JSON.stringify({
            repository: 'repo4',
            eventType: 'push',
            eventTimestamp: '2025-03-17T14:00:00Z',
            metadata: {}
          })
        }
      ]
    };

    const result = await githubEventProjectionHandler(event);
    expect(result).toEqual({ status: 'success' });
    // validate metrics include a DLQ event
    const metricsResult = getMetrics();
    expect(metricsResult).toEqual({ totalEvents: 1, successfulEvents: 0, skippedEvents: 0, dbFailures: 1, dbRetryCount: 2, deadLetterEvents: 1 });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});

describe('Metrics Endpoint', () => {
  it('returns the current metrics when GET /metrics is called', async () => {
    resetMetrics();
    const app = createMetricsServer();
    const response = await request(app).get('/metrics');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ totalEvents: 0, successfulEvents: 0, skippedEvents: 0, dbFailures: 0, dbRetryCount: 0, deadLetterEvents: 0 });
  });
});

describe('Status Endpoint', () => {
  it('returns the current metrics when GET /status is called', async () => {
    resetMetrics();
    const app = createStatusServer();
    const response = await request(app).get('/status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ totalEvents: 0, successfulEvents: 0, skippedEvents: 0, dbFailures: 0, dbRetryCount: 0, deadLetterEvents: 0 });
  });
});
