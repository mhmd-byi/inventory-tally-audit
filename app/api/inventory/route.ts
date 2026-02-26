import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Stock from '@/models/Stock'
import Product from '@/models/Product'
import Warehouse from '@/models/Warehouse'
import User from '@/models/User'
import Audit from '@/models/Audit'
import { auth } from '@/lib/auth'
import mongoose from 'mongoose'

// Register models for population
import '@/models/Product'
import '@/models/Warehouse'
import '@/models/Audit'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const includeAudits = searchParams.get('includeAudits') === 'true'
    const getFullList = searchParams.get('getFullList') === 'true'

    await dbConnect()

    const role = session.user?.role
    const userId = session.user?.id

    if (role !== 'admin' && warehouseId) {
      const user = await User.findById(userId)
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      if (role === 'store_manager') {
        if (user.warehouse?.toString() !== warehouseId) {
          return NextResponse.json({ error: 'Unauthorized warehouse access' }, { status: 403 })
        }
      } else if (role === 'lead_auditor') {
        // Lead auditor can access any warehouse in their organization
        const Warehouse = (await import('@/models/Warehouse')).default
        const warehouse = await Warehouse.findById(warehouseId)
        if (!warehouse || warehouse.organization.toString() !== user.organization?.toString()) {
          return NextResponse.json({ error: 'Unauthorized warehouse access' }, { status: 403 })
        }
      } else if (role === 'auditor') {
        if (user.warehouses && user.warehouses.length > 0) {
          if (!user.warehouses.map((id: any) => id.toString()).includes(warehouseId)) {
            return NextResponse.json({ error: 'Unauthorized warehouse access' }, { status: 403 })
          }
        }
      }
    }

    if (getFullList && warehouseId) {
      // 1. Get Warehouse to find its organization
      const warehouse = await Warehouse.findById(warehouseId)
      if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })

      // 2. Get all products for that warehouse
      const products = await Product.find({ warehouse: warehouseId }).sort({ name: 1 })

      // 3. Get all stock records for this warehouse
      const stocks = await Stock.find({ warehouse: warehouseId })

      // 4. Get latest audit for each product in this warehouse
      const latestAudits = await Audit.aggregate([
        { $match: { warehouse: new mongoose.Types.ObjectId(warehouseId) } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$product',
            latestAudit: { $first: '$$ROOT' },
          },
        },
      ])

      // 5. Merge
      const inventory = products.map((product) => {
        const stock = stocks.find((s) => s.product.toString() === product._id.toString())
        const audit = latestAudits.find((a) => a._id.toString() === product._id.toString())
        return {
          product,
          quantity: stock ? stock.quantity : 0,
          bookStock: stock ? stock.bookStock : product.bookStock || 0,
          bookStockValue: stock ? (stock as any).bookStockValue : product.bookStockValue || 0,
          lastAuditDate: stock ? stock.lastAuditDate : audit ? audit.latestAudit.createdAt : null,
          lastAuditValue: audit ? audit.latestAudit.physicalQuantity : null,
          stockId: stock ? stock._id : null,
        }
      })

      return NextResponse.json(inventory)
    }

    let query: any = {}
    if (productId) query.product = productId
    if (warehouseId) query.warehouse = warehouseId

    const stock = await Stock.find(query)
      .populate('product', 'name sku unit bookStock')
      .populate('warehouse', 'name code')

    if (includeAudits && productId && warehouseId) {
      const audits = await Audit.find({ product: productId, warehouse: warehouseId })
        .populate('auditor', 'name')
        .sort({ createdAt: -1 })
      return NextResponse.json({ stock: stock[0] || null, audits })
    }

    return NextResponse.json(stock)
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session || !['admin', 'store_manager', 'auditor'].includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, warehouseId, quantity, bookStock, bookStockValue, type, notes } = body

    if (!productId || !warehouseId) {
      return NextResponse.json({ error: 'Product and Warehouse are required' }, { status: 400 })
    }

    await dbConnect()

    // 1. Fetch User and Warehouse for Security & Data context
    const user = await User.findById(session.user.id)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const warehouse = await Warehouse.findById(warehouseId)
    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })

    // 2. Role-based Security check
    if (session.user?.role !== 'admin') {
      if (session.user?.role === 'auditor' && user.warehouses && user.warehouses.length > 0) {
        if (!user.warehouses.map((id: any) => id.toString()).includes(warehouseId)) {
          return NextResponse.json({ error: 'Unauthorized warehouse access' }, { status: 403 })
        }
      } else {
        const allowedOrgs =
          user.organizations && user.organizations.length > 0
            ? user.organizations.map((id: any) => id.toString())
            : user.organization
              ? [user.organization.toString()]
              : []

        if (!allowedOrgs.includes(warehouse.organization.toString())) {
          return NextResponse.json({ error: 'Unauthorized organizational access' }, { status: 403 })
        }
      }
    }

    // 3. Process based on Role / Request Type
    let stock = await Stock.findOne({ product: productId, warehouse: warehouseId })

    // Ensure stock record exists
    if (!stock) {
      const product = await Product.findById(productId)
      stock = await Stock.create({
        product: productId,
        warehouse: warehouseId,
        quantity: 0,
        bookStock: bookStock !== undefined ? Number(bookStock) : product?.bookStock || 0,
        bookStockValue: bookStockValue !== undefined ? Number(bookStockValue) : product?.bookStockValue || 0,
      })
    } else {
      if (bookStock !== undefined && (type === 'bookUpdate' || session.user?.role === 'admin')) {
        stock.bookStock = Number(bookStock)
      }
      if (bookStockValue !== undefined && (type === 'bookValueUpdate' || session.user?.role === 'admin')) {
        ;(stock as any).bookStockValue = Number(bookStockValue)
      }
    }

    const isAuditRequest = type === 'audit' || session.user?.role === 'auditor' || session.user?.role === 'lead_auditor'

    if (isAuditRequest) {
      // Check if audit is initiated (Only check for regular auditors, admins/lead auditors might need to bypass for testing or control)
      if (session.user?.role === 'auditor' && warehouse.auditStatus !== 'in_progress') {
        return NextResponse.json(
          {
            error: 'Audit has not been initiated for this warehouse. Please contact your Lead Auditor.',
          },
          { status: 403 }
        )
      }

      // SAVE to Audit record, DO NOT delete or overwrite Stock quantity
      const physicalVal = Number(quantity)
      const systemVal = stock.quantity
      const discrepancy = physicalVal - systemVal

      const auditEntry = await Audit.create({
        product: productId,
        warehouse: warehouseId,
        organization: warehouse.organization,
        auditor: user._id,
        systemQuantity: systemVal,
        physicalQuantity: physicalVal,
        discrepancy: discrepancy,
        notes: notes || '',
      })

      // Update Stock's metadata but not its quantity
      stock.lastAuditDate = new Date()
      await stock.save()

      return NextResponse.json({
        success: true,
        message: 'Audit record submitted successfully',
        audit: auditEntry,
      })
    } else {
      // SYSTEM UPDATE (Stock level change)
      if (quantity !== undefined) {
        if (type === 'adjust') {
          stock.quantity += Number(quantity)
        } else {
          stock.quantity = Number(quantity)
        }
      }
      await stock.save()

      return NextResponse.json({
        success: true,
        message: 'System stock updated',
        stock,
      })
    }
  } catch (error: any) {
    console.error('Inventory Processing Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to process inventory' }, { status: 500 })
  }
}
