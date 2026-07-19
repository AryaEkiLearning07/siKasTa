import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getRequestAuditFields } from '@/lib/audit'
import { jsonResponse } from '@/lib/api'
import { appErrors } from '@/core/errors'
import { errorResponse } from '@/core/http/errors'
import { deleteClassExpense } from '@/features/expenses/application/expensesUseCase'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw appErrors.unauthenticated()
    }

    const { id, expenseId } = await params
    await deleteClassExpense(id, expenseId, user, getRequestAuditFields(request))

    return jsonResponse({ ok: true })
  } catch (error) {
    return errorResponse(error, 'Delete expense error:')
  }
}
