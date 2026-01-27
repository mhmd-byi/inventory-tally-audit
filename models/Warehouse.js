const mongoose = require('mongoose');

if (mongoose.models.Warehouse) {
    delete mongoose.models.Warehouse;
}

const warehouseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide warehouse name'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Please provide warehouse code'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: [true, 'Warehouse must belong to an organization'],
        },
        location: {
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

const Warehouse = mongoose.model('Warehouse', warehouseSchema);

module.exports = Warehouse;
