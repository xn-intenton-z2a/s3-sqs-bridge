#!/bin/sh
set -e

echo "Container starting with arguments: $@"
if [ "$#" -eq 0 ]; then
  echo "No arguments provided. Defaulting to npm start."
  exec npm start
else
  exec "$@"
fi
