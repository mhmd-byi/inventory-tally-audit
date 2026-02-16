import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { auth } from '@/lib/auth';

const { ChecklistResponse } = require('@/models/Checklist');

// Get checklist response for a specific warehouse
export async function GET(
    request: Request,
    { params }: { params: Promise<{ warehouseId: string }> }
) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { warehouseId } = await params;

        await dbConnect();

        const response = await ChecklistResponse.findOne({ warehouse: warehouseId })
            .populate('completedBy', 'name email')
            .populate('warehouse', 'name code');

        if (!response) {
            return NextResponse.json({ message: 'No checklist response found' }, { status: 404 });
        }

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error fetching checklist response:', error);
        return NextResponse.json({ error: 'Failed to fetch checklist response' }, { status: 500 });
    }
}
