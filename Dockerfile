###############################
# Stage 1: Consumer App Build
###############################
FROM node:20-alpine AS consumer-builder
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy consumer application source code
RUN mkdir -p src/lib
COPY src/lib/main.js src/lib/

###############################
# Stage 2: Apache Kafka CLI tools
###############################
#FROM eclipse-temurin:17-alpine AS kafka-builder

# Kafka version (adjust as needed)
#ARG KAFKA_VERSION=3.9.0
#ARG SCALA_VERSION=2.13

# Install wget to download Kafka
#RUN apk update && apk add --no-cache wget bash

# Download and extract Kafka
#RUN wget "https://downloads.apache.org/kafka/${KAFKA_VERSION?}/kafka_${SCALA_VERSION?}-${KAFKA_VERSION?}.tgz" \
#    && tar -xzf kafka_${SCALA_VERSION?}-${KAFKA_VERSION?}.tgz -C /opt \
#    && mv /opt/kafka_${SCALA_VERSION?}-${KAFKA_VERSION?} /opt/kafka

# Keep only bin and libs (minimal required Kafka CLI files)
#RUN mkdir -p /kafka \
#    && cp -r /opt/kafka/bin /kafka/bin \
#    && cp -r /opt/kafka/libs /kafka/libs \
#    && cp -r /opt/kafka/config /kafka/config

###############################
# Stage 3: Broker Binary
###############################
FROM ghcr.io/tansu-io/tansu:0.2.2 AS broker

###############################
# Stage 4: Final Runtime Image
###############################
FROM node:20-alpine

# Add Node.js runtime for the consumer app
RUN apk update && apk add --no-cache nodejs npm bash

# Copy Consumer app
COPY --from=consumer-builder /app /app

# Copy Kafka CLI tools (bin & libs)
#COPY --from=kafka-builder /kafka /opt/kafka

# Add Kafka bin directory to PATH
#ENV PATH="/opt/kafka/bin:${PATH}"

# Verify Kafka tools are available (for build-time confirmation)
#RUN kafka-topics.sh --version

# Copy tansu-server binary from broker stage
COPY --from=broker /tansu-server /tansu-server
RUN chmod +x /tansu-server

# Copy entrypoint script (assumed to be in your context)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Working directory
WORKDIR /app

# tansu-server and consumer app environment variables
ENV LISTENER_URL=tcp://0.0.0.0:9092
ENV ADVERTISED_LISTENER_URL=tcp://localhost:9092
ENV BROKER_URL=localhost:9092

# Expose consumer HTTP port
EXPOSE 8080

# Start broker and consumer via entrypoint
ENTRYPOINT ["/entrypoint.sh"]
