import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import { auth } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'store_manager')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const { id } = resolvedParams;

        await dbConnect();

        const organization = await Organization.findById(id);

        if (!organization) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(organization);
    } catch (error: any) {
        console.error('Error fetching organization:', error);
        return NextResponse.json(
            { error: 'Failed to fetch organization' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const { id } = resolvedParams;
        const body = await request.json();

        await dbConnect();

        const organization = await Organization.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });

        if (!organization) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(organization);
    } catch (error: any) {
        console.error('Error updating organization:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update organization' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const { id } = resolvedParams;

        await dbConnect();

        const deletedOrganization = await Organization.findByIdAndDelete(id);

        if (!deletedOrganization) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Organization deleted successfully',
        });
    } catch (error: any) {
        console.error('Error deleting organization:', error);
        return NextResponse.json(
            { error: 'Failed to delete organization' },
            { status: 500 }
        );
    }
}
