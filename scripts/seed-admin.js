// Script to create the initial admin user
// Run with: npm run seed-admin

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
}

// Define User Schema
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        role: {
            type: String,
            enum: ['admin', 'organization_admin', 'user'],
            default: 'user',
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

async function seedAdmin() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create or get User model
        const User = mongoose.models.User || mongoose.model('User', userSchema);

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@inventory.com' });

        if (existingAdmin) {
            console.log('\n⚠️  Admin user already exists!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 Email:', existingAdmin.email);
            console.log('👤 Name:', existingAdmin.name);
            console.log('🔑 Role:', existingAdmin.role);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            await mongoose.connection.close();
            return;
        }

        // Create admin user
        const admin = await User.create({
            name: 'Admin',
            email: 'admin@inventory.com',
            password: 'Admin@123',
            role: 'admin',
        });

        console.log('\n✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email: admin@inventory.com');
        console.log('🔑 Password: Admin@123');
        console.log('👤 Role: admin');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🎉 You can now login with these credentials!');

        await mongoose.connection.close();
        console.log('👋 Database connection closed\n');
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        try {
            await mongoose.connection.close();
        } catch (e) {
            // Ignore close errors
        }
        process.exit(1);
    }
}

seedAdmin();
