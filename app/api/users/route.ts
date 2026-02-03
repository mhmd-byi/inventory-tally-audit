import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';

// Force register models by directly importing the JS files
import '@/models/Organization';
import '@/models/User';
import '@/models/Warehouse';

export async function GET() {
    try {
        const session = await auth();

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await dbConnect();

        // Get the model from mongoose to ensure we are using the one with the ref registered
        const UserModel = mongoose.models.User || User;

        const users = await UserModel.find({}, { password: 0 })
            .populate({
                path: 'organization',
                model: 'Organization',
                select: 'name code',
                options: { strictPopulate: false }
            })
            .populate({
                path: 'organizations',
                model: 'Organization',
                select: 'name code',
                options: { strictPopulate: false }
            })
            .populate({
                path: 'warehouse',
                model: 'Warehouse',
                select: 'name code',
                options: { strictPopulate: false }
            })
            .sort({ createdAt: -1 });

        return NextResponse.json(users);
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}
