import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { getMaintenanceState } from '@/lib/maintenance'
import { hashPassword, passwordHashNeedsUpgrade, verifyPassword } from '@/lib/password'
import { appErrors } from '@/core/errors'
import type { RequestAuditContext } from '@/core/audit/context'

export type LoginUser = {
  id: string
  name: string
  username: string
  role: 'ADMIN' | 'KEPALA_SEKOLAH' | 'GURU' | 'WALI_KELAS' | 'BENDAHARA'
  classId: string | null
}

export type LoginResult = {
  user: LoginUser
  passwordHash: string
}

export async function authenticateLogin(input: unknown, auditContext: RequestAuditContext): Promise<LoginResult> {
  const maintenance = await getMaintenanceState()
  if (maintenance.enabled) {
    throw appErrors.maintenance(maintenance.reason || 'Sistem sedang maintenance. Silakan coba lagi nanti.')
  }

  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    throw appErrors.validation('Data tidak valid', parsed.error.flatten())
  }

  const { username, password } = parsed.data
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      passwordHash: true,
      role: true,
      classId: true,
    },
  })

  if (!user || !user.passwordHash) {
    await recordLoginFailure(username, user?.id || null, auditContext)
    throw appErrors.unauthenticated('Username atau password salah')
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    await recordLoginFailure(username, user.id, auditContext)
    throw appErrors.unauthenticated('Username atau password salah')
  }

  return { user, passwordHash: user.passwordHash }
}

export function upgradePasswordHashAfterLogin(userId: string, password: string, currentHash: string) {
  if (!passwordHashNeedsUpgrade(currentHash)) return

  void hashPassword(password)
    .then((passwordHash) => prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }))
    .catch((error) => console.error('Password hash upgrade failed:', error))
}

export function recordLoginSuccess(user: LoginUser, auditContext: RequestAuditContext) {
  void createAuditLog(prisma, {
    eventType: 'AUTH',
    eventAction: 'login_success',
    status: 'SUCCESS',
    severity: 'LOW',
    actorId: user.id,
    actorRole: user.role,
    entityType: 'User',
    entityId: user.id,
    classId: user.classId,
    ...auditContext,
  }).catch((error) => console.error('Login success audit write failed:', error))
}

async function recordLoginFailure(username: string, userId: string | null, auditContext: RequestAuditContext) {
  await createAuditLog(prisma, {
    eventType: 'AUTH',
    eventAction: 'login_failed',
    status: 'FAILED',
    severity: 'MEDIUM',
    entityType: 'User',
    entityId: userId,
    ...auditContext,
    metadata: {
      username,
      reason: 'invalid_credentials',
    },
  }).catch((error) => console.error('Login failed audit write failed:', error))
}
