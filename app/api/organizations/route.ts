import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import { auth } from '@/lib/auth';

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
            if (!user) {
                return NextResponse.json([]);
            }

            if (role === 'store_manager') {
                if (!user.organization) return NextResponse.json([]);
                query = { _id: user.organization };
            } else if (role === 'auditor') {
                if (!user.organizations || user.organizations.length === 0) {
                    // Fallback to single organization if legacy auditor
                    if (user.organization) {
                        query = { _id: user.organization };
                    } else {
                        return NextResponse.json([]);
                    }
                } else {
                    query = { _id: { $in: user.organizations } };
                }
            }
        }

        const organizations = await Organization.find(query).sort({ name: 1 });

        return NextResponse.json(organizations);
    } catch (error: any) {
        console.error('Error fetching organizations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch organizations' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { name, code, email, phone, address } = await request.json();

        if (!name || !code) {
            return NextResponse.json(
                { error: 'Name and Code are required' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if code exists
        const existingOrg = await Organization.findOne({ code: code.toUpperCase() });
        if (existingOrg) {
            return NextResponse.json(
                { error: 'Organization with this code already exists' },
                { status: 400 }
            );
        }

        const organization = await Organization.create({
            name,
            code: code.toUpperCase(),
            email,
            phone,
            address,
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Organization created successfully',
                organization,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating organization:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create organization' },
            { status: 500 }
        );
    }
}
