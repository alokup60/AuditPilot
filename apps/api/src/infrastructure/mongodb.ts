//responsibile for:
// Read config
//    ↓
// Get MONGODB_URI
//    ↓
// Mongoose.connect()
//    ↓
// Connection successful

import mongoose from 'mongoose';
import { config } from '@auditpilot/config';

export async function connectMongoDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed', error);
    throw error;
  }
}
