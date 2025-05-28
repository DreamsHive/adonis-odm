# Docker Setup for MongoDB ODM

This guide helps you set up MongoDB using Docker for local development and testing of the AdonisJS MongoDB ODM.

## 🐳 Quick Start

1. **Start MongoDB with Docker Compose**:

   ```bash
   docker-compose up -d
   ```

2. **Update your `.env` file** with the following MongoDB configuration:

   ```env
   MONGO_HOST=localhost
   MONGO_PORT=27017
   MONGO_DATABASE=adonis_mongo
   MONGO_USERNAME=adonis_user
   MONGO_PASSWORD=adonis_password
   MONGO_URI=mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo
   ```

3. **Access Mongo Express** (Web UI) at: http://localhost:8081
   - Username: `admin`
   - Password: `admin123`

## 📋 What's Included

The Docker Compose setup includes:

### MongoDB Server

- **Image**: MongoDB 7.0
- **Port**: 27017
- **Database**: `adonis_mongo`
- **Admin User**: `admin` / `password123`
- **App User**: `adonis_user` / `adonis_password`

### Mongo Express (Web UI)

- **Image**: Mongo Express 1.0.0
- **Port**: 8081
- **Access**: http://localhost:8081
- **Login**: `admin` / `admin123`

### Sample Data

The initialization script creates:

- **Collections**: `users`, `posts`, `categories`
- **Indexes**: Optimized for common queries
- **Sample Data**: Test users and categories

## 🔧 Configuration

### Environment Variables for .env

```env
# MongoDB Configuration
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=adonis_mongo
MONGO_CONNECTION=mongodb
MONGO_USERNAME=adonis_user
MONGO_PASSWORD=adonis_password

# Alternative: Use full URI
MONGO_URI=mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo

# Connection Pool Settings
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=0
MONGO_MAX_IDLE_TIME_MS=30000
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=0
MONGO_CONNECT_TIMEOUT_MS=10000
```

### ODM Configuration File

Update your `config/odm.ts` to use environment variables:

```typescript
import { OdmConfig } from '../src/types/index.js'
import env from '#start/env'

const odmConfig: OdmConfig = {
  connection: env.get('MONGO_CONNECTION', 'mongodb'),

  connections: {
    mongodb: {
      client: 'mongodb',
      connection: {
        url: env.get('MONGO_URI', ''),
        host: env.get('MONGO_HOST', 'localhost'),
        port: Number(env.get('MONGO_PORT', '27017')),
        database: env.get('MONGO_DATABASE', 'adonis_mongo'),
        options: {
          maxPoolSize: Number(env.get('MONGO_MAX_POOL_SIZE', '10')),
          minPoolSize: Number(env.get('MONGO_MIN_POOL_SIZE', '0')),
          maxIdleTimeMS: Number(env.get('MONGO_MAX_IDLE_TIME_MS', '30000')),
          serverSelectionTimeoutMS: Number(env.get('MONGO_SERVER_SELECTION_TIMEOUT_MS', '5000')),
          socketTimeoutMS: Number(env.get('MONGO_SOCKET_TIMEOUT_MS', '0')),
          connectTimeoutMS: Number(env.get('MONGO_CONNECT_TIMEOUT_MS', '10000')),
        },
      },
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
}

export default mongoConfig
```

## 🚀 Docker Commands

### Start Services

```bash
# Start in background
docker-compose up -d

# Start with logs
docker-compose up

# Start only MongoDB (without Mongo Express)
docker-compose up -d mongodb
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ This will delete all data)
docker-compose down -v
```

### View Logs

```bash
# View all logs
docker-compose logs

# View MongoDB logs
docker-compose logs mongodb

# Follow logs in real-time
docker-compose logs -f
```

### Access MongoDB Shell

```bash
# Connect as admin user
docker exec -it adonis_mongo_db mongosh -u admin -p password123 --authenticationDatabase admin

# Connect as application user
docker exec -it adonis_mongo_db mongosh -u adonis_user -p adonis_password --authenticationDatabase adonis_mongo
```

## 🧪 Testing the Setup

### 1. Test Connection

Create a simple test script `test-connection.js`:

```javascript
import { MongoClient } from 'mongodb'

const uri = 'mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo'
const client = new MongoClient(uri)

async function testConnection() {
  try {
    await client.connect()
    console.log('✅ Connected to MongoDB successfully!')

    const db = client.db('adonis_mongo')
    const users = await db.collection('users').find({}).toArray()
    console.log(`📊 Found ${users.length} users in the database`)

    await client.close()
  } catch (error) {
    console.error('❌ Connection failed:', error)
  }
}

testConnection()
```

Run with: `node test-connection.js`

### 2. Test with AdonisJS

```bash
# Run your AdonisJS application
npm run dev

# Run tests
npm test
```

## 📊 Sample Data

The initialization script creates sample data:

### Users Collection

```javascript
;[
  { name: 'John Doe', email: 'john@example.com', age: 30 },
  { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  { name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
]
```

### Categories Collection

```javascript
;[
  { name: 'Technology', description: 'Tech-related posts' },
  { name: 'Lifestyle', description: 'Lifestyle and personal posts' },
]
```

## 🔍 Troubleshooting

### Common Issues

1. **Port 27017 already in use**:

   ```bash
   # Check what's using the port
   lsof -i :27017

   # Stop local MongoDB if running
   brew services stop mongodb-community
   # or
   sudo systemctl stop mongod
   ```

2. **Permission denied errors**:

   ```bash
   # Fix Docker permissions (Linux/macOS)
   sudo chown -R $USER:$USER .
   ```

3. **Connection refused**:

   ```bash
   # Check if containers are running
   docker-compose ps

   # Restart services
   docker-compose restart
   ```

4. **Authentication failed**:
   - Verify credentials in `.env` match `docker-compose.yml`
   - Check if you're using the correct database name

### Reset Everything

```bash
# Stop and remove everything
docker-compose down -v

# Remove images (optional)
docker rmi mongo:7.0 mongo-express:1.0.0

# Start fresh
docker-compose up -d
```

## 🔐 Security Notes

⚠️ **Important**: This setup is for development only!

- Default passwords are used for convenience
- No SSL/TLS encryption
- Admin access is enabled
- Data is not encrypted at rest

For production:

- Use strong, unique passwords
- Enable SSL/TLS
- Restrict network access
- Use MongoDB Atlas or other managed services
- Enable authentication and authorization

## 📚 Additional Resources

- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Mongo Express Docker Hub](https://hub.docker.com/_/mongo-express)
- [MongoDB Connection String URI Format](https://docs.mongodb.com/manual/reference/connection-string/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🎯 Next Steps

1. Start the Docker containers
2. Update your `.env` file
3. Run the AdonisJS application
4. Test the MongoDB ODM functionality
5. Access Mongo Express to view your data
6. Run the test suite to verify everything works

Happy coding! 🚀
