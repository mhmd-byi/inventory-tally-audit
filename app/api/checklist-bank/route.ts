import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { auth } from '@/lib/auth';
const { QuestionBank, ChecklistTemplate } = require('@/models/Checklist');

export async function GET() {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const questions = await QuestionBank.find({ isActive: true }).sort({ category: 1, createdAt: -1 });
        return NextResponse.json(questions);
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch question bank' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || !['admin', 'lead_auditor'].includes(session.user?.role || '')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { category, question, responseType, action } = body;

        await dbConnect();

        // Special action to import from existing template
        if (action === 'import_from_template') {
            const template = await ChecklistTemplate.findOne({ isActive: true });
            if (!template) return NextResponse.json({ error: 'No active template found' }, { status: 404 });

            let importedCount = 0;
            for (const item of template.items) {
                // Check if already exists to avoid duplicates
                const exists = await QuestionBank.findOne({ question: item.question, category: item.category });
                if (!exists) {
                    await QuestionBank.create({
                        category: item.category,
                        question: item.question,
                        responseType: item.responseType || 'yes_no'
                    });
                    importedCount++;
                }
            }
            return NextResponse.json({ message: `Imported ${importedCount} questions from template` });
        }

        if (!category || !question) {
            return NextResponse.json({ error: 'Category and Question are required' }, { status: 400 });
        }
        const newQuestion = await QuestionBank.create({
            category,
            question,
            responseType: responseType || 'yes_no'
        });

        return NextResponse.json(newQuestion, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to add question to bank' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session || !['admin', 'lead_auditor'].includes(session.user?.role || '')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, category, question, responseType, isActive } = body;

        await dbConnect();
        const updated = await QuestionBank.findByIdAndUpdate(id, {
            category,
            question,
            responseType,
            isActive
        }, { new: true });

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        await dbConnect();
        await QuestionBank.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Question deleted' });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
    }
}
