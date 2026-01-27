import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';

// Force import models to ensure they are registered in the mongoose instance
import '@/models/Organization';
import '@/models/Warehouse';
import '@/models/User';
import '@/models/Product';
import '@/models/Stock';
import '@/models/Audit';

export async function GET() {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await dbConnect();

        const Organization = mongoose.models.Organization;
        const Warehouse = mongoose.models.Warehouse;
        const User = mongoose.models.User;
        const Product = mongoose.models.Product;
        const Stock = mongoose.models.Stock;
        const Audit = mongoose.models.Audit;

        if (!Organization || !Warehouse || !User || !Product) {
            throw new Error('Required models not found in registry');
        }

        const role = session.user?.role;
        const userId = session.user?.id;

        let stats = {
            totalOrganizations: 0,
            totalWarehouses: 0,
            totalProducts: 0,
            totalInventoryValue: 0,
            completedAudits: 0,
            activeDiscrepancies: 0,
            totalUsers: 0
        };

        let orgFilter = {};
        let warehouseFilter = {};

        if (role !== 'admin') {
            const user = await User.findById(userId);
            if (user) {
                if (role === 'store_manager' && user.organization) {
                    orgFilter = { _id: user.organization };
                    const warehouses = await Warehouse.find({ organization: user.organization }).select('_id');
                    warehouseFilter = { warehouse: { $in: warehouses.map((w: any) => w._id) } };
                } else if (role === 'auditor' && user.organizations?.length > 0) {
                    orgFilter = { _id: { $in: user.organizations } };
                    const warehouses = await Warehouse.find({ organization: { $in: user.organizations } }).select('_id');
                    warehouseFilter = { warehouse: { $in: warehouses.map((w: any) => w._id) } };
                }
            }
        }

        stats.totalOrganizations = await Organization.countDocuments(orgFilter);
        stats.totalWarehouses = await Warehouse.countDocuments(Object.keys(orgFilter).length ? { organization: (orgFilter as any)._id } : {});
        stats.totalUsers = await User.countDocuments(Object.keys(orgFilter).length ? { organization: (orgFilter as any)._id } : {});
        stats.totalProducts = await Product.countDocuments(Object.keys(orgFilter).length ? { organization: (orgFilter as any)._id || (orgFilter as any)._id?.$in } : {});

        // Inventory Value
        const inventory = await Stock.aggregate([
            { $match: warehouseFilter },
            { $group: { _id: null, total: { $sum: "$quantity" } } }
        ]);
        stats.totalInventoryValue = inventory[0]?.total || 0;

        // Audit Stats
        const auditMatch = Object.keys(orgFilter).length ? { organization: (orgFilter as any)._id || (orgFilter as any)._id?.$in } : {};
        stats.completedAudits = await Audit.countDocuments(auditMatch);

        const discrepancies = await Audit.aggregate([
            { $match: auditMatch },
            { $group: { _id: null, total: { $sum: { $abs: "$discrepancy" } } } }
        ]);
        stats.activeDiscrepancies = discrepancies[0]?.total || 0;

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard statistics: ' + (error.message || '') },
            { status: 500 }
        );
    }
}
