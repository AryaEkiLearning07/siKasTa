import { NextRequest } from 'next/server'
import { requireClassAccess } from '@/lib/authorize'
import { jsonResponse } from '@/lib/api'
import { errorResponse } from '@/core/http/errors'
import { getClassSaldo } from '@/features/finance/application/classSaldoUseCase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireClassAccess(id)

    const { searchParams } = new URL(request.url)
    const saldo = await getClassSaldo(id, {
      year: searchParams.get('year'),
      month: searchParams.get('month'),
    })

    return jsonResponse(saldo)
  } catch (error) {
    return errorResponse(error, 'Get saldo error:')
  }
}
