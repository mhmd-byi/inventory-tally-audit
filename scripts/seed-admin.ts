// Script to create the initial admin user
// Run with: npm run seed-admin

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

async function seedAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI as string)
    console.log('✅ Connected to MongoDB')

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@inventory.com' })

    if (existingAdmin) {
      console.log('\n⚠️  Admin user already exists!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📧 Email:', existingAdmin.email)
      console.log('👤 Name:', existingAdmin.name)
      console.log('🔑 Role:', existingAdmin.role)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      await mongoose.connection.close()
      return
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@inventory.com',
      password: 'Admin@123',
      role: 'admin',
    })

    console.log('\n✅ Admin user created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Email: admin@inventory.com')
    console.log('🔑 Password: Admin@123')
    console.log('👤 Role: admin')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('🎉 You can now login with these credentials!')

    await mongoose.connection.close()
    console.log('👋 Database connection closed\n')
  } catch (error) {
    console.error('❌ Error seeding admin:', error)
    try {
      await mongoose.connection.close()
    } catch (e) {
      // Ignore close errors
    }
    process.exit(1)
  }
}

seedAdmin()
