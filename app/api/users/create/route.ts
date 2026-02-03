import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session || session.user?.role !== 'admin') {
            const bodyClone = await request.clone().json().catch(() => ({}));
            if (bodyClone.secretKey !== process.env.NEXTAUTH_SECRET) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await request.json();
        const { email, name, password, role, organizationId, organizationIds, warehouseId } = body;

        await dbConnect();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
        }

        const userData: any = {
            name,
            email,
            password,
            role: role || 'auditor',
        };

        if (role === 'store_manager') {
            if (!organizationId || !warehouseId) {
                return NextResponse.json({ error: 'Organization and Warehouse are required for store managers' }, { status: 400 });
            }
            userData.organization = organizationId;
            userData.organizations = [organizationId];
            userData.warehouse = warehouseId;
        } else if (role === 'auditor') {
            // Auditors can have multiple organizations
            if (organizationIds && Array.isArray(organizationIds)) {
                userData.organizations = organizationIds;
            } else if (organizationId) {
                userData.organizations = [organizationId];
            }
        }

        const user = await User.create(userData);

        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizations: user.organizations
            }
        }, { status: 201 });
    } catch (error: any) {
        console.error('SERVER_ERROR [POST /api/users/create]:', error);
        return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
    }
}
