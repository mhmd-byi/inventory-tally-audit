const mongoose = require('mongoose');

if (mongoose.models.Stock) {
    delete mongoose.models.Stock;
}

const stockSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Stock must be linked to a product'],
        },
        warehouse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse',
            required: [true, 'Stock must be linked to a warehouse'],
        },
        quantity: {
            type: Number,
            required: true,
            default: 0,
            min: [0, 'Quantity cannot be negative'],
        },
        bookStock: {
            type: Number,
            default: 0,
            min: [0, 'Book stock cannot be negative'],
        },
        minStockLevel: {
            type: Number,
            default: 0,
        },
        lastAuditDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure 1 product-warehouse pair exists only once
stockSchema.index({ product: 1, warehouse: 1 }, { unique: true });

const Stock = mongoose.model('Stock', stockSchema);

module.exports = Stock;
