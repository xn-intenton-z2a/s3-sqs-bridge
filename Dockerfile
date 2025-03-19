FROM public.ecr.aws/lambda/nodejs:20

WORKDIR /var/task

COPY package.json package-lock.json ./
RUN npm install --production
COPY src/ src/

ARG HANDLER=src/lib/main.replayBatchLambdaHandler
ENV HANDLER=$HANDLER

# Use shell form so the environment variable gets expanded.
CMD sh -c "exec $HANDLER"

ENTRYPOINT /lambda-entrypoint.sh $HANDLER
