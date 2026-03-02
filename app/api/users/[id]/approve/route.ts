import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import User from '@/models/User'
import { auth } from '@/lib/auth'

// PATCH /api/users/[id]/approve — Admin approves or rejects a pending user
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Only Admins can approve accounts' }, { status: 401 })
    }

    const { id } = await params
    const { action, note } = await request.json() // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject".' }, { status: 400 })
    }

    await dbConnect()

    const user = await User.findById(id)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (action === 'approve') {
      ;(user as any).isActive = true
      ;(user as any).approvalStatus = 'approved'
      ;(user as any).approvedBy = session.user.id
      ;(user as any).approvalNote = note || ''
    } else {
      ;(user as any).isActive = false
      ;(user as any).approvalStatus = 'rejected'
      ;(user as any).approvedBy = session.user.id
      ;(user as any).approvalNote = note || 'Account rejected by admin.'
    }

    await user.save()

    return NextResponse.json({
      success: true,
      message: `Account ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
    })
  } catch (error: any) {
    console.error('Error approving user:', error)
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}
