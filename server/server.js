const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { connectDB } = require('./config/db');
const { seedAdminUser, seedSampleTraffic } = require('./utils/seedData');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seed default administrator account and initial demo traffic
    await seedAdminUser();
    await seedSampleTraffic();

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🛡️  Intelligent API Security & Request Validation Engine`);
      console.log(`📡 Backend Server listening on http://localhost:${PORT}`);
      console.log(`🔑 Admin Credentials: admin@apisecurity.io / Admin@123456`);
      console.log(`=======================================================`);
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error(`[Fatal Server Error]: ${err.message}`);
    });
  } catch (err) {
    console.error('[Startup Error]:', err.message);
    process.exit(1);
  }
}

startServer();
