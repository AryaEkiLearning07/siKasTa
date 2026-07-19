import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getRequestAuditFields } from '@/lib/audit'
import { requireClassAccess } from '@/lib/authorize'
import { jsonResponse } from '@/lib/api'
import { appErrors } from '@/core/errors'
import { errorResponse } from '@/core/http/errors'
import { createClassStudent, listClassStudents } from '@/features/students/application/studentsUseCase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireClassAccess(id)

    const { searchParams } = new URL(request.url)
    const students = await listClassStudents(id, {
      year: searchParams.get('year'),
      month: searchParams.get('month'),
      status: searchParams.get('status'),
    })

    return jsonResponse({ students })
  } catch (error) {
    return errorResponse(error, 'List students error:')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw appErrors.unauthenticated()
    }

    const { id } = await params
    const body = await request.json()
    const result = await createClassStudent(body, id, user, getRequestAuditFields(request))

    if (result.type === 'import') {
      return jsonResponse({ count: result.count }, { status: 201 })
    }

    return jsonResponse({ student: result.student }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Create student error:')
  }
}
