// tests/unit/main.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import all the functions to test.
import {
  main,
  listAndSortAllObjectVersions,
  listAllObjectVersionsOldestFirst,
  buildSQSMessageParams,
  sendToSqs,
  retryOperationExponential,
  createS3EventFromVersion,
  createSQSEventFromS3Event,
  getProjectionIdsMap,
  createProjections,
  sourceLambdaHandler,
  replay,
  replayBatchLambdaHandler,
  replayLambdaHandler,
  readLastOffsetProcessedFromOffsetsTableById
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
        return { MessageId: 'dummy-message' };
      });
    },
    SendMessageCommand: class {},
  };
});

// --- New Mock for DynamoDB ---
vi.mock('@aws-sdk/client-dynamodb', () => {
  return {
    DynamoDBClient: class {
      send = vi.fn();
    },
    ScanCommand: class {},
    GetItemCommand: class {},
    PutItemCommand: class {},
  };
});

// --- Tests Start Here ---

describe('S3 SQS Bridge Main.js Tests', () => {
  beforeEach(() => {
    process.env.BUCKET_NAME = 'test-bucket';
    process.env.OBJECT_PREFIX = 'events/';
    process.env.REPLAY_QUEUE_URL = 'http://test/000000000000/s3-sqs-bridge-replay-queue-test';
    process.env.DIGEST_QUEUE_URL = 'http://test/000000000000/s3-sqs-bridge-digest-queue-test';
    process.env.OFFSETS_TABLE_NAME = 'dummy-offsets';
    process.env.PROJECTIONS_TABLE_NAME = 'dummy-projections';
    process.env.AWS_ENDPOINT = 'http://localhost:4566';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Utility Functions', () => {
    it('buildSQSMessageParams returns correct message parameters', () => {
      const event = { test: 'data' };
      const params = buildSQSMessageParams(event, process.env.REPLAY_QUEUE_URL);
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
      const versions = await listAndSortAllObjectVersions();
      expect(versions).toBeInstanceOf(Array);
      for (let i = 1; i < versions.length; i++) {
        expect(new Date(versions[i].LastModified).getTime()).toBeGreaterThanOrEqual(new Date(versions[i - 1].LastModified).getTime());
      }
    });

    it('listAllObjectVersionsOldestFirst merges versions across keys in proper upload order', async () => {
      const mockVersions = [
        { Key: 'events/1.json', VersionId: 'v1', LastModified: '2025-03-17T10:00:00Z' },
        { Key: 'events/1.json', VersionId: 'v2', LastModified: '2025-03-17T10:05:00Z' },
        { Key: 'events/2.json', VersionId: 'v3', LastModified: '2025-03-17T10:02:00Z' },
        { Key: 'events/2.json', VersionId: 'v4', LastModified: '2025-03-17T10:06:00Z' },
      ];
      const { S3Client } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client();
      s3Client.send = vi.fn(async () => ({ Versions: mockVersions, IsTruncated: false }));
      const merged = await listAllObjectVersionsOldestFirst(s3Client);
      expect(merged[0].VersionId).toEqual('v1');
      expect(merged[1].VersionId).toEqual('v3');
      expect(merged[2].VersionId).toEqual('v2');
      expect(merged[3].VersionId).toEqual('v4');
    });
  });

  describe('SQS Interaction', () => {
    it('sendToSqs sends event and logs success', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const event = { test: 'data' };
      await sendToSqs(event, process.env.REPLAY_QUEUE_URL);
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
      main(['--healthcheck']);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Healthcheck available at'));
    });
  });
});

describe('Additional Unit Tests for main.js', () => {
  beforeEach(() => {
    process.env.BUCKET_NAME = 's3-sqs-bridge-bucket-test';
    process.env.OBJECT_PREFIX = 'events/';
    process.env.REPLAY_QUEUE_URL = 'http://test/000000000000/s3-sqs-bridge-replay-queue-test';
    process.env.DIGEST_QUEUE_URL = 'http://test/000000000000/s3-sqs-bridge-digest-queue-test';
    process.env.OFFSETS_TABLE_NAME = 's3-sqs-bridge-offsets-table-test';
    process.env.PROJECTIONS_TABLE_NAME = 's3-sqs-bridge-projections-table-test';
    process.env.AWS_ENDPOINT = 'http://test';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('S3 and SQS Event Creation', () => {
    it('createS3EventFromVersion returns correctly structured S3 event', () => {
      const versionMetadata = {
        key: 'events/test.json',
        versionId: 'v123',
        lastModified: '2025-03-17T12:00:00Z'
      };
      const event = createS3EventFromVersion(versionMetadata);
      expect(event).toEqual({
        Records: [{
          eventVersion: "2.0",
          eventSource: "aws:s3",
          eventTime: '2025-03-17T12:00:00Z',
          eventName: "ObjectCreated:Put",
          s3: {
            s3SchemaVersion: "1.0",
            bucket: {
              name: process.env.BUCKET_NAME,
              arn: "arn:aws:s3:::" + process.env.BUCKET_NAME
            },
            object: {
              key: 'events/test.json',
              versionId: 'v123'
            }
          }
        }]
      });
    });

    it('createSQSEventFromS3Event returns correctly structured SQS event', () => {
      const s3Event = {
        Records: [{
          eventVersion: "2.0",
          eventSource: "aws:s3",
          eventTime: '2025-03-17T12:00:00Z',
          eventName: "ObjectCreated:Put",
          s3: {
            s3SchemaVersion: "1.0",
            bucket: {
              name: process.env.BUCKET_NAME,
              arn: "arn:aws:s3:::" + process.env.BUCKET_NAME
            },
            object: {
              key: 'events/test.json',
              versionId: 'v123'
            }
          }
        }]
      };
      const sqsEvent = createSQSEventFromS3Event(s3Event);
      expect(sqsEvent).toHaveProperty('Records');
      expect(sqsEvent.Records[0]).toHaveProperty('eventSource', 'aws:sqs');
      expect(sqsEvent.Records[0]).toHaveProperty('body', JSON.stringify(s3Event));
    });
  });

  describe.skip('DynamoDB Projections', () => {
    it('getProjectionIdsMap returns merged ids from paginated scan', async () => {
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const dynamoInstance = new DynamoDBClient();
      const sendMock = dynamoInstance.send;
      sendMock.mockResolvedValueOnce({
        Items: [{ id: { S: 'item1' } }],
        LastEvaluatedKey: { dummy: 'value' }
      }).mockResolvedValueOnce({
        Items: [{ id: { S: 'item2' } }],
        LastEvaluatedKey: undefined
      });
      DynamoDBClient.prototype.send = sendMock;
      const result = await getProjectionIdsMap([]);
      expect(result).toEqual({
        item1: { id: 'item1' },
        item2: { id: 'item2' }
      });
    });

    it('getProjectionIdsMap ignores specified keys', async () => {
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const dynamoInstance = new DynamoDBClient();
      const sendMock = dynamoInstance.send;
      sendMock.mockResolvedValueOnce({
        Items: [{ id: { S: 'item1' } }, { id: { S: 'item2' } }],
        LastEvaluatedKey: undefined
      });
      DynamoDBClient.prototype.send = sendMock;
      const result = await getProjectionIdsMap(['item1']);
      expect(result).toEqual({
        item2: { id: 'item2' }
      });
    });
  });

  describe('Projection Creation', () => {
    it('createProjections throws error for unsupported event names', async () => {
      const invalidEvent = {
        Records: [{
          eventVersion: "2.0",
          eventSource: "aws:s3",
          eventTime: '2025-03-17T12:00:00Z',
          eventName: "Delete",
          s3: {}
        }]
      };
      await expect(createProjections(invalidEvent)).rejects.toThrow('Unsupported event name');
    });
  });

  describe.skip('Source Lambda Handler Offsets', () => {
    it('sourceLambdaHandler throws error when bucket offset is behind replay offset', async () => {
      const module = await import('@src/lib/main.js');
      vi.spyOn(module, 'readLastOffsetProcessedFromOffsetsTableById')
        .mockImplementation(async (id) => {
          if (id === process.env.REPLAY_QUEUE_URL) {
            return { timestamp: "2025-03-18T22:00:00Z", key: "file.json", versionId: "v1" };
          } else {
            return { timestamp: "2025-03-18T21:00:00Z", key: "file.json", versionId: "v1" };
          }
        });
      const validS3Event = {
        Records: [{
          eventVersion: "2.0",
          eventSource: "aws:s3",
          eventTime: '2025-03-17T12:00:00Z',
          eventName: "ObjectCreated:Put",
          s3: {
            bucket: { name: process.env.BUCKET_NAME },
            object: { key: 'events/test.json', versionId: 'v123' }
          }
        }]
      };
      const sqsEvent = { Records: [{ messageId: 'msg1', body: JSON.stringify(validS3Event) }] };
      await expect(module.sourceLambdaHandler(sqsEvent)).rejects.toThrow('Replay needed');
    });

    it('sourceLambdaHandler processes event when bucket offset is up-to-date', async () => {
      const module = await import('@src/lib/main.js');
      vi.spyOn(module, 'readLastOffsetProcessedFromOffsetsTableById')
        .mockImplementation(async (id) => {
          if (id === process.env.REPLAY_QUEUE_URL) {
            return { timestamp: "2025-03-18T22:00:00Z", key: "file.json", versionId: "v1" };
          } else {
            return { timestamp: "2025-03-18T23:00:00Z", key: "file.json", versionId: "v2" };
          }
        });
      vi.spyOn(module, 'createProjections').mockResolvedValue({ dummy: 'digest' });
      vi.spyOn(module, 'sendToSqs').mockResolvedValue();

      const validS3Event = {
        Records: [{
          eventVersion: "2.0",
          eventSource: "aws:s3",
          eventTime: '2025-03-17T12:00:00Z',
          eventName: "ObjectCreated:Put",
          s3: {
            bucket: { name: process.env.BUCKET_NAME },
            object: { key: 'events/test.json', versionId: 'v123' }
          }
        }]
      };
      const sqsEvent = { Records: [{ messageId: 'msg1', body: JSON.stringify(validS3Event) }] };
      const result = await module.sourceLambdaHandler(sqsEvent);
      expect(result).toHaveProperty('handler', 'src/lib/main.sourceLambdaHandler');
      expect(result.batchItemFailures).toEqual([]);
    });
  });

  describe.skip('Replay Functionality', () => {
    it('replay returns correct result when no versions are found', async () => {
      const module = await import('@src/lib/main.js');
      vi.spyOn(module, 'listAllObjectVersionsOldestFirst').mockResolvedValue([]);
      const result = await module.replay();
      expect(result.versions).toEqual(0);
      expect(result.eventsReplayed).toEqual(0);
      expect(result.lastOffsetProcessed.note).toContain('No versions found to replay');
    });

    it('replayBatchLambdaHandler returns proper response', async () => {
      const module = await import('@src/lib/main.js');
      vi.spyOn(module, 'replay').mockResolvedValue({
        versions: 1,
        eventsReplayed: 1,
        lastOffsetProcessed: { timestamp: 'dummy-offset', key: 'dummy', versionId: 'dummy' }
      });
      const event = {};
      const result = await module.replayBatchLambdaHandler(event);
      expect(result).toEqual({
        handler: "src/lib/main.replayBatchLambdaHandler",
        versions: 1,
        eventsReplayed: 1,
        lastOffsetProcessed: { timestamp: 'dummy-offset', key: 'dummy', versionId: 'dummy' }
      });
    });
  });

  describe.skip('Replay Lambda Handler Error Handling', () => {
    it('replayLambdaHandler returns batchItemFailures for failed records', async () => {
      const module = await import('@src/lib/main.js');
      let callCount = 0;
      vi.spyOn(module, 'createProjections').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) throw new Error('Test error');
        return { dummy: 'digest' };
      });
      const sqsEvent = {
        Records: [
          { messageId: 'msg1', body: JSON.stringify({ Records: [{ eventName: "ObjectCreated:Put", s3: { bucket: { name: process.env.BUCKET_NAME }, object: { key: 'events/test1.json', versionId: 'v1' } } }] }) },
          { messageId: 'msg2', body: JSON.stringify({ Records: [{ eventName: "ObjectCreated:Put", s3: { bucket: { name: process.env.BUCKET_NAME }, object: { key: 'events/test2.json', versionId: 'v2' } } }] }) }
        ]
      };
      const result = await module.replayLambdaHandler(sqsEvent);
      expect(result).toHaveProperty('handler', 'src/lib/main.replayLambdaHandler');
      expect(result.batchItemFailures).toEqual([{ itemIdentifier: 'msg1' }]);
    });
  });
});
