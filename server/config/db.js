const mongoose = require('mongoose');

let memoryServerInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/api_security_platform';
  
  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${uri}`);
    // Attempt standard connection with a short timeout
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 5000,
    });
    console.log(`[Database] Connected successfully to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] Standard MongoDB connection failed (${err.message}). Initializing fallback MongoDB Memory Server...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const memoryUri = memoryServerInstance.getUri();
      console.log(`[Database] MongoMemoryServer spun up at: ${memoryUri}`);
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Connected successfully to fallback embedded MongoDB.`);
      return conn;
    } catch (memErr) {
      console.error(`[Database] Fatal: Failed to initialize database: ${memErr.message}`);
      throw memErr;
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
    }
    console.log('[Database] MongoDB connection closed.');
  } catch (err) {
    console.error('[Database] Error disconnecting DB:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
