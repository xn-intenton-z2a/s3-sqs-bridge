// tests/unit/main.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { githubEventProjectionHandler, getMetrics, resetMetrics, createMetricsServer, createStatusServer, computeRetryDelay } from '../../src/lib/main.js';
import request from 'supertest';

// Mock the pg Client
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockEnd = vi.fn();

vi.mock('pg', () => {
  const mClient = function () {
    return {
      connect: mockConnect,
      query: mockQuery,
      end: mockEnd
    };
  };
  return { default: { Client: mClient }, Client: mClient };
});


describe('computeRetryDelay', () => {
  it('returns correct exponential delays', () => {
    const baseDelay = 1000;
    expect(computeRetryDelay(baseDelay, 1)).toBe(1000);
    expect(computeRetryDelay(baseDelay, 2)).toBe(2000);
    expect(computeRetryDelay(baseDelay, 3)).toBe(4000);
  });
});


describe('githubEventProjectionHandler', () => {
  beforeEach(() => {
    mockConnect.mockClear();
    mockQuery.mockClear();
    mockEnd.mockClear();
    resetMetrics();
  });

  it('processes valid GitHub event messages and retries on initial connection failure', async () => {
    // Simulate connection failure on first attempt then success
    mockConnect.mockRejectedValueOnce(new Error('Connect error'));
    mockConnect.mockResolvedValue();
    mockQuery.mockResolvedValue({ rowCount: 1 });
    mockEnd.mockResolvedValue();

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
    // Should have retried once for connection failure
    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'success' });
    const metricsResult = getMetrics();
    expect(metricsResult.totalEvents).toEqual(1);
    expect(metricsResult.successfulEvents).toEqual(1);
    expect(metricsResult.skippedEvents).toEqual(0);
    expect(metricsResult.dbFailures).toEqual(0);
    expect(metricsResult.dbRetryCount).toEqual(1);
  });

  it('skips records with invalid JSON', async () => {
    mockConnect.mockResolvedValue();
    mockQuery.mockResolvedValue({ rowCount: 1 });
    mockEnd.mockResolvedValue();

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
    // Only one valid record should trigger a query
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'success' });
    const metricsResult = getMetrics();
    expect(metricsResult.totalEvents).toEqual(2);
    expect(metricsResult.successfulEvents).toEqual(1);
    expect(metricsResult.skippedEvents).toEqual(1);
    expect(metricsResult.dbFailures).toEqual(0);
    expect(metricsResult.dbRetryCount).toEqual(0);
  });

  it('skips records with missing required fields', async () => {
    mockConnect.mockResolvedValue();
    mockEnd.mockResolvedValue();

    const event = {
      Records: [
        {
          body: JSON.stringify({
            repository: 'repo3',
            metadata: {}
          })
        }
      ]
    };

    const result = await githubEventProjectionHandler(event);
    // No query should be executed as validation will fail
    expect(mockQuery).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'success' });
    const metricsResult = getMetrics();
    expect(metricsResult.totalEvents).toEqual(1);
    expect(metricsResult.successfulEvents).toEqual(0);
    expect(metricsResult.skippedEvents).toEqual(1);
    expect(metricsResult.dbFailures).toEqual(0);
    expect(metricsResult.dbRetryCount).toEqual(0);
  });

  it('skips records with invalid data types', async () => {
    // repository should be a string, pass a number instead
    mockConnect.mockResolvedValue();
    mockEnd.mockResolvedValue();

    const event = {
      Records: [
        {
          body: JSON.stringify({
            repository: 123,
            eventType: 'push',
            eventTimestamp: '2025-03-17T12:00:00Z'
          })
        }
      ]
    };
    const result = await githubEventProjectionHandler(event);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'success' });
    const metricsResult = getMetrics();
    expect(metricsResult.totalEvents).toEqual(1);
    expect(metricsResult.successfulEvents).toEqual(0);
    expect(metricsResult.skippedEvents).toEqual(1);
    expect(metricsResult.dbFailures).toEqual(0);
    expect(metricsResult.dbRetryCount).toEqual(0);
  });

  it('throws error when database query fails after retries', async () => {
    mockConnect.mockResolvedValue();
    // Simulate query failure on each retry attempt
    mockQuery.mockRejectedValue(new Error('DB error'));
    mockEnd.mockResolvedValue();

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

    await expect(githubEventProjectionHandler(event)).rejects.toThrow('DB error');
    // Expect query to have been attempted MAX_ATTEMPTS times (3 attempts) and 2 retries
    expect(mockQuery).toHaveBeenCalledTimes(3);
    const metricsResult = getMetrics();
    expect(metricsResult.totalEvents).toEqual(1);
    expect(metricsResult.successfulEvents).toEqual(0);
    expect(metricsResult.skippedEvents).toEqual(0);
    expect(metricsResult.dbFailures).toEqual(1);
    expect(metricsResult.dbRetryCount).toEqual(2);
  });
});

describe('Metrics Endpoint', () => {
  it('returns the current metrics when GET /metrics is called', async () => {
    // Ensure metrics are at their default
    resetMetrics();
    const app = createMetricsServer();
    const response = await request(app).get('/metrics');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ totalEvents: 0, successfulEvents: 0, skippedEvents: 0, dbFailures: 0, dbRetryCount: 0 });
  });
});

// New tests for the Status Endpoint
describe('Status Endpoint', () => {
  it('returns the current metrics when GET /status is called', async () => {
    resetMetrics();
    const app = createStatusServer();
    const response = await request(app).get('/status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ totalEvents: 0, successfulEvents: 0, skippedEvents: 0, dbFailures: 0, dbRetryCount: 0 });
  });
});
