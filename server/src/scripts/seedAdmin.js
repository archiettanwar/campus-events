import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';

async function seedAdmin() {
  await connectDB();

  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  await User.create({
    name: 'Campus Admin',
    email,
    passwordHash,
    role: 'admin',
  });

  console.log(`Admin seeded successfully: ${email}`);
  await mongoose.disconnect();
}

seedAdmin();