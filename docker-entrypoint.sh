#!/bin/sh
set -e

echo "Fixing permissions for logs directory..."
mkdir -p /app/logs /app/data
chown -R node:node /app/logs /app/data 2>/dev/null || true

echo "Starting services as node user..."
exec su-exec node "$@"
