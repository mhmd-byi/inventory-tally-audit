import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import User from '@/models/User'
import { auth } from '@/lib/auth'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session || !['admin', 'lead_auditor'].includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { id } = resolvedParams

    await dbConnect()

    // Lead Auditor restrictions
    if (session.user?.role === 'lead_auditor') {
      const targetUser = await User.findById(id)
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      if (targetUser.role !== 'auditor') {
        return NextResponse.json({ error: 'Lead Auditors can only delete Auditor accounts' }, { status: 403 })
      }
      if (targetUser.organization?.toString() !== session.user.organization) {
        return NextResponse.json({ error: 'You can only delete users from your own organization' }, { status: 403 })
      }
    }

    // Get the current logged in user's ID safely
    const currentUserId = (session.user as any).id

    console.log(`Delete request: Attempting to delete user ${id}. Current user: ${currentUserId}`)

    // Prevent user from deleting themselves
    if (currentUserId === id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    const deletedUser = await User.findByIdAndDelete(id)

    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}
