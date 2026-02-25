import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Warehouse from '@/models/Warehouse';
import { auth } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const organizationId = formData.get('organizationId') as string;

        if (!file || !organizationId) {
            return NextResponse.json({ error: 'File and Organization ID are required' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'No data found in file' }, { status: 400 });
        }

        await dbConnect();

        const results = {
            success: 0,
            skipped: 0,
            errors: [] as string[]
        };

        for (const row of (data as any[])) {
            const name = row.Name || row.name || row['Warehouse Name'];
            const code = row.Code || row.code || row['Warehouse Code'];
            const location = row.Location || row.location || '';
            const address = row.Address || row.address || '';

            if (!name || !code) {
                results.errors.push(`Row ${data.indexOf(row) + 2}: Missing name or code`);
                results.skipped++;
                continue;
            }

            try {
                const normalizedCode = code.toString().toUpperCase().trim();
                const existing = await Warehouse.findOne({ code: normalizedCode });

                if (existing) {
                    results.skipped++;
                    results.errors.push(`Row ${data.indexOf(row) + 2}: Code ${normalizedCode} already exists`);
                    continue;
                }

                await Warehouse.create({
                    name: name.toString().trim(),
                    code: normalizedCode,
                    location: location.toString().trim(),
                    address: address.toString().trim(),
                    organization: organizationId,
                    status: 'active'
                });
                results.success++;
            } catch (err: any) {
                results.errors.push(`Row ${data.indexOf(row) + 2}: ${err.message}`);
                results.skipped++;
            }
        }

        return NextResponse.json({
            message: 'Bulk upload completed',
            summary: results
        });

    } catch (error: any) {
        console.error('Bulk upload error:', error);
        return NextResponse.json({ error: 'Failed to process bulk upload' }, { status: 500 });
    }
}
