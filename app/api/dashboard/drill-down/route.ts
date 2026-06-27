import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'

import '@/models/Organization'
import '@/models/Warehouse'
import '@/models/User'
import '@/models/Product'
import '@/models/Stock'
import '@/models/Audit'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await dbConnect()

    const Audit = mongoose.models.Audit
    const Warehouse = mongoose.models.Warehouse
    const Organization = mongoose.models.Organization
    const Product = mongoose.models.Product
    const Stock = mongoose.models.Stock
    const User = mongoose.models.User

    const { searchParams } = req.nextUrl
    const type = searchParams.get('type')

    const role = session.user?.role
    const userId = session.user?.id

    // Build the same org/warehouse scope as the stats route
    let auditMatch: any = {}
    let warehouseScope: any = {}

    if (role !== 'admin') {
      const user = await User.findById(userId)
      if (user) {
        if ((role === 'store_manager' || role === 'lead_auditor') && user.organization) {
          auditMatch.organization = user.organization
          if (role === 'store_manager' && user.warehouse) {
            warehouseScope = { _id: user.warehouse }
          } else {
            const whs = await Warehouse.find({ organization: user.organization }).select('_id')
            warehouseScope = { _id: { $in: whs.map((w: any) => w._id) } }
          }
        } else if (role === 'auditor' && user.organization) {
          auditMatch.organization = user.organization
          if (user.warehouses?.length) {
            warehouseScope = { _id: { $in: user.warehouses } }
          }
        }
      }
    }

    // --- type: warehouse — audits for a specific warehouse ---
    if (type === 'warehouse') {
      const warehouseId = searchParams.get('warehouseId')
      if (!warehouseId) return NextResponse.json({ error: 'warehouseId required' }, { status: 400 })

      const rows = await Audit.aggregate([
        { $match: { ...auditMatch, warehouse: new mongoose.Types.ObjectId(warehouseId) } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
        { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'prod' } },
        { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            productName: { $ifNull: ['$prod.name', 'Unknown'] },
            sku: { $ifNull: ['$prod.sku', '-'] },
            warehouseId: '$warehouse',
            systemQuantity: 1,
            physicalQuantity: 1,
            discrepancy: 1,
            createdAt: 1,
          },
        },
      ])
      return NextResponse.json(rows)
    }

    // --- type: audit-status — warehouses with a given auditStatus ---
    if (type === 'audit-status') {
      const statusParam = searchParams.get('status') // 'not_started' | 'in_progress' | 'completed'
      const statusFilter = statusParam === 'not_started' ? { $in: [null, 'not_started'] } : statusParam
      const filter: any = { auditStatus: statusFilter, ...warehouseScope }

      const warehouses = await Warehouse.find(filter)
        .populate('organization', 'name')
        .select('name code auditStatus organization')
        .lean()

      const rows = (warehouses as any[]).map((w) => ({
        warehouseId: w._id.toString(),
        name: w.name,
        code: w.code,
        organization: w.organization?.name || '-',
        auditStatus: w.auditStatus || 'not_started',
      }))
      return NextResponse.json(rows)
    }

    // --- type: audit-week — audits within a given week date range ---
    if (type === 'audit-week') {
      const from = searchParams.get('from')
      const to = searchParams.get('to')
      if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

      // Widen the window to the full week (Mon 00:00 → Sun 23:59)
      const fromDate = new Date(from)
      fromDate.setHours(0, 0, 0, 0)
      const toDate = new Date(to)
      toDate.setDate(toDate.getDate() + 6)
      toDate.setHours(23, 59, 59, 999)

      const rows = await Audit.aggregate([
        { $match: { ...auditMatch, createdAt: { $gte: fromDate, $lte: toDate } } },
        { $sort: { createdAt: -1 } },
        { $limit: 200 },
        { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'prod' } },
        { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'warehouses', localField: 'warehouse', foreignField: '_id', as: 'wh' } },
        { $unwind: { path: '$wh', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            productName: { $ifNull: ['$prod.name', 'Unknown'] },
            sku: { $ifNull: ['$prod.sku', '-'] },
            warehouseId: '$wh._id',
            warehouseName: { $ifNull: ['$wh.name', 'Unknown'] },
            systemQuantity: 1,
            physicalQuantity: 1,
            discrepancy: 1,
            createdAt: 1,
          },
        },
      ])
      return NextResponse.json(rows)
    }

    // --- type: product — audit history for a specific product ---
    if (type === 'product') {
      const productId = searchParams.get('productId')
      if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

      const rows = await Audit.aggregate([
        { $match: { ...auditMatch, product: new mongoose.Types.ObjectId(productId) } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
        { $lookup: { from: 'warehouses', localField: 'warehouse', foreignField: '_id', as: 'wh' } },
        { $unwind: { path: '$wh', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            warehouseId: '$wh._id',
            warehouseName: { $ifNull: ['$wh.name', 'Unknown'] },
            systemQuantity: 1,
            physicalQuantity: 1,
            discrepancy: 1,
            createdAt: 1,
          },
        },
      ])
      return NextResponse.json(rows)
    }

    // --- type: companies — list of organizations with warehouse count ---
    if (type === 'companies') {
      const orgFilter: any = Object.keys(auditMatch).length
        ? { _id: auditMatch.organization }
        : {}

      const orgs = await Organization.find(orgFilter).select('name code status createdAt').lean()

      const rows = await Promise.all(
        (orgs as any[]).map(async (org) => {
          const whCount = await Warehouse.countDocuments({ organization: org._id })
          return {
            orgId: org._id.toString(),
            name: org.name,
            code: org.code,
            warehouses: whCount,
            status: org.status || 'active',
            createdAt: org.createdAt,
          }
        })
      )
      return NextResponse.json(rows)
    }

    // --- type: products — all products visible to this user ---
    if (type === 'products') {
      const productFilter: any = {}
      if (Object.keys(warehouseScope).length) {
        const whIds = warehouseScope._id
          ? warehouseScope._id.$in ?? [warehouseScope._id]
          : []
        if (whIds.length) productFilter.warehouse = { $in: whIds }
      }
      if (auditMatch.organization) productFilter.organization = auditMatch.organization

      const rows = await Product.find(productFilter)
        .populate('warehouse', 'name')
        .select('name sku unit bookStock bookStockValue')
        .lean()

      return NextResponse.json(
        (rows as any[]).map((p) => ({
          warehouseId: (p.warehouse as any)?._id?.toString() ?? null,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          warehouse: (p.warehouse as any)?.name ?? '-',
          bookStock: p.bookStock ?? 0,
          bookStockValue: p.bookStockValue ?? 0,
        }))
      )
    }

    // --- type: stock — stock totals grouped by warehouse ---
    if (type === 'stock') {
      const stockMatch: any = {}
      if (Object.keys(warehouseScope).length) {
        const whIds = warehouseScope._id
          ? warehouseScope._id.$in ?? [warehouseScope._id]
          : []
        if (whIds.length) stockMatch.warehouse = { $in: whIds }
      }

      const rows = await Stock.aggregate([
        { $match: stockMatch },
        {
          $group: {
            _id: '$warehouse',
            totalQuantity: { $sum: '$quantity' },
            totalBookStock: { $sum: '$bookStock' },
            totalBookStockValue: { $sum: '$bookStockValue' },
            productCount: { $sum: 1 },
          },
        },
        { $lookup: { from: 'warehouses', localField: '_id', foreignField: '_id', as: 'wh' } },
        { $unwind: { path: '$wh', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'organizations', localField: 'wh.organization', foreignField: '_id', as: 'org' } },
        { $unwind: { path: '$org', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            warehouseId: '$_id',
            warehouse: { $ifNull: ['$wh.name', 'Unknown'] },
            organization: { $ifNull: ['$org.name', '-'] },
            products: '$productCount',
            totalQuantity: 1,
            totalBookStock: 1,
            totalBookStockValue: 1,
          },
        },
        { $sort: { totalQuantity: -1 } },
      ])
      return NextResponse.json(rows)
    }

    // --- type: discrepancies — all audit records with non-zero variance ---
    if (type === 'discrepancies') {
      const rows = await Audit.aggregate([
        { $match: { ...auditMatch, discrepancy: { $ne: 0 } } },
        { $sort: { createdAt: -1 } },
        { $limit: 200 },
        { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'prod' } },
        { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'warehouses', localField: 'warehouse', foreignField: '_id', as: 'wh' } },
        { $unwind: { path: '$wh', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            productName: { $ifNull: ['$prod.name', 'Unknown'] },
            sku: { $ifNull: ['$prod.sku', '-'] },
            warehouseId: '$wh._id',
            warehouseName: { $ifNull: ['$wh.name', 'Unknown'] },
            systemQuantity: 1,
            physicalQuantity: 1,
            discrepancy: 1,
            createdAt: 1,
          },
        },
      ])
      return NextResponse.json(rows)
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error: any) {
    console.error('Drill-down error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
