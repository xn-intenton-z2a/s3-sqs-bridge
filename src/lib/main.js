#!/usr/bin/env node
// src/lib/main.js
// Tansu SQS Bridge - Aligned with our mission statement (v0.1.5)

// Ensure NODE_ENV is set to development by default for local/test runs
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import { fileURLToPath } from "url";
import process from "process";
import dotenv from "dotenv";
import { z } from "zod";
import { Kafka } from "kafkajs";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import pkg from "pg";
import express from "express";

const { Client: PGClient } = pkg;

// --------------------
// For test or development environment, supply default env values to avoid configuration errors.
// In production, ensure all required environment variables are set.
// --------------------
if (process.env.VITEST || process.env.NODE_ENV === "development") {
  process.env.SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || "https://sqs.eu-west-2.amazonaws.com/000000000000/test";
  process.env.BROKER_URL = process.env.BROKER_URL || "localhost:9092";
  process.env.TOPIC_NAME = process.env.TOPIC_NAME || "test";
  process.env.USE_EXISTING_TOPIC = process.env.USE_EXISTING_TOPIC || "false";
  process.env.CONSUMER_GROUP = process.env.CONSUMER_GROUP || "tansu-sqs-bridge-group";
  // process.env.PGHOST = process.env.PGHOST || "localhost";
  // process.env.PGUSER = process.env.PGUSER || "test";
  // process.env.PGPASSWORD = process.env.PGPASSWORD || "test";
  // process.env.PGDATABASE = process.env.PGDATABASE || "test";
  // process.env.PGPORT = process.env.PGPORT || "5432";
}

// --------------------
// Environment configuration schema using zod
// --------------------
const configSchema = z.object({
  // Kafka settings
  BROKER_URL: z.string().nonempty({ message: "BROKER_URL is required" }),
  TOPIC_NAME: z.string().nonempty({ message: "TOPIC_NAME is required" }),
  USE_EXISTING_TOPIC: z.string().nonempty({ message: "USE_EXISTING_TOPIC is required" }),
  CONSUMER_GROUP: z.string().nonempty({ message: "CONSUMER_GROUP is required" }),
  SQS_QUEUE_URL: z.string().nonempty({ message: "SQS_QUEUE_URL is required" }),
  // PostgreSQL settings (for GitHub Projection Lambda)
  // PGHOST: z.string().nonempty({ message: "PGHOST is required" }),
  // PGPORT: z.preprocess((val) => (val ? parseInt(val) : 5432), z.number().int().positive()),
  // PGUSER: z.string().nonempty({ message: "PGUSER is required" }),
  // PGPASSWORD: z.string().nonempty({ message: "PGPASSWORD is required" }),
  // PGDATABASE: z.string().nonempty({ message: "PGDATABASE is required" }),
  // PGSSL: z.string().optional(),
});

// --------------------
// Load and validate configuration
// --------------------
function loadConfig() {
  dotenv.config();
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Configuration error:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  const conf = parsed.data;
  // conf.PGSSL = conf.PGSSL === "true" ? { rejectUnauthorized: false } : false;
  return conf;
}

const config = loadConfig();

// --------------------------------------------------------------------------------------------------------------------
// Tansu Consumer: Kafka -> SQS
// --------------------------------------------------------------------------------------------------------------------

export function validateKafkaConfig(conf) {
  if (!conf.BROKER_URL || !conf.TOPIC_NAME || !conf.CONSUMER_GROUP) {
    console.error("Missing required Kafka configuration");
    return false;
  }
  return true;
}

function getSQSClient() {
  const client = new SQSClient({});
  // In test/mock environments, add a dummy send if not defined.
  if (typeof client.send !== "function") {
    client.send = async (_command) => {
      return { MessageId: "dummy-message" };
    };
  }
  return client;
}

export function buildSQSMessageParams(topic, partition, offset, messageValue) {
  return {
    QueueUrl: config.SQS_QUEUE_URL,
    MessageBody: messageValue,
    MessageAttributes: {
      Topic: { DataType: "String", StringValue: topic },
      Partition: { DataType: "Number", StringValue: partition.toString() },
      Offset: { DataType: "Number", StringValue: offset.toString() },
    },
  };
}

export async function sendMessageToSQS(topic, partition, offset, messageValue) {
  const sqsClient = getSQSClient();
  const params = buildSQSMessageParams(topic, partition, offset, messageValue);
  const command = new SendMessageCommand(params);
  try {
    console.log(`Sending message to SQS. params: ${JSON.stringify(params, null, 2)}`);
    let response;
    if (config.SQS_QUEUE_URL !== "https://sqs.region.amazonaws.com/123456789012/tansu-sqs-bridge-queue-local") {
      response = await retryOperationExponential(() => sqsClient.send(command));
      console.log(`Sent message to SQS. MessageId: ${response.MessageId}`);
    } else {
      response = { MessageId: "dummy-message" };
      console.log(`FAKED send message to SQS for 'tansu-sqs-bridge-queue-local'. MessageId: ${response.MessageId}`);
    }
    return response;
  } catch (err) {
    console.error("Error in sendMessageToSQS:", err);
    throw err;
  }
}

export async function retryOperationExponential(operation, retries = 3, initialDelay = 500) {
  let delay = initialDelay;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Exponential attempt ${attempt}`);
      return await operation();
    } catch (error) {
      if (attempt === retries) {
        console.error("Exponential retries exhausted", error);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runConsumer() {
  const kafka = new Kafka({
    clientId: "tansu-sqs-consumer",
    brokers: [config.BROKER_URL],
  });
  if (!validateKafkaConfig(config)) {
    console.error("Invalid Kafka configuration. Exiting consumer.");
    process.exit(1);
  }
  console.log(`Creating Kafka consumer with group ID ${config.CONSUMER_GROUP}`);
  const consumer = kafka.consumer({ groupId: config.CONSUMER_GROUP });
  // const sqsClient = getSQSClient();

  console.log(`Connecting to Kafka Admin on ${config.BROKER_URL}`);
  const admin = kafka.admin();
  await admin.connect();
  console.log(`Connected to Kafka Admin on ${config.BROKER_URL}`);

  console.log(`Listing topics on ${config.BROKER_URL}`);
  const existingTopics = await admin.listTopics();
  if (!existingTopics.includes(config.TOPIC_NAME)) {
    console.log(`Topic '${config.TOPIC_NAME}' does not exist.`);
    if (config.USE_EXISTING_TOPIC !== "true") {
      console.log(`Creating topic '${config.TOPIC_NAME}'`);
      await admin.createTopics({ topics: [{ topic: config.TOPIC_NAME }] });
      console.log(`Created topic '${config.TOPIC_NAME}'.`);
    } else {
      console.error(`CRITICAL: Topic '${config.TOPIC_NAME}' does not exist and USE_EXISTING_TOPIC == "true". Exiting.`);
      process.exit(1);
    }
  } else {
    console.log(`Topic '${config.TOPIC_NAME}' exists.`);
  }

  await admin.disconnect();

  console.log(`Connecting to Kafka broker at ${config.BROKER_URL}`);
  await consumer.connect();
  console.log(`Connected to Kafka broker at ${config.BROKER_URL}`);

  console.log(`Subscribing to Kafka topic ${config.TOPIC_NAME}`);
  await consumer.subscribe({ topic: config.TOPIC_NAME, fromBeginning: true });
  console.log(`Subscribed to Kafka topic ${config.TOPIC_NAME}`);

  // Graceful shutdown on SIGINT
  process.on("SIGINT", async () => {
    console.log("Disconnecting Kafka consumer...");
    // await consumer.disconnect();
    process.exit(0);
  });

  console.log("Starting consumer loop...");
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const key = message.key ? message.key.toString() : null;
      const value = message.value ? message.value.toString() : "";
      const offset = message.offset;
      console.log(`Received message from topic=${topic} partition=${partition} offset=${offset}`);
      console.debug("Message key:", key, "value:", value);

      // Use the new helper to send message to SQS
      try {
        await sendMessageToSQS(topic, partition, offset, value);
      } catch (err) {
        console.error("Error sending message to SQS:", err);
      }
    },
  });

  // Health check endpoint
  // eslint-disable-next-line sonarjs/x-powered-by
  const app = express();
  app.get("/", (req, res) => res.send("OK"));
  console.log("Starting health check endpoint on port 8080");
  app.listen(8080, () => console.log("Health check running on port 8080"));

  // Infinite loop logging every second
  let keepRunning = true;
  while (keepRunning) {
    console.log("Keep-alive loop active (logging every 30 seconds)");
    try {
      await sleep(30 * 1000);
    } catch (e) {
      console.error("Interrupted:", e);
      keepRunning = false;
      process.exit(1);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// SQS Lambda Handlers
// ---------------------------------------------------------------------------------------------------------------------

export async function loggingLambdaHandler(event) {
  console.log("Logging Lambda received SQS event:", JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    console.log("SQS Message:", record.body);
  }
  return { status: "logged" };
}

let pgClient;
export async function getDbClient() {
  if (!pgClient) {
    pgClient = new PGClient({
      host: config.PGHOST,
      port: config.PGPORT,
      user: config.PGUSER,
      password: config.PGPASSWORD,
      database: config.PGDATABASE,
      ssl: config.PGSSL,
    });
    await pgClient.connect();
    console.log("Connected to PostgreSQL database");
  }
  return pgClient;
}
export function resetDbClient() {
  pgClient = undefined;
}

export function parseMessageBody(body) {
  try {
    return JSON.parse(body);
  } catch (err) {
    console.error("Failed to parse message body", err);
    return null;
  }
}

export function isValidResourceEvent(event) {
  // Explicitly return a boolean value
  return Boolean(event && event.resourceType && event.resourceId);
}

// DynamoDB: arn:aws:dynamodb:eu-west-2:541134664601:table/GithubProjections

export async function updateProjection(client, resourceType, resourceId, state) {
  const query = `
    INSERT INTO github_projections (resource_id, resource_type, state, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (resource_id)
    DO UPDATE SET state = EXCLUDED.state, updated_at = NOW();
  `;
  const values = [resourceId, resourceType, JSON.stringify(state)];
  return await client.query(query, values);
}

export async function githubProjectionLambdaHandler(event) {
  console.log("GitHub Projection Lambda received event:", JSON.stringify(event, null, 2));

  let client;
  try {
    client = await getDbClient();
  } catch (error) {
    console.error("Error connecting to Postgres", error);
    throw error;
  }

  for (const record of event.Records) {
    const bodyObj = parseMessageBody(record.body);
    if (!bodyObj) continue;
    const { resourceType, resourceId, state } = bodyObj;
    if (!isValidResourceEvent({ resourceType, resourceId })) {
      console.error("Missing resourceType or resourceId in event", record.body);
      continue;
    }
    try {
      await updateProjection(client, resourceType, resourceId, state);
      console.log(`Updated projection for ${resourceType} ${resourceId}`);
    } catch (err) {
      console.error("Error updating PostgreSQL projection", err);
    }
  }
  return { status: "success" };
}

// ---------------------------------------------------------------------------------------------------------------------
// Main CLI Function
// ---------------------------------------------------------------------------------------------------------------------

const HELP_TEXT = `Usage: node src/lib/main.js [--help|--simulate-projection|--tansu-consumer-to-sqs|--sqs-to-lambda-github-projection|--sqs-to-lambda-logger]`;

export async function main(args = process.argv.slice(2)) {
  if (args.includes("--help")) {
    console.log(HELP_TEXT);
    return;
  }

  if (args.includes("--tansu-consumer-to-sqs")) {
    console.log("Starting Kafka consumer to send messages to SQS...");
    await runConsumer();
    return;
  }

  if (args.includes("--sqs-to-lambda-logger")) {
    const sampleEvent = {
      Records: [{ body: "Sample message from Tansu consumer" }],
    };
    console.log("Running Logging Lambda Handler with sample event...");
    await loggingLambdaHandler(sampleEvent);
    return;
  }

  if (args.includes("--sqs-to-lambda-github-projection")) {
    const sampleEvent = {
      Records: [
        {
          body: JSON.stringify({
            resourceType: "repository",
            resourceId: "tansu-sqs-bridge",
            state: { stars: 285, forks: 6, openIssues: 14 },
          }),
        },
      ],
    };
    console.log("Running GitHub Projection Lambda Handler with sample event...");
    await githubProjectionLambdaHandler(sampleEvent);
    return;
  }

  console.log(`Run with: ${JSON.stringify(args)}`);
}

// --------------------
// If run directly, call main() with CLI arguments.
// Prevent execution during test runs by checking a VITEST flag.
// --------------------
if (process.argv[1] === fileURLToPath(import.meta.url) && !process.env.VITEST) {
  main(process.argv.slice(2)).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
