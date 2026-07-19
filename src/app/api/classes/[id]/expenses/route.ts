import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getRequestAuditFields } from '@/lib/audit'
import { requireClassAccess } from '@/lib/authorize'
import { jsonResponse } from '@/lib/api'
import { appErrors } from '@/core/errors'
import { errorResponse } from '@/core/http/errors'
import {
  assertCanReadExpenses,
  createClassExpense,
  listClassExpenses,
} from '@/features/expenses/application/expensesUseCase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireClassAccess(id)
    assertCanReadExpenses(user)

    const { searchParams } = new URL(request.url)
    const expenses = await listClassExpenses(id, {
      year: searchParams.get('year'),
      month: searchParams.get('month'),
    })

    return jsonResponse({ expenses })
  } catch (error) {
    return errorResponse(error, 'List expenses error:')
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
    const expense = await createClassExpense(body, id, user, getRequestAuditFields(request))

    return jsonResponse({ expense }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Create expense error:')
  }
}
