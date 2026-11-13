import dns from 'node:dns';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '1.1.1.1']);

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB connected');
  } catch (err) {
    console.error('DB connection error:', err.message);
    process.exit(1);
  }
};