#!/bin/bash

echo "🚀 Starting MongoDB Replica Set Initialization..."

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB primary to be ready..."
until mongosh --host mongodb-primary:27017 --eval "print('MongoDB is ready')" > /dev/null 2>&1; do
  echo "   Waiting for MongoDB primary..."
  sleep 2
done

echo "✅ MongoDB primary is ready!"

# Check if replica set is already initialized
echo "🔍 Checking if replica set is already initialized..."
RS_STATUS=$(mongosh --host mongodb-primary:27017 --quiet --eval "try { rs.status().ok } catch(e) { 0 }" 2>/dev/null)

if [ "$RS_STATUS" = "1" ]; then
  echo "✅ Replica set is already initialized!"
  echo "📊 Current replica set status:"
  mongosh --host mongodb-primary:27017 --quiet --eval "rs.status().members.forEach(m => print('  ' + m.name + ' - ' + m.stateStr))"
else
  echo "🔧 Initializing single-node replica set..."

  # Initialize replica set with single node (sufficient for transactions)
  mongosh --host mongodb-primary:27017 --eval "
    rs.initiate({
      _id: 'rs0',
      members: [
        { _id: 0, host: 'localhost:27017' }
      ]
    })
  "

  echo "⏳ Waiting for replica set to be ready..."
  sleep 10

  # Wait for replica set to be fully ready
  for i in {1..30}; do
    RS_STATUS=$(mongosh --host mongodb-primary:27017 --quiet --eval "try { rs.status().ok } catch(e) { 0 }" 2>/dev/null)
    if [ "$RS_STATUS" = "1" ]; then
      echo "✅ Replica set initialization completed!"
      echo "📊 Replica set members:"
      mongosh --host mongodb-primary:27017 --quiet --eval "rs.status().members.forEach(m => print('  ' + m.name + ' - ' + m.stateStr))"
      break
    fi
    echo "   Attempt $i/30: Waiting for replica set to be ready..."
    sleep 2
  done

  if [ "$RS_STATUS" != "1" ]; then
    echo "❌ Replica set initialization timed out"
    exit 1
  fi
fi

echo "🎉 MongoDB Replica Set is ready for transactions!"
echo "💡 You can now use transactions in your MongoDB ODM"
echo ""
echo "🔗 Connection string: mongodb://localhost:27017/adonis_mongo?replicaSet=rs0"
