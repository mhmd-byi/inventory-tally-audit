import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Warehouse from '@/models/Warehouse';
import { auth } from '@/lib/auth';

// Ensure models are registered for population
import '@/models/Organization';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        await dbConnect();

        const warehouse = await Warehouse.findById(id).populate('organization', 'name code');
        if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

        return NextResponse.json(warehouse);
    } catch (error: any) {
        console.error('Error fetching warehouse:', error);
        return NextResponse.json({ error: 'Failed to fetch warehouse' }, { status: 500 });
    }
}
