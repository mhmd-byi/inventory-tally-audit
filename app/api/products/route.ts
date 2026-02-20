import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import User from '@/models/User';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';

// Ensure models are registered
import '@/models/Organization';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const warehouseId = searchParams.get('warehouseId');

        await dbConnect();

        const role = session.user?.role;
        const userId = session.user?.id;

        let query: any = {};
        if (warehouseId) {
            query.warehouse = warehouseId;
        }

        if (role !== 'admin' && !warehouseId) {
            const user = await User.findById(userId);
            if (!user) return NextResponse.json([]);

            if (role === 'store_manager') {
                if (!user.organization) return NextResponse.json([]);
                query.organization = user.organization;
            } else if (role === 'auditor') {
                if (user.warehouses && user.warehouses.length > 0) {
                    if (warehouseId) {
                        if (!user.warehouses.map((id: any) => id.toString()).includes(warehouseId)) {
                            return NextResponse.json({ error: 'Unauthorized warehouse access' }, { status: 403 });
                        }
                    } else {
                        query.warehouse = { $in: user.warehouses };
                    }
                } else {
                    const allowedOrgs = user.organizations && user.organizations.length > 0
                        ? user.organizations
                        : (user.organization ? [user.organization] : []);

                    if (allowedOrgs.length === 0) return NextResponse.json([]);
                    query.organization = { $in: allowedOrgs };
                }
            }
        }

        const products = await Product.find(query)
            .populate('organization', 'name code')
            .populate('warehouse', 'name code')
            .sort({ createdAt: -1 });

        return NextResponse.json(products);
    } catch (error: any) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'store_manager')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, sku, description, category, unit, organizationId, warehouseId, bookStock, bookStockValue } = body;

        if (!name || !sku || !warehouseId) {
            return NextResponse.json({ error: 'Name, SKU and Warehouse are required' }, { status: 400 });
        }

        await dbConnect();

        // 1. Fetch Warehouse to get organization and verify existence
        const Warehouse = mongoose.models.Warehouse || require('@/models/Warehouse');
        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

        // Determine organization
        let finalOrgId = warehouse.organization;

        // Check for duplicate SKU in this warehouse
        const existing = await Product.findOne({ sku: sku.toUpperCase(), warehouse: warehouseId });
        if (existing) {
            return NextResponse.json({ error: 'Product SKU already exists in this warehouse' }, { status: 400 });
        }

        const product = await Product.create({
            name,
            sku: sku.toUpperCase(),
            description,
            category,
            unit: unit || 'pcs',
            organization: finalOrgId,
            warehouse: warehouseId,
            bookStock: bookStock ? Number(bookStock) : 0,
            bookStockValue: bookStockValue ? Number(bookStockValue) : 0
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error: any) {
        console.error('Error creating product:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create product' },
            { status: 500 }
        );
    }
}
