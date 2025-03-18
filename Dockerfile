FROM node:20.6.0-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production
COPY src/ src/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create a non-root user and switch to it.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENTRYPOINT ["/entrypoint.sh"]
