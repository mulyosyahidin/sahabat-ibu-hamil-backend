/**
 * Database Seeder Script
 * 
 * This script seeds the database with default data, including a default user.
 * It checks for existing users by email before creating new ones to prevent duplicates.
 * Default user data is now loaded from environment variables for better security.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

/**
 * Main seeder function
 * Seeds the database with default user data from environment variables
 */
async function main() {
  console.log('🌱 Starting database seeding...');

  // Default user data from environment variables
  const defaultUser = {
    name: process.env.DEFAULT_USER_NAME || 'Admin User',
    email: process.env.DEFAULT_USER_EMAIL || 'admin@sahabatibuhamil.com',
    password: process.env.DEFAULT_USER_PASSWORD || 'password123',
  };

  // Validate required environment variables
  if (!process.env.DEFAULT_USER_NAME || !process.env.DEFAULT_USER_EMAIL || !process.env.DEFAULT_USER_PASSWORD) {
    console.warn('⚠️  Warning: Some default user environment variables are missing. Using fallback values.');
    console.warn('   Please set DEFAULT_USER_NAME, DEFAULT_USER_EMAIL, and DEFAULT_USER_PASSWORD in your .env file.');
  }

  try {
    // Check if user already exists by email
    const existingUser = await prisma.user.findUnique({
      where: {
        email: defaultUser.email,
      },
    });

    if (existingUser) {
      console.log(`✅ User with email ${defaultUser.email} already exists. Skipping...`);
    } else {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(defaultUser.password, saltRounds);

      // Create the default user
      const newUser = await prisma.user.create({
        data: {
          name: defaultUser.name,
          email: defaultUser.email,
          password: hashedPassword,
          email_verified_at: new Date(),
        },
      });

      console.log(`✅ Created default user: ${newUser.name} (${newUser.email})`);
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

/**
 * Execute the seeder and handle cleanup
 */
main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });