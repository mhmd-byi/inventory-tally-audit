import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Warehouse from '@/models/Warehouse'
import User from '@/models/User'
import { auth } from '@/lib/auth'
import '@/models/Product'
import '@/models/Audit'
import mongoose from 'mongoose'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('organizationId')

    await dbConnect()

    let query: any = {}

    if (session.user?.role === 'admin') {
      if (orgId) {
        query = { organization: orgId }
      }
    } else {
      const user = await User.findById(session.user.id)
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      if (session.user?.role === 'store_manager') {
        if (!user.organization) return NextResponse.json([])
        if (user.warehouse) {
          query = { _id: user.warehouse }
        } else {
          query = { organization: user.organization }
        }

        if (orgId) {
          query.organization = orgId
        }
      } else if (session.user?.role === 'lead_auditor') {
        // Lead Auditor has access to all warehouses in their organization
        if (!user.organization) return NextResponse.json([])
        query = { organization: user.organization }
        if (orgId && user.organization.toString() !== orgId) {
          return NextResponse.json({ error: 'Unauthorized organization access' }, { status: 403 })
        }
      } else if (session.user?.role === 'auditor') {
        if (user.warehouses && user.warehouses.length > 0) {
          query = { _id: { $in: user.warehouses } }
          if (orgId) {
            query.organization = orgId
          }
        } else {
          const allowedOrgs =
            user.organizations && user.organizations.length > 0
              ? user.organizations
              : user.organization
                ? [user.organization]
                : []

          if (allowedOrgs.length === 0) return NextResponse.json([])

          if (orgId) {
            if (!allowedOrgs.map((id: any) => id.toString()).includes(orgId)) {
              return NextResponse.json({ error: 'Unauthorized organization access' }, { status: 403 })
            }
            query = { organization: orgId }
          } else {
            query = { organization: { $in: allowedOrgs } }
          }
        }
      }
    }

    const warehouses = await Warehouse.find(query).populate('organization').sort({ name: 1 })

    if (!warehouses.length) return NextResponse.json([])

    const Product = mongoose.models.Product
    const Audit = mongoose.models.Audit
    const warehouseIds = warehouses.map((w: any) => w._id)

    const [productCounts, auditedCounts] = await Promise.all([
      Product.aggregate([
        { $match: { warehouse: { $in: warehouseIds } } },
        { $group: { _id: '$warehouse', total: { $sum: 1 } } },
      ]),
      Audit.aggregate([
        { $match: { warehouse: { $in: warehouseIds } } },
        { $lookup: { from: 'warehouses', localField: 'warehouse', foreignField: '_id', as: 'wh' } },
        { $unwind: '$wh' },
        {
          $match: {
            $expr: { $gte: ['$createdAt', { $ifNull: ['$wh.auditInitiatedAt', new Date(0)] }] },
          },
        },
        { $group: { _id: { wh: '$warehouse', prod: '$product' } } },
        { $group: { _id: '$_id.wh', audited: { $sum: 1 } } },
      ]),
    ])

    const productMap: Record<string, number> = Object.fromEntries(
      productCounts.map((p: any) => [p._id.toString(), p.total])
    )
    const auditedMap: Record<string, number> = Object.fromEntries(
      auditedCounts.map((a: any) => [a._id.toString(), a.audited])
    )

    const result = warehouses.map((w: any) => {
      const obj = w.toObject()
      const id = w._id.toString()
      obj.totalProducts = productMap[id] ?? 0
      obj.auditedProducts = auditedMap[id] ?? 0
      return obj
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching warehouses:', error)
    return NextResponse.json({ error: 'Failed to fetch warehouses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'store_manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, code, organization: orgId, location, address } = await request.json()

    if (!name || !code || !orgId) {
      return NextResponse.json({ error: 'Name, Code, and Organization are required' }, { status: 400 })
    }

    await dbConnect()

    // If Store Manager, ensure they are creating for their own organization
    if (session.user?.role === 'store_manager') {
      const user = await User.findById(session.user.id)
      if (!user || user.organization?.toString() !== orgId) {
        return NextResponse.json({ error: 'Unauthorized organization access' }, { status: 403 })
      }
    }

    // Check if code exists
    const existingWarehouse = await Warehouse.findOne({ code: code.toUpperCase() })
    if (existingWarehouse) {
      return NextResponse.json({ error: 'Warehouse with this code already exists' }, { status: 400 })
    }

    const warehouse = await Warehouse.create({
      name,
      code: code.toUpperCase(),
      organization: orgId,
      location,
      address,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Warehouse created successfully',
        warehouse,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating warehouse:', error)
    return NextResponse.json({ error: error.message || 'Failed to create warehouse' }, { status: 500 })
  }
}
