import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'store_manager')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const warehouseId = formData.get('warehouseId') as string;

        if (!file || !warehouseId) {
            return NextResponse.json({ error: 'File and Warehouse ID are required' }, { status: 400 });
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

        // Get organization from warehouse
        const Warehouse = (await import('@/models/Warehouse')).default;
        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
        const organizationId = warehouse.organization;

        const results = {
            success: 0,
            skipped: 0,
            errors: [] as string[]
        };

        for (const row of (data as any[])) {
            const name = row.Name || row.name || row['Product Name'];
            const sku = row.SKU || row.sku || row['Product SKU'];
            const unit = row.Unit || row.unit || 'pcs';
            const category = row.Category || row.category || '';
            const description = row.Description || row.description || '';
            const bookStock = row['Book Stock'] || row.book_stock || row.bookStock || 0;

            if (!name || !sku) {
                results.errors.push(`Row ${data.indexOf(row) + 2}: Missing name or SKU`);
                results.skipped++;
                continue;
            }

            try {
                const normalizedSku = sku.toString().toUpperCase().trim();
                const existing = await Product.findOne({ sku: normalizedSku, warehouse: warehouseId });

                if (existing) {
                    results.skipped++;
                    continue;
                }

                await Product.create({
                    name: name.toString().trim(),
                    sku: normalizedSku,
                    unit: unit.toString().trim(),
                    category: category.toString().trim(),
                    description: description.toString().trim(),
                    organization: organizationId,
                    warehouse: warehouseId,
                    status: 'active',
                    bookStock: Number(bookStock) || 0
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
