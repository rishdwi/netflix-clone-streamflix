import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/streamflix';

// Cache the connection promise so multiple concurrent requests share one connection
let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async (): Promise<void> => {
  // Already connected — nothing to do
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri).then((m) => {
      console.log('✅ Connected to MongoDB');
      return m;
    }).catch((err) => {
      console.error('❌ MongoDB connection error:', err);
      connectionPromise = null;
      throw err;
    });
  }

  await connectionPromise;
};
