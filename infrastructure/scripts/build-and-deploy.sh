#!/usr/bin/env bash

# ============================================================================
# Build and Deploy Script for Notification System
# ============================================================================
# This script handles the complete build and deployment process:
# 1. Stops and removes old containers
# 2. Rebuilds the Docker image with proper caching
# 3. Starts all services
# 4. Waits for services to be healthy
# 5. Shows logs and status
# ============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PROJECT_NAME="notification-system"
TIMEOUT=300  # 5 minutes timeout for health checks

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    log_success "Docker is installed and running"
}

check_env_file() {
    if [ ! -f .env.production ]; then
        log_error ".env.production file not found"
        log_info "Please create .env.production file with all required environment variables"
        exit 1
    fi
    log_success ".env.production file found"
}

cleanup_old_containers() {
    log_info "Stopping and removing old containers..."
    
    if docker-compose -f "$COMPOSE_FILE" ps -q 2>/dev/null | grep -q .; then
        docker-compose -f "$COMPOSE_FILE" down --remove-orphans || true
        log_success "Old containers removed"
    else
        log_info "No existing containers to remove"
    fi
}

cleanup_old_images() {
    log_info "Removing old dangling images..."
    docker image prune -f || true
    log_success "Dangling images removed"
}

build_images() {
    log_info "Building Docker images (this may take several minutes)..."
    
    # Build with no cache for clean build
    if [ "${NO_CACHE:-false}" = "true" ]; then
        log_warning "Building with --no-cache (slower but guaranteed fresh build)"
        docker-compose -f "$COMPOSE_FILE" build --no-cache --progress=plain
    else
        log_info "Building with cache (faster)"
        docker-compose -f "$COMPOSE_FILE" build --progress=plain
    fi
    
    log_success "Images built successfully"
}

start_services() {
    log_info "Starting all services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    log_success "Services started"
}

wait_for_health() {
    log_info "Waiting for services to be healthy (timeout: ${TIMEOUT}s)..."
    
    local start_time=$(date +%s)
    local services=("postgres" "redis" "rabbitmq" "notification-services")
    
    while true; do
        local all_healthy=true
        
        for service in "${services[@]}"; do
            local health_status=$(docker-compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -o "healthy" || echo "unhealthy")
            
            if [ "$health_status" != "healthy" ]; then
                all_healthy=false
                log_warning "$service is not healthy yet..."
            fi
        done
        
        if [ "$all_healthy" = true ]; then
            log_success "All services are healthy!"
            return 0
        fi
        
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $TIMEOUT ]; then
            log_error "Timeout waiting for services to be healthy"
            log_info "Showing container status:"
            docker-compose -f "$COMPOSE_FILE" ps
            log_info "Showing notification-services logs:"
            docker-compose -f "$COMPOSE_FILE" logs --tail=50 notification-services
            return 1
        fi
        
        sleep 5
    done
}

show_status() {
    log_info "Current service status:"
    echo ""
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
}

show_logs() {
    log_info "Recent logs from notification-services:"
    echo ""
    docker-compose -f "$COMPOSE_FILE" logs --tail=30 notification-services
    echo ""
}

test_api() {
    log_info "Testing API Gateway health endpoint..."
    
    sleep 3  # Give services a moment to fully start
    
    if curl -f http://localhost:3000/health &>/dev/null; then
        log_success "API Gateway is responding correctly!"
        log_info "Health check response:"
        curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
    else
        log_warning "API Gateway health check failed"
        log_info "This might be normal if services are still initializing"
    fi
}

print_next_steps() {
    echo ""
    echo "========================================================================="
    log_success "Deployment Complete!"
    echo "========================================================================="
    echo ""
    echo "📊 Service URLs:"
    echo "   - API Gateway:      http://localhost:3000"
    echo "   - User Service:     http://localhost:3001"
    echo "   - Email Service:    http://localhost:3002"
    echo "   - Template Service: http://localhost:3003"
    echo "   - Push Service:     http://localhost:3004"
    echo "   - RabbitMQ Management: http://localhost:15672 (user: admin)"
    echo ""
    echo "📝 Useful Commands:"
    echo "   - View logs:        docker-compose -f $COMPOSE_FILE logs -f"
    echo "   - View status:      docker-compose -f $COMPOSE_FILE ps"
    echo "   - Stop services:    docker-compose -f $COMPOSE_FILE down"
    echo "   - Restart services: docker-compose -f $COMPOSE_FILE restart"
    echo ""
    echo "🔍 To check service health:"
    echo "   curl http://localhost:3000/health"
    echo ""
    echo "========================================================================="
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    log_info "Starting build and deployment process..."
    echo ""
    
    # Pre-flight checks
    check_docker
    check_env_file
    
    # Cleanup
    cleanup_old_containers
    
    # Optionally clean old images
    if [ "${CLEAN_IMAGES:-false}" = "true" ]; then
        cleanup_old_images
    fi
    
    # Build and start
    build_images
    start_services
    
    # Wait for health
    if wait_for_health; then
        show_status
        test_api
        print_next_steps
        exit 0
    else
        log_error "Deployment failed - services did not become healthy in time"
        show_status
        show_logs
        exit 1
    fi
}

# ============================================================================
# Script Entry Point
# ============================================================================

# Handle script arguments
case "${1:-}" in
    --no-cache)
        NO_CACHE=true
        main
        ;;
    --clean)
        CLEAN_IMAGES=true
        main
        ;;
    --full-clean)
        NO_CACHE=true
        CLEAN_IMAGES=true
        main
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --no-cache     Build without using cache (slower but fresh)"
        echo "  --clean        Remove old images before building"
        echo "  --full-clean   Combine --no-cache and --clean"
        echo "  --help, -h     Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  COMPOSE_FILE   Docker compose file to use (default: docker-compose.prod.yml)"
        echo ""
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
