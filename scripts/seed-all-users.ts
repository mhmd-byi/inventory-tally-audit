// Script to create test users for all roles
// Run with: npm run seed-users

import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import * as path from 'path'
import User from '../models/User'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local')
  process.exit(1)
}

const testUsers = [
  {
    name: 'Admin User',
    email: 'admin@inventory.com',
    password: 'Admin@123',
    role: 'admin',
  },
  {
    name: 'Store Manager',
    email: 'manager@inventory.com',
    password: 'Manager@123',
    role: 'store_manager',
  },
  {
    name: 'Auditor User',
    email: 'auditor@inventory.com',
    password: 'Auditor@123',
    role: 'auditor',
  },
]

async function seedUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI as string)
    console.log('✅ Connected to MongoDB\n')

    console.log('Creating users...\n')

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email })

      if (existingUser) {
        console.log(`⚠️  ${userData.role} user already exists (${userData.email})`)
      } else {
        await User.create(userData)
        console.log(`✅ Created ${userData.role} user (${userData.email})`)
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📝 User Credentials Summary')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('👨‍💼 ADMIN')
    console.log('   Email: admin@inventory.com')
    console.log('   Password: Admin@123\n')

    console.log('🏪 STORE MANAGER')
    console.log('   Email: manager@inventory.com')
    console.log('   Password: Manager@123\n')

    console.log('📋 AUDITOR')
    console.log('   Email: auditor@inventory.com')
    console.log('   Password: Auditor@123\n')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    await mongoose.connection.close()
    console.log('👋 Database connection closed\n')
  } catch (error) {
    console.error('❌ Error seeding users:', error)
    try {
      await mongoose.connection.close()
    } catch (e) {
      // Ignore close errors
    }
    process.exit(1)
  }
}

seedUsers()
