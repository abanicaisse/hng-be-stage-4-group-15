#!/bin/bash

# Deployment script for Notification System
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_DIR="/opt/notification-system"
DOCKER_USERNAME="your-docker-username"
IMAGE_NAME="notification-system"

echo "🚀 Starting deployment for $ENVIRONMENT environment..."

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

# Navigate to project directory
cd $PROJECT_DIR || {
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
}

# Pull latest code
print_status "Pulling latest code from repository..."
git pull origin deployment || {
    print_error "Failed to pull latest code"
    exit 1
}

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
    print_status "Environment variables loaded"
else
    print_warning "Environment file not found: .env.$ENVIRONMENT"
fi

# Pull latest Docker image
print_status "Pulling latest Docker image..."
docker pull $DOCKER_USERNAME/$IMAGE_NAME:latest || {
    print_error "Failed to pull Docker image"
    exit 1
}

# Backup database
print_status "Creating database backup..."
BACKUP_FILE="backups/db_backup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p backups
docker-compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_FILE || {
    print_warning "Database backup failed, but continuing deployment..."
}

# Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm notification-services \
    pnpm run prisma:deploy || {
    print_error "Database migration failed"
    exit 1
}

# Restart services with zero downtime
print_status "Restarting services..."
docker-compose -f docker-compose.prod.yml up -d --no-deps --build notification-services

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Health check
print_status "Running health checks..."
HEALTH_CHECK_URL="http://localhost:3000/health"
for i in {1..10}; do
    if curl -f -s $HEALTH_CHECK_URL > /dev/null; then
        print_status "Health check passed!"
        break
    fi
    if [ $i -eq 10 ]; then
        print_error "Health check failed after 10 attempts"
        
        # Rollback
        print_warning "Rolling back to previous version..."
        docker-compose -f docker-compose.prod.yml down
        docker-compose -f docker-compose.prod.yml up -d
        exit 1
    fi
    echo "Waiting for services to be ready... ($i/10)"
    sleep 5
done

# Clean up old Docker images
print_status "Cleaning up old Docker images..."
docker image prune -af --filter "until=24h"

# Show running containers
print_status "Current running containers:"
docker-compose -f docker-compose.prod.yml ps

print_status "Deployment completed successfully! 🎉"
echo ""
echo "Service URLs:"
echo "  - API Gateway: http://localhost:3000"
echo "  - API Documentation: http://localhost:3000/api/docs"
echo "  - RabbitMQ Management: http://localhost:15672"
echo ""
