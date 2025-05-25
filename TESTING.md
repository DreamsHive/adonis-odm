# Testing MongoDB ODM

This document explains how to test the MongoDB ODM for AdonisJS v6, including both unit tests and integration tests with Docker.

## 🧪 Test Types

### Unit Tests

- Test model metadata and decorators
- Test query builder functionality
- Test model lifecycle methods
- Mock database operations for fast execution

### Integration Tests

- Test real database operations with Docker MongoDB
- Test CRUD operations with actual data
- Test complex queries and pagination
- Test connection management

## 🚀 Quick Start

### 1. Run All Tests with Docker (Recommended)

```bash
# Start MongoDB, run tests, and clean up
npm run test:docker

# Keep containers running after tests (useful for debugging)
npm run test:docker:keep
```

### 2. Manual Testing

```bash
# Start MongoDB containers
npm run docker:up

# Test MongoDB connection
npm run test:mongo

# Run all tests (unit + integration)
npm test

# Stop containers when done
npm run docker:down
```

## 📋 Test Structure

### Test Files

- `tests/unit/mongodb_odm.spec.ts` - Main test file with unit and integration tests
- `scripts/test-connection.js` - MongoDB connection test script
- `scripts/test-with-docker.sh` - Automated test runner

### Test Groups

#### MongoDB ODM - Unit Tests

- ✅ Model metadata creation from decorators
- ✅ Collection name generation
- ✅ Model instance creation and attributes
- ✅ Date serialization/deserialization
- ✅ Dirty attribute tracking
- ✅ Auto timestamp application
- ✅ Document format conversion
- ✅ Model save operations (mocked)
- ✅ Query operator support
- ✅ Query builder functionality

#### MongoDB ODM - Integration Tests

- ✅ Docker MongoDB connection
- ✅ Real user creation and saving
- ✅ Querying real data from MongoDB
- ✅ Pagination with real data
- ✅ Record updates with timestamps
- ✅ Record deletion
- ✅ Complex queries (between, in, not null)
- ✅ Lucid-style create patterns (`.create()` vs `new` + `.save()`)
- ✅ Lucid-style update patterns (direct assignment, `.merge()`, query `.update()`)
- ✅ Lucid-style delete patterns (instance delete vs query delete)
- ✅ Bulk operations (createMany, bulk update, bulk delete)
- ✅ UpdateOrCreate pattern
- ✅ Like operator for pattern matching

## 🔧 Test Configuration

### Docker MongoDB Setup

The integration tests use the Docker MongoDB configuration:

```typescript
const config: MongoConfig = {
  connection: 'mongodb',
  connections: {
    mongodb: {
      client: 'mongodb',
      connection: {
        url: 'mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo',
        host: 'localhost',
        port: 27017,
        database: 'adonis_mongo',
        options: {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000,
        },
      },
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
}
```

### Test Model

The tests use a `TestUser` model with the following structure:

```typescript
class TestUser extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static getCollectionName(): string {
    return 'test_users'
  }
}
```

## 🎯 Test Scenarios

### CRUD Operations

```typescript
// Create
const user = new TestUser({
  name: 'Integration Test User',
  email: 'test@example.com',
  age: 25,
})
await user.save()

// Read
const users = await TestUser.query().where('age', '>=', 25).all()
const user = await TestUser.query().where('name', 'Test User').first()

// Update
user.merge({ age: 31, name: 'Updated User' })
await user.save()

// Delete
await user.delete()
```

### Query Operations

```typescript
// Basic queries
const adults = await TestUser.query().where('age', '>=', 18).all()
const specificUser = await TestUser.query().where('email', 'test@example.com').first()

// Complex queries
const middleAged = await TestUser.query().whereBetween('age', [25, 40]).all()
const specificAges = await TestUser.query().whereIn('age', [18, 65]).all()
const usersWithAge = await TestUser.query().whereNotNull('age').all()

// Pagination
const page1 = await TestUser.query().orderBy('age', 'asc').paginate(1, 2)

// Aggregation
const count = await TestUser.query().count()
```

## 🔍 Test Execution Details

### Automatic Docker Detection

The integration tests automatically detect if Docker MongoDB is available:

```typescript
// Test if Docker MongoDB is available
try {
  await manager.connect()
  isDockerAvailable = true
  console.log('✅ Docker MongoDB is available for integration tests')
} catch (error) {
  console.log('⚠️  Docker MongoDB not available, skipping integration tests')
  isDockerAvailable = false
}
```

### Test Data Cleanup

- Tests automatically clean up test data before and after execution
- Each test uses unique email addresses to avoid conflicts
- Test collection is cleared between test runs

### Graceful Fallback

- If Docker MongoDB is not available, integration tests are skipped
- Unit tests always run regardless of Docker availability
- Clear messages indicate which tests are running

## 📊 Test Output Examples

### Successful Test Run

```bash
🐳 MongoDB ODM Test Runner
==================================
🚀 Starting MongoDB containers...
⏳ Waiting for MongoDB to be ready...
✅ MongoDB is ready!
🔍 Testing MongoDB connection...
✅ MongoDB connection test passed
🧪 Running MongoDB ODM tests...

MongoDB ODM - Unit Tests
  ✅ should create model metadata from decorators
  ✅ should generate correct collection name
  ✅ should create model instance with attributes
  ✅ should handle date serialization and deserialization
  ✅ should track dirty attributes
  ✅ should apply auto timestamps
  ✅ should convert to document format
  ✅ should handle model save operation
  ✅ should support query operators
  ✅ should handle query building

MongoDB ODM - Integration Tests
  ✅ should connect to Docker MongoDB
  ✅ should create and save a real user
  ✅ should query real data from MongoDB
  ✅ should handle pagination with real data
  ✅ should update existing records
  ✅ should delete records
  ✅ should handle complex queries

🎉 All tests passed!
✨ Test run completed successfully!
```

### Docker Not Available

```bash
⚠️  Docker MongoDB not available, skipping integration tests
   Start MongoDB with: npm run docker:up

MongoDB ODM - Unit Tests
  ✅ All unit tests pass...

MongoDB ODM - Integration Tests
  ⏭️  All integration tests skipped (Docker not available)
```

## 🛠️ Available Scripts

| Script                     | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `npm test`                 | Run all tests (unit + integration if Docker available)   |
| `npm run test:mongo`       | Test MongoDB connection only                             |
| `npm run test:docker`      | Full automated test with Docker (start → test → cleanup) |
| `npm run test:docker:keep` | Same as above but keep containers running                |
| `npm run docker:up`        | Start MongoDB containers                                 |
| `npm run docker:down`      | Stop MongoDB containers                                  |
| `npm run docker:logs`      | View MongoDB container logs                              |

## 🔧 Environment Variables

### Test Script Configuration

```bash
# Keep containers running after tests
KEEP_CONTAINERS=true npm run test:docker

# Increase timeout for MongoDB startup
TIMEOUT=60 npm run test:docker
```

### MongoDB Configuration

```bash
# Override default MongoDB settings
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=adonis_mongo
MONGO_USERNAME=adonis_user
MONGO_PASSWORD=adonis_password
```

## 🐛 Troubleshooting

### Common Issues

1. **Port 27017 already in use**

   ```bash
   # Check what's using the port
   lsof -i :27017

   # Stop local MongoDB
   brew services stop mongodb-community
   ```

2. **Docker not running**

   ```bash
   # Start Docker Desktop
   # Or check Docker daemon status
   docker info
   ```

3. **Permission denied on test script**

   ```bash
   chmod +x scripts/test-with-docker.sh
   ```

4. **Tests timing out**

   ```bash
   # Increase timeout
   TIMEOUT=60 npm run test:docker

   # Check container logs
   npm run docker:logs
   ```

### Debug Mode

```bash
# Keep containers running for debugging
npm run test:docker:keep

# Access Mongo Express at http://localhost:8081
# Username: admin, Password: admin123

# Connect to MongoDB shell
docker exec -it adonis_mongo_db mongosh -u adonis_user -p adonis_password --authenticationDatabase adonis_mongo
```

## 📈 Test Coverage

The test suite covers:

- ✅ **Model Definition**: Decorators, metadata, collection naming
- ✅ **Model Lifecycle**: Creation, persistence, state tracking
- ✅ **CRUD Operations**: Create, read, update, delete
- ✅ **Query Building**: All operators, chaining, complex queries
- ✅ **Pagination**: Page-based results with metadata
- ✅ **Timestamps**: Auto-create and auto-update functionality
- ✅ **Serialization**: DateTime ↔ Date conversion
- ✅ **Connection Management**: Multiple connections, error handling
- ✅ **Error Scenarios**: Missing records, connection failures

## 🎯 Best Practices

1. **Always run integration tests** before deploying changes
2. **Use unique identifiers** in test data to avoid conflicts
3. **Clean up test data** to prevent test pollution
4. **Test both success and failure scenarios**
5. **Use Docker for consistent test environment**
6. **Monitor test performance** and optimize slow tests

## 🚀 Continuous Integration

For CI/CD pipelines, use the automated test script:

```yaml
# GitHub Actions example
- name: Test MongoDB ODM
  run: npm run test:docker
  env:
    KEEP_CONTAINERS: false
    TIMEOUT: 60
```

The test suite is designed to be reliable, fast, and comprehensive, providing confidence in the MongoDB ODM functionality across different environments.
