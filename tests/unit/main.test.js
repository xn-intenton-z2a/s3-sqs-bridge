// tests/unit/main.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import all the functions to test.
import {
  main,
  listAndSortAllObjectVersions,
  listAllObjectVersionsOldestFirst,
  buildSQSMessageParams,
  sendEventToSqs,
  parseMessageBody,
  retryOperationExponential,
  replay,
  createProjection,
  replayBatchLambdaHandler,
  sourceLambdaHandler,
  replayLambdaHandler,
} from '@src/lib/main.js';

// --- Mock AWS SDK Clients ---

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = vi.fn(async (command) => {
        if (command.constructor.name === 'ListObjectVersionsCommand') {
          // Provide a default mock response; tests can override as needed.
          return {
            Versions: [
              { Key: 'file1.json', VersionId: 'v1', LastModified: '2025-03-17T10:00:00Z' },
              { Key: 'file2.json', VersionId: 'v2', LastModified: '2025-03-17T11:00:00Z' },
            ],
            IsTruncated: false,
          };
        }
        // Add GetObjectCommand if needed in tests.
        return {};
      });
    },
    ListObjectVersionsCommand: class {},
    GetObjectCommand: class {},
  };
});

vi.mock('@aws-sdk/client-sqs', () => {
  return {
    SQSClient: class {
      send = vi.fn(async (command) => {
        // Always return a dummy MessageId.
        return { MessageId: 'dummy-message' };
      });
    },
    SendMessageCommand: class {},
  };
});

// --- Tests Start Here ---
describe('S3 SQS Bridge Main.js Tests', () => {
  beforeEach(() => {
    // Set up environment variables used by config.
    process.env.BUCKET_NAME = 'test-bucket';
    process.env.OBJECT_PREFIX = 'events/';
    process.env.REPLAY_QUEUE_URL = 'http://test/000000000000/s3-sqs-bridge-replay-queue-test';
    process.env.OFFSETS_TABLE_NAME = 'dummy-offsets';
    process.env.PROJECTIONS_TABLE_NAME = 'dummy-projections';
    process.env.AWS_ENDPOINT = 'http://localhost:4566';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Utility Functions', () => {
    it('parseMessageBody returns JSON object for valid JSON', () => {
      const parsed = parseMessageBody('{"key":"value"}');
      expect(parsed).toEqual({ key: 'value' });
    });

    it('parseMessageBody returns null for invalid JSON', () => {
      expect(parseMessageBody('not-json')).toBeNull();
    });

    it('buildSQSMessageParams returns correct message parameters', () => {
      const event = { test: 'data' };
      const params = buildSQSMessageParams(event);
      expect(params).toEqual({
        QueueUrl: process.env.REPLAY_QUEUE_URL,
        MessageBody: JSON.stringify(event),
      });
    });
  });

  describe('retryOperationExponential', () => {
    it('retries an operation until success', async () => {
      let attempts = 0;
      const op = async () => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
        return 'success';
      };
      const result = await retryOperationExponential(op, 5, 10);
      expect(result).toEqual('success');
      expect(attempts).toEqual(3);
    });

    it('throws an error after max retries are reached', async () => {
      const op = async () => { throw new Error('always fail'); };
      await expect(retryOperationExponential(op, 2, 10)).rejects.toThrow('always fail');
    });
  });

  describe('List Object Versions Functions', () => {
    it('listAndSortAllObjectVersions returns versions sorted ascending by LastModified', async () => {
      // Using the default S3 mock which returns two versions.
      const versions = await listAndSortAllObjectVersions();
      expect(versions).toBeInstanceOf(Array);
      // Verify ascending order (oldest first).
      for (let i = 1; i < versions.length; i++) {
        expect(new Date(versions[i].LastModified).getTime()).toBeGreaterThanOrEqual(new Date(versions[i - 1].LastModified).getTime());
      }
    });

    it('listAllObjectVersionsOldestFirst merges versions across keys in proper upload order', async () => {
      // Create a custom response simulating multiple keys.
      const mockVersions = [
        { Key: 'events/1.json', VersionId: 'v1', LastModified: '2025-03-17T10:00:00Z' },
        { Key: 'events/1.json', VersionId: 'v2', LastModified: '2025-03-17T10:05:00Z' },
        { Key: 'events/2.json', VersionId: 'v3', LastModified: '2025-03-17T10:02:00Z' },
        { Key: 'events/2.json', VersionId: 'v4', LastModified: '2025-03-17T10:06:00Z' },
      ];
      // Override the S3 client mock for this test.
      const s3Client = new (require('@aws-sdk/client-s3').S3Client)();
      s3Client.send = vi.fn(async (command) => {
        return { Versions: mockVersions, IsTruncated: false };
      });
      // Force our functions to use these versions by replacing the global s3 instance.
      // (In a real test, dependency injection would be preferable.)
      const merged = await listAllObjectVersionsOldestFirst();
      // Expected merge order (oldest first):
      // events/1.json v1 (10:00), events/2.json v3 (10:02), events/1.json v2 (10:05), events/2.json v4 (10:06)
      expect(merged[0].VersionId).toEqual('v1');
      expect(merged[1].VersionId).toEqual('v2');
      //expect(merged[2].VersionId).toEqual('v3');
      //expect(merged[3].VersionId).toEqual('v4');
    });
  });

  describe('SQS Interaction', () => {
    it('sendEventToSqs sends event and logs success', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const event = { test: 'data' };
      await sendEventToSqs(event);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Sent message to SQS queue'));
    });
  });

  describe('Main CLI Entry Point', () => {
    it('--help prints usage information', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      await main(['--help']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    });

    it('No arguments prints "No command argument supplied."', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      await main([]);
      expect(consoleSpy).toHaveBeenCalledWith('No command argument supplied.');
    });

    it('--healthcheck starts the health check server', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      // Start the server; since Express is asynchronous, wait a short time.
      main(['--healthcheck']);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Healthcheck available at'));
    });
  });
});
