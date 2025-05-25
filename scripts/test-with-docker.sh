#!/bin/bash

# Test runner script for MongoDB ODM with Docker
# This script starts MongoDB, runs tests, and optionally cleans up

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KEEP_CONTAINERS=${KEEP_CONTAINERS:-false}
TIMEOUT=${TIMEOUT:-30}

echo -e "${BLUE}🐳 MongoDB ODM Test Runner${NC}"
echo "=================================="

# Function to check if MongoDB is ready
check_mongodb() {
    echo -e "${YELLOW}⏳ Waiting for MongoDB to be ready...${NC}"

    for i in $(seq 1 $TIMEOUT); do
        if npm run test:mongo > /dev/null 2>&1; then
            echo -e "${GREEN}✅ MongoDB is ready!${NC}"
            return 0
        fi

        if [ $i -eq $TIMEOUT ]; then
            echo -e "${RED}❌ MongoDB failed to start within ${TIMEOUT} seconds${NC}"
            return 1
        fi

        echo -n "."
        sleep 1
    done
}

# Function to cleanup
cleanup() {
    if [ "$KEEP_CONTAINERS" = "false" ]; then
        echo -e "${YELLOW}🧹 Cleaning up Docker containers...${NC}"
        npm run docker:down > /dev/null 2>&1 || true
    else
        echo -e "${BLUE}📦 Keeping Docker containers running${NC}"
        echo -e "${BLUE}   Access Mongo Express at: http://localhost:8081${NC}"
        echo -e "${BLUE}   Stop containers with: npm run docker:down${NC}"
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Start MongoDB containers
echo -e "${BLUE}🚀 Starting MongoDB containers...${NC}"
npm run docker:up

# Wait for MongoDB to be ready
if ! check_mongodb; then
    echo -e "${RED}❌ Failed to connect to MongoDB${NC}"
    echo -e "${YELLOW}💡 Try running: docker-compose logs mongodb${NC}"
    exit 1
fi

# Run connection test
echo -e "${BLUE}🔍 Testing MongoDB connection...${NC}"
if npm run test:mongo; then
    echo -e "${GREEN}✅ MongoDB connection test passed${NC}"
else
    echo -e "${RED}❌ MongoDB connection test failed${NC}"
    exit 1
fi

# Run the actual tests
echo -e "${BLUE}🧪 Running MongoDB ODM tests...${NC}"
if npm test; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

echo -e "${GREEN}✨ Test run completed successfully!${NC}"
