#!/bin/bash

# Test Environment Setup Script for Adonis ODM
# This script sets up the testing environment for integration tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if Docker is running
is_docker_running() {
    docker info >/dev/null 2>&1
}

# Function to wait for MongoDB to be ready
wait_for_mongodb() {
    local host=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for MongoDB at $host:$port to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            print_success "MongoDB at $host:$port is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    print_error "MongoDB at $host:$port failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Main setup function
main() {
    print_status "Setting up Adonis ODM test environment..."

    # Check prerequisites
    print_status "Checking prerequisites..."

    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    if ! is_docker_running; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    print_success "Prerequisites check passed"

    # Check if MongoDB containers are already running
    print_status "Checking existing MongoDB containers..."

    if docker ps | grep -q "adonis-odm-test-mongo"; then
        print_warning "MongoDB test containers are already running"
        
        read -p "Do you want to restart them? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Stopping existing containers..."
            docker-compose -f docker-compose.test.yml down
        else
            print_status "Using existing containers"
            return 0
        fi
    fi

    # Start MongoDB containers
    print_status "Starting MongoDB test containers..."
    docker-compose -f docker-compose.test.yml up -d

    # Wait for all MongoDB instances to be ready
    wait_for_mongodb "localhost" "27017" || exit 1
    wait_for_mongodb "localhost" "27018" || exit 1
    wait_for_mongodb "localhost" "27019" || exit 1

    # Set environment variables
    print_status "Setting up environment variables..."
    
    export NODE_ENV=testing
    export MONGO_URL="mongodb://localhost:27017/adonis_odm_test"
    export MONGO_SECONDARY_URL="mongodb://localhost:27018/adonis_odm_test_secondary"
    export MONGO_TENANT_URL="mongodb://localhost:27019/adonis_odm_test_tenant"

    # Create .env.test file
    cat > .env.test << EOF
NODE_ENV=testing
MONGO_URL=mongodb://localhost:27017/adonis_odm_test
MONGO_SECONDARY_URL=mongodb://localhost:27018/adonis_odm_test_secondary
MONGO_TENANT_URL=mongodb://localhost:27019/adonis_odm_test_tenant
EOF

    print_success "Environment variables saved to .env.test"

    # Test MongoDB connections
    print_status "Testing MongoDB connections..."

    if command_exists mongosh; then
        mongosh --host localhost:27017 --eval "db.adminCommand('ping')" --quiet || {
            print_warning "Could not connect to primary MongoDB (this might be normal if auth is required)"
        }
    else
        print_warning "mongosh not found, skipping connection test"
    fi

    print_success "Test environment setup completed!"
    echo
    print_status "You can now run integration tests with:"
    echo "  npm run test:integration:new"
    echo "  npm run test:integration:full"
    echo "  npm run test:complete"
    echo
    print_status "To view databases, you can optionally start Mongo Express:"
    echo "  docker-compose -f docker-compose.test.yml --profile tools up -d mongo-express"
    echo "  Then visit: http://localhost:8081"
    echo
    print_status "To stop the test environment:"
    echo "  docker-compose -f docker-compose.test.yml down"
    echo "  docker-compose -f docker-compose.test.yml down -v  # (removes data volumes)"
}

# Function to clean up test environment
cleanup() {
    print_status "Cleaning up test environment..."
    
    docker-compose -f docker-compose.test.yml down
    
    if [ "$1" = "--volumes" ] || [ "$1" = "-v" ]; then
        print_status "Removing data volumes..."
        docker-compose -f docker-compose.test.yml down -v
    fi
    
    if [ -f .env.test ]; then
        rm .env.test
        print_success "Removed .env.test file"
    fi
    
    print_success "Test environment cleaned up"
}

# Function to show status
status() {
    print_status "Test environment status:"
    echo
    
    if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(adonis-odm-test|mongo)"; then
        echo
        print_success "MongoDB containers are running"
    else
        print_warning "No MongoDB test containers found"
    fi
    
    if [ -f .env.test ]; then
        print_status "Environment file (.env.test) exists"
    else
        print_warning "Environment file (.env.test) not found"
    fi
}

# Parse command line arguments
case "${1:-setup}" in
    setup)
        main
        ;;
    cleanup|clean)
        cleanup "$2"
        ;;
    status)
        status
        ;;
    help|--help|-h)
        echo "Usage: $0 [command] [options]"
        echo
        echo "Commands:"
        echo "  setup     Set up test environment (default)"
        echo "  cleanup   Clean up test environment"
        echo "  status    Show test environment status"
        echo "  help      Show this help message"
        echo
        echo "Options for cleanup:"
        echo "  -v, --volumes  Also remove data volumes"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
