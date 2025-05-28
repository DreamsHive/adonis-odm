# MongoDB Configuration for Transactions

## Current Issue

Your current `.env` file has:

```
MONGO_URI=mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo
```

This connects to a single MongoDB instance, but **transactions require a replica set**.

## Required Changes

Please update your `.env` file with these changes:

### 1. Update the MongoDB URI

Replace your current `MONGO_URI` with:

```
MONGO_URI=mongodb://localhost:27017/adonis_mongo?replicaSet=rs0
```

### 2. Remove Authentication (for development)

Since we configured MongoDB with `--noauth` for development, remove these lines:

```
# Remove these lines:
MONGO_USERNAME=adonis_user
MONGO_PASSWORD=adonis_password
```

### 3. Complete Updated .env Configuration

Your MongoDB section should look like this:

```
# MongoDB Configuration for Replica Set (Required for Transactions)
MONGO_CONNECTION=mongodb
MONGO_URI=mongodb://localhost:27017/adonis_mongo?replicaSet=rs0
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=adonis_mongo
```

## Why This Works

- **Multiple hosts**: `localhost:27017,localhost:27018,localhost:27019` connects to all replica set members
- **Replica set name**: `?replicaSet=rs0` tells MongoDB this is a replica set named "rs0"
- **No authentication**: We removed username/password since we're using `--noauth` for development

## Test the Connection

After updating your `.env` file, restart your application and the MongoDB connection should work with transaction support!

## Production Note

For production, you would:

1. Enable authentication with proper keyfiles
2. Use secure connection strings
3. Configure proper SSL/TLS settings
