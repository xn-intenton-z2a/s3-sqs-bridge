// tests/unit/main.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  replayLambdaHandler,
  s3,
  dynamodb
} from "../../src/lib/main.js";

// --- Mock AWS SDK Clients ---

vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class {
      send = vi.fn(async (command) => {
        if (command.constructor.name === "ListObjectVersionsCommand") {
          return {
            Versions: [
              { Key: "file1.json", VersionId: "v1", LastModified: "2025-03-17T10:00:00Z" },
              { Key: "file2.json", VersionId: "v2", LastModified: "2025-03-17T11:00:00Z" }
            ],
            IsTruncated: false
          };
        }
        if (command.constructor.name === "GetObjectCommand") {
          return {
            Body: {
              on: (event, callback) => {
                if (event === "end") callback();
              }
            },
            LastModified: new Date("2025-03-17T12:00:00Z")
          };
        }
        return {};
      });
    },
    ListObjectVersionsCommand: class {},
    GetObjectCommand: class {}
  };
});

vi.mock("@aws-sdk/client-sqs", () => {
  return {
    SQSClient: class {
      send = vi.fn(async (command) => {
        return { MessageId: "dummy-message" };
      });
    },
    SendMessageCommand: class {}
  };
});

vi.mock("@aws-sdk/client-dynamodb", () => {
  return {
    DynamoDBClient: class {
      send = vi.fn();
    },
    ScanCommand: class {},
    GetItemCommand: class {},
    PutItemCommand: class {}
  };
});

// --- Tests Start Here ---

describe("S3 SQS Bridge Main.js Tests", () => {
  beforeEach(() => {
    process.env.BUCKET_NAME = "test-bucket";
    process.env.OBJECT_PREFIX = "events/";
    process.env.REPLAY_QUEUE_URL = "https://test/000000000000/s3-sqs-bridge-replay-queue-test";
    process.env.DIGEST_QUEUE_URL = "https://test/000000000000/s3-sqs-bridge-digest-queue-test";
    process.env.OFFSETS_TABLE_NAME = "dummy-offsets";
    process.env.PROJECTIONS_TABLE_NAME = "dummy-projections";
    process.env.AWS_ENDPOINT = "https://localhost:4566";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Utility Functions", () => {
    it("buildSQSMessageParams returns correct message parameters", () => {
      const event = { test: "data" };
      const params = buildSQSMessageParams(event, process.env.REPLAY_QUEUE_URL);
      expect(params).toEqual({
        QueueUrl: process.env.REPLAY_QUEUE_URL,
        MessageBody: JSON.stringify(event)
      });
    });
  });

  describe("retryOperationExponential", () => {
    it("retries an operation until success", async () => {
      let attempts = 0;
      const op = async () => {
        attempts++;
        if (attempts < 3) throw new Error("fail");
        return "success";
      };
      const result = await retryOperationExponential(op, 5, 10);
      expect(result).toEqual("success");
      expect(attempts).toEqual(3);
    });

    it("throws an error after max retries are reached", async () => {
      const op = async () => {
        throw new Error("always fail");
      };
      await expect(retryOperationExponential(op, 2, 10)).rejects.toThrow("always fail");
    });
  });

  describe("List Object Versions Functions", () => {
    it("listAndSortAllObjectVersions returns versions sorted ascending by LastModified", async () => {
      const versions = await listAndSortAllObjectVersions();
      expect(versions).toBeInstanceOf(Array);
      for (let i = 1; i < versions.length; i++) {
        expect(new Date(versions[i].LastModified).getTime()).toBeGreaterThanOrEqual(
          new Date(versions[i - 1].LastModified).getTime()
        );
      }
    });

    it("listAllObjectVersionsOldestFirst merges versions across keys in proper upload order", async () => {
      const mockVersions = [
        { Key: "events/1.json", VersionId: "v1", LastModified: "2025-03-17T10:00:00Z" },
        { Key: "events/1.json", VersionId: "v2", LastModified: "2025-03-17T10:05:00Z" },
        { Key: "events/2.json", VersionId: "v3", LastModified: "2025-03-17T10:02:00Z" },
        { Key: "events/2.json", VersionId: "v4", LastModified: "2025-03-17T10:06:00Z" }
      ];
      // Override the global s3.send method to use our mockVersions
      s3.send = vi.fn(async (command) => {
        return { Versions: mockVersions, IsTruncated: false };
      });
      const merged = await listAllObjectVersionsOldestFirst();
      expect(merged[0].VersionId).toEqual("v1");
      expect(merged[1].VersionId).toEqual("v3");
      expect(merged[2].VersionId).toEqual("v2");
      expect(merged[3].VersionId).toEqual("v4");
    });
  });

  describe("SQS Interaction", () => {
    it("sendToSqs sends event and logs success with default queue url", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const event = { test: "data" };
      await sendToSqs(event);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Sent message to SQS queue https://test/000000000000/s3-sqs-bridge-replay-queue-test")
      );
    });
  });

  describe("Main CLI Entry Point", () => {
    it("--help prints usage information", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      await main(["--help"]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    });

    it('No arguments prints "No command argument supplied."', async () => {
      const consoleSpy = vi.spyOn(console, "log");
      await main([]);
      expect(consoleSpy).toHaveBeenCalledWith("No command argument supplied.");
    });

    it("--healthcheck starts the health check server", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      main(["--healthcheck"]);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Healthcheck available at"));
    });
  });
});

describe("Additional Unit Tests for main.js", () => {
  beforeEach(() => {
    process.env.BUCKET_NAME = "s3-sqs-bridge-bucket-test";
    process.env.OBJECT_PREFIX = "events/";
    process.env.REPLAY_QUEUE_URL = "https://test/000000000000/s3-sqs-bridge-replay-queue-test";
    process.env.DIGEST_QUEUE_URL = "https://test/000000000000/s3-sqs-bridge-digest-queue-test";
    process.env.OFFSETS_TABLE_NAME = "s3-sqs-bridge-offsets-table-test";
    process.env.PROJECTIONS_TABLE_NAME = "s3-sqs-bridge-projections-table-test";
    process.env.AWS_ENDPOINT = "https://test";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("S3 and SQS Event Creation", () => {
    it("createS3EventFromVersion returns correctly structured S3 event", () => {
      const versionMetadata = {
        key: "events/test.json",
        versionId: "v123",
        lastModified: "2025-03-17T12:00:00Z"
      };
      const event = createS3EventFromVersion(versionMetadata);
      expect(event).toEqual({
        Records: [
          {
            eventVersion: "2.0",
            eventSource: "aws:s3",
            eventTime: "2025-03-17T12:00:00Z",
            eventName: "ObjectCreated:Put",
            s3: {
              s3SchemaVersion: "1.0",
              bucket: {
                name: process.env.BUCKET_NAME,
                arn: "arn:aws:s3:::" + process.env.BUCKET_NAME
              },
              object: {
                key: "events/test.json",
                versionId: "v123"
              }
            }
          }
        ]
      });
    });

    it("createSQSEventFromS3Event returns correctly structured SQS event", () => {
      const s3Event = {
        Records: [
          {
            eventVersion: "2.0",
            eventSource: "aws:s3",
            eventTime: "2025-03-17T12:00:00Z",
            eventName: "ObjectCreated:Put",
            s3: {
              s3SchemaVersion: "1.0",
              bucket: {
                name: process.env.BUCKET_NAME,
                arn: "arn:aws:s3:::" + process.env.BUCKET_NAME
              },
              object: {
                key: "events/test.json",
                versionId: "v123"
              }
            }
          }
        ]
      };
      const sqsEvent = createSQSEventFromS3Event(s3Event);
      expect(sqsEvent).toHaveProperty("Records");
      expect(sqsEvent.Records[0]).toHaveProperty("eventSource", "aws:sqs");
      expect(sqsEvent.Records[0]).toHaveProperty("body", JSON.stringify(s3Event));
    });
  });

  describe("Projection Creation", () => {
    it("createProjections throws error for unsupported event names", async () => {
      const invalidEvent = {
        Records: [
          {
            eventVersion: "2.0",
            eventSource: "aws:s3",
            eventTime: "2025-03-17T12:00:00Z",
            eventName: "Delete",
            s3: {}
          }
        ]
      };
      await expect(createProjections(invalidEvent)).rejects.toThrow("Unsupported event name");
    });
  });

  // ---- New Edge Case Handling Tests ----

  describe("Edge Case Handling", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("getProjectionIdsMap handles pagination correctly", async () => {
      // Simulate DynamoDB Scan responses with pagination
      let callCount = 0;
      const fakeSend = vi.fn(async (command) => {
        callCount++;
        if (callCount === 1) {
          return {
            Items: [{ id: { S: "1" } }, { id: { S: "2" } }],
            LastEvaluatedKey: { id: { S: "2" } }
          };
        } else {
          return {
            Items: [{ id: { S: "3" } }]
          };
        }
      });
      vi.spyOn(dynamodb, "send").mockImplementation(fakeSend);
      const result = await getProjectionIdsMap();
      expect(result).toEqual({
        1: { id: "1" },
        2: { id: "2" },
        3: { id: "3" }
      });
      expect(fakeSend).toHaveBeenCalledTimes(2);
    });

    it("sourceLambdaHandler throws error when bucket offset is behind replay queue offset", async () => {
      // Setup mocks for readLastOffsetProcessedFromOffsetsTableById to simulate offset mismatch
      const mainModule = await import("../../src/lib/main.js");
      const readSpy = vi.spyOn(mainModule, "readLastOffsetProcessedFromOffsetsTableById");
      // First call returns replay queue offset, second returns bucket offset
      readSpy.mockImplementation((id) => {
        if (id === process.env.REPLAY_QUEUE_URL) {
          return Promise.resolve("2025-04-07T02:53:24.000Z");
        } else {
          return Promise.resolve("2025-04-07T02:53:23.500Z");
        }
      });

      const sqsEvent = {
        Records: [
          {
            body: JSON.stringify(
              createS3EventFromVersion({
                key: "events/test.json",
                versionId: "v123",
                lastModified: "2025-03-17T12:00:00Z"
              })
            ),
            messageId: "msg1"
          }
        ]
      };
      await expect(sourceLambdaHandler(sqsEvent)).rejects.toThrow("Replay needed");
    });

    it("replayLambdaHandler returns batchItemFailures when processing errors occur", async () => {
      // Force createProjections to throw an error for each record
      const mainModule = await import("../../src/lib/main.js");
      vi.spyOn(mainModule, "createProjections").mockImplementation(() => {
        throw new Error("Test error");
      });

      const sqsEvent = {
        Records: [
          {
            body: JSON.stringify({
              Records: [{ eventName: "ObjectCreated:Put", s3: { object: { key: "test.json", versionId: "v1" } } }]
            }),
            messageId: "msg1"
          }
        ]
      };

      const result = await replayLambdaHandler(sqsEvent);
      expect(result).toHaveProperty("handler", "src/lib/main.replayLambdaHandler");
      expect(result.batchItemFailures).toEqual([{ itemIdentifier: "msg1" }]);
    });
  });
});
