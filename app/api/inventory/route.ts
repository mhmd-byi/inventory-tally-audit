import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Stock from '@/models/Stock';
import Product from '@/models/Product';
import Warehouse from '@/models/Warehouse';
import User from '@/models/User';
import Audit from '@/models/Audit';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';

// Register models for population
import '@/models/Product';
import '@/models/Warehouse';
import '@/models/Audit';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');
        const warehouseId = searchParams.get('warehouseId');
        const includeAudits = searchParams.get('includeAudits') === 'true';

        await dbConnect();

        let query: any = {};
        if (productId) query.product = productId;
        if (warehouseId) query.warehouse = warehouseId;

        const stock = await Stock.find(query)
            .populate('product', 'name sku unit')
            .populate('warehouse', 'name code');

        if (includeAudits && productId && warehouseId) {
            const audits = await Audit.find({ product: productId, warehouse: warehouseId })
                .populate('auditor', 'name')
                .sort({ createdAt: -1 });
            return NextResponse.json({ stock: stock[0] || null, audits });
        }

        return NextResponse.json(stock);
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || !['admin', 'store_manager', 'auditor'].includes(session.user?.role || '')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { productId, warehouseId, quantity, type, notes } = body;

        if (!productId || !warehouseId) {
            return NextResponse.json({ error: 'Product and Warehouse are required' }, { status: 400 });
        }

        await dbConnect();

        // 1. Fetch User and Warehouse for Security & Data context
        const user = await User.findById(session.user.id);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

        // 2. Role-based Security check
        if (session.user?.role !== 'admin') {
            const allowedOrgs = user.organizations && user.organizations.length > 0
                ? user.organizations.map((id: any) => id.toString())
                : (user.organization ? [user.organization.toString()] : []);

            if (!allowedOrgs.includes(warehouse.organization.toString())) {
                return NextResponse.json({ error: 'Unauthorized organizational access' }, { status: 403 });
            }
        }

        // 3. Process based on Role
        let stock = await Stock.findOne({ product: productId, warehouse: warehouseId });

        // Ensure stock record exists
        if (!stock) {
            stock = await Stock.create({
                product: productId,
                warehouse: warehouseId,
                quantity: 0
            });
        }

        if (session.user?.role === 'auditor') {
            // AUDITOR: Save to Audit record, DO NOT delete or overwrite Stock quantity
            const physicalVal = Number(quantity);
            const systemVal = stock.quantity;
            const discrepancy = physicalVal - systemVal;

            const auditEntry = await Audit.create({
                product: productId,
                warehouse: warehouseId,
                organization: warehouse.organization,
                auditor: user._id,
                systemQuantity: systemVal,
                physicalQuantity: physicalVal,
                discrepancy: discrepancy,
                notes: notes || ''
            });

            // Update Stock's metadata but not its quantity
            stock.lastAuditDate = new Date();
            await stock.save();

            return NextResponse.json({
                success: true,
                message: 'Audit record submitted successfully',
                audit: auditEntry
            });
        } else {
            // ADMIN/MANAGER: This is a system update (Stock level change)
            if (type === 'adjust') {
                stock.quantity += Number(quantity);
            } else {
                stock.quantity = Number(quantity);
            }
            await stock.save();

            return NextResponse.json({
                success: true,
                message: 'System stock updated',
                stock
            });
        }
    } catch (error: any) {
        console.error('Inventory Processing Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process inventory' }, { status: 500 });
    }
}
