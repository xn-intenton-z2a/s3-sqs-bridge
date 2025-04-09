// tests/unit/main.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { githubEventProjectionHandler } from '../../src/lib/main.js';

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


describe('githubEventProjectionHandler', () => {
  beforeEach(() => {
    mockConnect.mockClear();
    mockQuery.mockClear();
    mockEnd.mockClear();
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
    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'success' });
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
  });

  it('skips records with missing required fields', async () => {
    mockConnect.mockResolvedValue();
    mockEnd.mockResolvedValue();

    const event = {
      Records: [
        {
          body: JSON.stringify({
            repository: 'repo3',
            // missing eventType and eventTimestamp
            metadata: {}
          })
        }
      ]
    };
    
    const result = await githubEventProjectionHandler(event);
    // No query should be executed
    expect(mockQuery).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'success' });
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
    // Expect query to have been attempted MAX_ATTEMPTS times
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });
});
