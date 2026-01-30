import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized. Only admins can edit book stock.' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { bookStock } = body;

        if (bookStock === undefined) {
            return NextResponse.json({ error: 'bookStock is required' }, { status: 400 });
        }

        await dbConnect();

        const product = await Product.findByIdAndUpdate(
            id,
            { bookStock: Number(bookStock) },
            { new: true }
        );

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error: any) {
        console.error('Error updating product:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}
