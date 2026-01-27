import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import User from '@/models/User';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';

// Ensure models are registered
import '@/models/Organization';

export async function GET() {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const role = session.user?.role;
        const userId = session.user?.id;

        let query = {};

        if (role !== 'admin') {
            const user = await User.findById(userId);
            if (!user) return NextResponse.json([]);

            if (role === 'store_manager') {
                if (!user.organization) return NextResponse.json([]);
                query = { organization: user.organization };
            } else if (role === 'auditor') {
                const allowedOrgs = user.organizations && user.organizations.length > 0
                    ? user.organizations
                    : (user.organization ? [user.organization] : []);

                if (allowedOrgs.length === 0) return NextResponse.json([]);
                query = { organization: { $in: allowedOrgs } };
            }
        }

        const products = await Product.find(query)
            .populate('organization', 'name code')
            .sort({ createdAt: -1 });

        return NextResponse.json(products);
    } catch (error: any) {
        console.error('Error fetching products:', error);
        return NextResponse.json(
            { error: 'Failed to fetch products' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'store_manager')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, sku, description, category, unit, organizationId } = body;

        if (!name || !sku) {
            return NextResponse.json({ error: 'Name and SKU are required' }, { status: 400 });
        }

        await dbConnect();

        // Determine organization
        let finalOrgId = organizationId;
        if (session.user?.role === 'store_manager') {
            const user = await User.findById(session.user.id);
            finalOrgId = user?.organization;
        }

        if (!finalOrgId) {
            return NextResponse.json({ error: 'Organization is required' }, { status: 400 });
        }

        // Check for duplicate SKU
        const existing = await Product.findOne({ sku: sku.toUpperCase() });
        if (existing) {
            return NextResponse.json({ error: 'Product SKU already exists' }, { status: 400 });
        }

        const product = await Product.create({
            name,
            sku: sku.toUpperCase(),
            description,
            category,
            unit: unit || 'pcs',
            organization: finalOrgId
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
