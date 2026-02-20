const mongoose = require('mongoose');

if (mongoose.models.Product) {
    delete mongoose.models.Product;
}

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide product name'],
            trim: true,
        },
        sku: {
            type: String,
            required: [true, 'Please provide product SKU or Code'],
            uppercase: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        category: {
            type: String,
            trim: true,
        },
        unit: {
            type: String,
            default: 'pcs',
            trim: true,
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: [true, 'Product must belong to an organization'],
        },
        warehouse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse',
            required: [true, 'Product must belong to a warehouse'],
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        bookStock: {
            type: Number,
            default: 0,
        },
        bookStockValue: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Unique SKU per warehouse
productSchema.index({ sku: 1, warehouse: 1 }, { unique: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
