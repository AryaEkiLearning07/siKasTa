import { NextRequest } from 'next/server'
import { createSession } from '@/lib/auth'
import { getRequestAuditFields } from '@/lib/audit'
import { jsonResponse } from '@/lib/api'
import { errorResponse } from '@/core/http/errors'
import {
  authenticateLogin,
  recordLoginSuccess,
  upgradePasswordHashAfterLogin,
} from '@/features/auth/application/loginUseCase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const password = readPassword(body)
    const { user, passwordHash } = await authenticateLogin(body, getRequestAuditFields(request))

    await createSession(user.id)
    upgradePasswordHashAfterLogin(user.id, password, passwordHash)
    recordLoginSuccess(user, getRequestAuditFields(request))

    return jsonResponse(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        classId: user.classId,
      }
    )
  } catch (error) {
    return errorResponse(error, 'Login error:')
  }
}

function readPassword(body: unknown) {
  if (!body || typeof body !== 'object' || !('password' in body)) return ''
  const password = (body as { password?: unknown }).password
  return typeof password === 'string' ? password : ''
}
