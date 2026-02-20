import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Warehouse from '@/models/Warehouse';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        // Only lead_auditor and admin can initiate/close audits
        if (!session || !['lead_auditor', 'admin'].includes(session.user?.role || '')) {
            return NextResponse.json({ error: 'Unauthorized: Only Lead Auditors and Admins can control audits' }, { status: 401 });
        }

        const { id } = await params;
        const { action } = await request.json(); // 'initiate' or 'close' or 'reset'

        await dbConnect();

        const warehouse = await Warehouse.findById(id);
        if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

        if (action === 'initiate') {
            warehouse.auditStatus = 'in_progress';
            warehouse.auditInitiatedBy = new mongoose.Types.ObjectId(session.user.id);
            warehouse.auditInitiatedAt = new Date();
        } else if (action === 'close') {
            warehouse.auditStatus = 'completed';
        } else if (action === 'reset') {
            warehouse.auditStatus = 'not_started';
            warehouse.auditInitiatedBy = null;
            warehouse.auditInitiatedAt = null;
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        await warehouse.save();

        return NextResponse.json({
            success: true,
            message: `Audit ${action === 'initiate' ? 'initiated' : action === 'close' ? 'closed' : 'reset'} successfully`,
            warehouse
        });
    } catch (error: any) {
        console.error('Error controlling audit:', error);
        return NextResponse.json({ error: 'Failed to process audit control' }, { status: 500 });
    }
}
