const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Clear the model from mongoose if it already exists to ensure schema updates are applied
if (mongoose.models.User) {
    delete mongoose.models.User;
}

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Please provide an email'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email',
            ],
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: 6,
            select: false,
        },
        role: {
            type: String,
            enum: ['admin', 'store_manager', 'auditor', 'lead_auditor'],
            default: 'auditor',
        },
        // Single organization for Store Managers
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: false,
        },
        // Multiple organizations for Auditors
        organizations: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization'
        }],
        // Specific warehouse for Store Managers
        warehouse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse'
        },
        // Multiple warehouses for Auditors
        warehouses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse'
        }],
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        return false;
    }
};

const User = mongoose.model('User', userSchema);
module.exports = User;
