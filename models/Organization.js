const mongoose = require('mongoose');

if (mongoose.models.Organization) {
    delete mongoose.models.Organization;
}

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide organization name'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Please provide organization code'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;
