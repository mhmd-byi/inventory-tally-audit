import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Warehouse from '@/models/Warehouse'
import { auth } from '@/lib/auth'

// Ensure models are registered for population
import '@/models/Organization'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    await dbConnect()

    const warehouse = await Warehouse.findById(id).populate('organization', 'name code')
    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })

    // Security check for non-admins
    if (session.user?.role !== 'admin') {
      const User = (await import('@/models/User')).default
      const user = await User.findById(session.user.id)
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      if (session.user?.role === 'store_manager') {
        if (user.warehouse?.toString() !== id) {
          return NextResponse.json({ error: 'Unauthorized warehouse access' }, { status: 403 })
        }
      } else if (session.user?.role === 'auditor') {
        const isAssigned = user.warehouses?.some((whId: any) => whId.toString() === id)
        if (!isAssigned) {
          // Fallback to org-level check for legacy auditors
          const allowedOrgs =
            user.organizations && user.organizations.length > 0
              ? user.organizations.map((oid: any) => oid.toString())
              : user.organization
                ? [user.organization.toString()]
                : []

          if (!allowedOrgs.includes(warehouse.organization._id.toString())) {
            return NextResponse.json({ error: 'Unauthorized warehouse access' }, { status: 403 })
          }
        }
      }
    }

    return NextResponse.json(warehouse)
  } catch (error: any) {
    console.error('Error fetching warehouse:', error)
    return NextResponse.json({ error: 'Failed to fetch warehouse' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    await dbConnect()

    const warehouse = await Warehouse.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate('organization', 'name code')

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
    }

    return NextResponse.json(warehouse)
  } catch (error: any) {
    console.error('Error updating warehouse:', error)
    return NextResponse.json({ error: error.message || 'Failed to update warehouse' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await dbConnect()

    const deletedWarehouse = await Warehouse.findByIdAndDelete(id)

    if (!deletedWarehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Warehouse deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting warehouse:', error)
    return NextResponse.json({ error: 'Failed to delete warehouse' }, { status: 500 })
  }
}
