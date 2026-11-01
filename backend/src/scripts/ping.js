// Quick Atlas connectivity check
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
(async () => {
  await connectDB();
  const r = await mongoose.connection.db.admin().ping();
  console.log('ping:', r, '| collections:', (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name).join(', ') || '(none)');
  await disconnectDB();
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
