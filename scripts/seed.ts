import { config } from 'dotenv';
import 'dotenv/config';

// Load .env.local for local development
config({ path: '.env.local' });

import { connectDB } from '../lib/db';

async function seed() {
  try {
    console.log('🌱 Starting seed script...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    }

    console.log(`📧 Creating admin user: ${email}`);
    
    // Create admin user using BetterAuth sign-up endpoint
    // Note: Make sure the dev server is running on localhost:3000
    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
    
    let response;
    try {
      response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: 'Admin',
        }),
      });
    } catch (fetchError) {
      console.error('❌ Could not connect to the Next.js server');
      console.error('   Make sure `npm run dev` is running in another terminal');
      process.exit(1);
    }

    const text = await response.text();
    let result;
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      console.error('❌ Invalid response from server:', text);
      process.exit(1);
    }

    if (!response.ok) {
      // Check if user already exists
      if (result.error?.message?.includes('already exists') || 
          result.error?.message?.includes('duplicate') ||
          result.code === 'USER_ALREADY_EXISTS') {
        console.log('⚠️  Admin user already exists');
        process.exit(0);
      }
      throw new Error(result.error?.message || result.message || 'Failed to create admin user');
    }

    console.log('✅ Admin user created successfully');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log('\n🎉 Seed completed!');
    console.log('\n👉 You can now login at http://localhost:3000/login');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    console.error('\n💡 Make sure:');
    console.error('   1. MongoDB is running');
    console.error('   2. .env file has ADMIN_EMAIL and ADMIN_PASSWORD set');
    console.error('   3. Next.js dev server is running (npm run dev)');
    process.exit(1);
  }
}

seed();
