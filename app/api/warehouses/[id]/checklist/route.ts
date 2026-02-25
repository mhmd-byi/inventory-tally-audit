import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { auth } from '@/lib/auth';
import Warehouse from '@/models/Warehouse';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || !['admin', 'lead_auditor'].includes(session.user?.role || '')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { questions } = await request.json(); // Array of question objects

        await dbConnect();

        const warehouse = await Warehouse.findByIdAndUpdate(
            id,
            { checklistQuestions: questions },
            { new: true }
        );

        if (!warehouse) {
            return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Checklist updated for warehouse',
            checklistQuestions: warehouse.checklistQuestions
        });
    } catch (error: any) {
        console.error('Error updating warehouse checklist:', error);
        return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 });
    }
}
