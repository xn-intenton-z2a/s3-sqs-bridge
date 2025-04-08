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

  it('processes valid GitHub event messages', async () => {
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
    mockConnect.mockResolvedValue();
    mockQuery.mockResolvedValue({ rowCount: 1 });
    mockEnd.mockResolvedValue();

    const result = await githubEventProjectionHandler(event);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalled();
    expect(result).toEqual({ status: 'success' });
  });

  it('skips records with invalid JSON', async () => {
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
    mockConnect.mockResolvedValue();
    mockQuery.mockResolvedValue({ rowCount: 1 });
    mockEnd.mockResolvedValue();

    const result = await githubEventProjectionHandler(event);
    // Only one valid record should trigger a query
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'success' });
  });

  it('skips records with missing required fields', async () => {
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
    mockConnect.mockResolvedValue();
    mockEnd.mockResolvedValue();

    const result = await githubEventProjectionHandler(event);
    // No query should be executed
    expect(mockQuery).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'success' });
  });

  it('throws error when database query fails', async () => {
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
    mockConnect.mockResolvedValue();
    mockQuery.mockRejectedValue(new Error('DB error'));
    mockEnd.mockResolvedValue();

    await expect(githubEventProjectionHandler(event)).rejects.toThrow('DB error');
    expect(mockQuery).toHaveBeenCalled();
  });
});
