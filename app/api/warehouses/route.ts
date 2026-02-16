import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Warehouse from '@/models/Warehouse';
import User from '@/models/User';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('organizationId');

        await dbConnect();

        let query: any = {};

        if (session.user?.role === 'admin') {
            if (orgId) {
                query = { organization: orgId };
            }
        } else {
            const user = await User.findById(session.user.id);
            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

            if (session.user?.role === 'store_manager') {
                if (!user.organization) return NextResponse.json([]);
                if (user.warehouse) {
                    query = { _id: user.warehouse };
                } else {
                    query = { organization: user.organization };
                }

                if (orgId) {
                    query.organization = orgId;
                }
            } else if (session.user?.role === 'lead_auditor') {
                // Lead Auditor has access to all warehouses in their organization
                if (!user.organization) return NextResponse.json([]);
                query = { organization: user.organization };
                if (orgId && user.organization.toString() !== orgId) {
                    return NextResponse.json({ error: 'Unauthorized organization access' }, { status: 403 });
                }
            } else if (session.user?.role === 'auditor') {
                if (user.warehouses && user.warehouses.length > 0) {
                    query = { _id: { $in: user.warehouses } };
                    if (orgId) {
                        query.organization = orgId;
                    }
                } else {
                    const allowedOrgs = user.organizations && user.organizations.length > 0
                        ? user.organizations
                        : (user.organization ? [user.organization] : []);

                    if (allowedOrgs.length === 0) return NextResponse.json([]);

                    if (orgId) {
                        if (!allowedOrgs.map((id: any) => id.toString()).includes(orgId)) {
                            return NextResponse.json({ error: 'Unauthorized organization access' }, { status: 403 });
                        }
                        query = { organization: orgId };
                    } else {
                        query = { organization: { $in: allowedOrgs } };
                    }
                }
            }
        }

        const warehouses = await Warehouse.find(query).populate('organization').sort({ name: 1 });

        return NextResponse.json(warehouses);
    } catch (error: any) {
        console.error('Error fetching warehouses:', error);
        return NextResponse.json(
            { error: 'Failed to fetch warehouses' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'store_manager')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { name, code, organization: orgId, location, address } = await request.json();

        if (!name || !code || !orgId) {
            return NextResponse.json(
                { error: 'Name, Code, and Organization are required' },
                { status: 400 }
            );
        }

        await dbConnect();

        // If Store Manager, ensure they are creating for their own organization
        if (session.user?.role === 'store_manager') {
            const user = await User.findById(session.user.id);
            if (!user || user.organization?.toString() !== orgId) {
                return NextResponse.json(
                    { error: 'Unauthorized organization access' },
                    { status: 403 }
                );
            }
        }

        // Check if code exists
        const existingWarehouse = await Warehouse.findOne({ code: code.toUpperCase() });
        if (existingWarehouse) {
            return NextResponse.json(
                { error: 'Warehouse with this code already exists' },
                { status: 400 }
            );
        }

        const warehouse = await Warehouse.create({
            name,
            code: code.toUpperCase(),
            organization: orgId,
            location,
            address,
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Warehouse created successfully',
                warehouse,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating warehouse:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create warehouse' },
            { status: 500 }
        );
    }
}
