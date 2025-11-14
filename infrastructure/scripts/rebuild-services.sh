#!/bin/bash

# Script to rebuild and restart services after code changes
# Run this on the server when you update the code

set -e

echo "🔄 Rebuilding Notification Services..."

# Navigate to project directory
cd /opt/notification-system/hng-be-stage-4-group-15 || {
    echo "❌ Project directory not found"
    exit 1
}

# Pull latest changes
echo "📥 Pulling latest changes from deployment branch..."
git pull origin deployment

# Stop running services
echo "🛑 Stopping services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down notification-services || true

# Rebuild the Docker image (this rebuilds the application)
echo "🏗️  Building Docker image..."
docker-compose -f docker-compose.prod.yml --env-file .env.production build notification-services

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Show service status
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

# Show recent logs
echo ""
echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50 notification-services

# Check health
echo ""
echo "🏥 Health Check:"
sleep 5
curl -f http://localhost:3000/health || echo "⚠️  API Gateway health check failed"

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "To view live logs, run:"
echo "docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f notification-services"
