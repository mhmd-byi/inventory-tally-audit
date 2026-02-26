import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { auth } from '@/lib/auth'
import Warehouse from '@/models/Warehouse'

const { ChecklistTemplate, ChecklistResponse, QuestionBank } = require('@/models/Checklist')

// Get checklist template or warehouse specific questions
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')

    await dbConnect()

    if (warehouseId) {
      const warehouse = await Warehouse.findById(warehouseId)
      if (warehouse && warehouse.checklistQuestions && warehouse.checklistQuestions.length > 0) {
        return NextResponse.json({
          _id: `wh-${warehouseId}`,
          name: `${warehouse.name} Checklist`,
          items: warehouse.checklistQuestions,
        })
      }
      return NextResponse.json(
        {
          error:
            'Checklist not configured for this warehouse. Please contact your administrator to set up the checklist for this node.',
        },
        { status: 404 }
      )
    }

    // Default fallback to active template
    const template = await ChecklistTemplate.findOne({ isActive: true })

    if (!template) {
      return NextResponse.json({ error: 'No active checklist template found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error: any) {
    console.error('Error fetching checklist template:', error)
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 })
  }
}

// Create or update checklist response for a warehouse
export async function POST(request: Request) {
  try {
    const session = await auth()

    // Only lead_auditor and admin can fill checklists
    if (!session || !['lead_auditor', 'admin'].includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { warehouseId, items, status } = body

    await dbConnect()

    // Check if response already exists for this warehouse
    let response = await ChecklistResponse.findOne({ warehouse: warehouseId })

    if (response) {
      // Update existing response
      response.items = items
      response.status = status || 'in_progress'
      response.completedBy = session.user.id
      if (status === 'completed') {
        response.completedAt = new Date()
      }
      await response.save()
    } else {
      // Create new response
      response = await ChecklistResponse.create({
        warehouse: warehouseId,
        completedBy: session.user.id,
        items,
        status: status || 'pending',
        completedAt: status === 'completed' ? new Date() : undefined,
      })
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error saving checklist response:', error)
    return NextResponse.json({ error: 'Failed to save checklist' }, { status: 500 })
  }
}
