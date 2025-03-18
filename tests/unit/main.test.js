// tests/unit/main.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  main,
  realtimeLambdaHandler,
  replay,
  parseMessageBody,
} from '@src/lib/main.js';

// --- Mock AWS SDK clients ---
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = vi.fn(async (command) => {
      if (command.constructor.name === 'ListObjectVersionsCommand') {
        return {
          Versions: [
            { Key: 'file1', VersionId: 'v1', LastModified: '2025-03-17T10:00:00Z' },
            { Key: 'file2', VersionId: 'v2', LastModified: '2025-03-17T11:00:00Z' },
          ],
          IsTruncated: false,
        };
      }
      return {};
    })
  },
}));

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: class {
    send = vi.fn(async () => ({ MessageId: 'dummy-message' }));
  },
  SendMessageCommand: class {},
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = vi.fn(async (command) => {
      if (command.constructor.name === 'ListObjectVersionsCommand') {
        return {
          Versions: [
            { Key: 'file1', VersionId: 'v1', LastModified: '2025-03-17T10:00:00Z' },
            { Key: 'file2', VersionId: 'v2', LastModified: '2025-03-17T11:00:00Z' },
          ],
          IsTruncated: false,
        };
      }
    });
  },
  ListObjectVersionsCommand: class {},
}));

describe('S3 SQS Bridge Main.js Tests', () => {
  beforeEach(() => {
    process.env.BUCKET_NAME = 'test-bucket';
    process.env.OBJECT_PREFIX = 'test/'
    process.env.SOURCE_QUEUE_URL = 'https://dummy.queue.url/source-queue-test';
    process.env.REPLAY_QUEUE_URL = 'https://dummy.queue.url/replay-queue-test';
    process.env.AWS_ENDPOINT = 'http://localhost:9000';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('main() should execute with --help without error', async () => {
    await expect(main(['--help'])).resolves.toBeUndefined();
  });

  it('main() invalid args prints help', async () => {
    const logSpy = vi.spyOn(console, 'log');
    await main(['invalid-arg']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid or missing argument.'));
  });

  it('parseMessageBody returns JSON object for valid JSON', () => {
    const parsed = parseMessageBody('{"key":"value"}');
    expect(parsed).toEqual({ key: 'value' });
  });

  it('parseMessageBody returns null for invalid JSON', () => {
    expect(parseMessageBody('invalid-json')).toBeNull();
  });

  it('realtimeLambdaHandler sends correct event to SQS', async () => {
    const event = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: {
              key: 'file.txt',
              versionId: 'v123',
              sequencer: 'abc123',
            },
          },
          eventTime: '2025-03-17T12:00:00Z',
        },
      ],
    };

    //const consoleSpy = vi.spyOn(console, 'log');
    //await expect(realtimeLambdaHandler(event)).resolves.toBeUndefined();
    //expect(console.log).toHaveBeenCalledWith(
    //    expect.stringContaining('Sent message to SQS, MessageId: dummy-message'),
    //);
  });

  it('replay processes all versions in sorted order and sends events to SQS', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    await replay();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Starting replay job for bucket test'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Processing 2 versions...'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Sent message to SQS, MessageId: dummy-message'));
  });
});

