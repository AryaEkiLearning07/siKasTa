import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getRequestAuditFields } from '@/lib/audit'
import { jsonResponse } from '@/lib/api'
import { appErrors } from '@/core/errors'
import { errorResponse } from '@/core/http/errors'
import { toggleStudentPayment } from '@/features/payments/application/togglePaymentUseCase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw appErrors.unauthenticated()
    }

    const body = await request.json()
    const payment = await toggleStudentPayment(body, user, getRequestAuditFields(request))

    return jsonResponse({ payment })
  } catch (error) {
    return errorResponse(error, 'Toggle payment error:')
  }
}
