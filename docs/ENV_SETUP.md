# Environment Setup for MongoDB ODM

## .env Configuration Options

Create a `.env` file in your project root. You can choose between two configuration approaches:

### Option 1: Using MongoDB URI (Recommended)

```env
NODE_ENV=development
PORT=3333
APP_KEY=your-app-key-here
HOST=0.0.0.0
LOG_LEVEL=info

# MongoDB Configuration - URI approach
MONGO_CONNECTION=mongodb
MONGO_URI=mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo

# MongoDB Connection Pool Settings (optional)
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=0
MONGO_MAX_IDLE_TIME_MS=30000
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=0
MONGO_CONNECT_TIMEOUT_MS=10000
```

### Option 2: Using Granular Configuration

```env
NODE_ENV=development
PORT=3333
APP_KEY=your-app-key-here
HOST=0.0.0.0
LOG_LEVEL=info

# MongoDB Configuration - Granular approach
MONGO_CONNECTION=mongodb
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=adonis_mongo
MONGO_USERNAME=adonis_user
MONGO_PASSWORD=adonis_password

# MongoDB Connection Pool Settings (optional)
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=0
MONGO_MAX_IDLE_TIME_MS=30000
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=0
MONGO_CONNECT_TIMEOUT_MS=10000
```

**Note:** All MongoDB connection variables are now optional. You can use either the URI approach or the granular approach, or mix both (URI takes precedence if provided).

## For Testing

If you're running tests, make sure your `.env` file includes:

```env
NODE_ENV=test
MONGO_URI=mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo_test
```

## Docker Setup

If you're using the provided Docker setup, use these credentials:

```env
MONGO_URI=mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo
```

## Troubleshooting

1. **Configuration not found error**: Make sure your `.env` file exists and contains the MongoDB variables
2. **Connection refused**: Ensure MongoDB is running (use `docker-compose up -d` if using Docker)
3. **Authentication failed**: Verify the username/password in your `.env` match your MongoDB setup

## Quick Setup Commands

```bash
# Copy this configuration to your .env file
cp ENV_SETUP.md .env

# Start MongoDB with Docker
docker-compose up -d

# Run tests
npm test
```
