import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { Role } from '@prisma/client'

export type SessionUser = {
  id: string
  name: string
  username: string
  role: Role
  classId: string | null
  teachingAssignments: SessionTeachingAssignment[]
  homeroomAssignments: SessionHomeroomAssignment[]
}

export type SessionTeachingAssignment = {
  id: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  tahunAjaran: string
}

export type SessionHomeroomAssignment = {
  id: string
  classId: string
  className: string
  tahunAjaran: string
}

const SESSION_COOKIE_NAME = 'spensakas_session'
const SESSION_EXPIRY_DAYS = 7

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS)

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return session.id
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionId) return null

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          classId: true,
          class: {
            select: {
              id: true,
              name: true,
              tahunAjaran: true,
            },
          },
          teachingAssignments: {
            where: { isActive: true },
            select: {
              id: true,
              classId: true,
              subjectId: true,
              tahunAjaran: true,
              class: {
                select: { name: true },
              },
              subject: {
                select: { name: true },
              },
            },
            orderBy: [
              { class: { tingkat: 'asc' } },
              { class: { name: 'asc' } },
              { subject: { name: 'asc' } },
            ],
          },
          homeroomAssignments: {
            where: { isActive: true },
            select: {
              id: true,
              classId: true,
              tahunAjaran: true,
              class: {
                select: { name: true },
              },
            },
            orderBy: [
              { class: { tingkat: 'asc' } },
              { class: { name: 'asc' } },
            ],
          },
        },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: sessionId } })
      cookieStore.delete(SESSION_COOKIE_NAME)
    }
    return null
  }

  const { class: legacyClass, teachingAssignments, homeroomAssignments, ...user } = session.user
  const normalizedHomeroomAssignments: SessionHomeroomAssignment[] = homeroomAssignments.map((assignment) => ({
    id: assignment.id,
    classId: assignment.classId,
    className: assignment.class.name,
    tahunAjaran: assignment.tahunAjaran,
  }))

  if (
    user.role === 'WALI_KELAS' &&
    user.classId &&
    !normalizedHomeroomAssignments.some((assignment) => assignment.classId === user.classId)
  ) {
    normalizedHomeroomAssignments.push({
      id: `legacy-${user.classId}`,
      classId: user.classId,
      className: legacyClass?.name || 'Kelas',
      tahunAjaran: legacyClass?.tahunAjaran || '',
    })
  }

  return {
    ...user,
    teachingAssignments: teachingAssignments.map((assignment) => ({
      id: assignment.id,
      classId: assignment.classId,
      className: assignment.class.name,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject.name,
      tahunAjaran: assignment.tahunAjaran,
    })),
    homeroomAssignments: normalizedHomeroomAssignments,
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
    cookieStore.delete(SESSION_COOKIE_NAME)
  }
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export function requireAuth(user: SessionUser | null): asserts user is SessionUser {
  if (!user) {
    throw new AuthError('Silakan login terlebih dahulu')
  }
}

export function requireRole(user: SessionUser, roles: Role[]): void {
  requireAuth(user)
  if (!roles.includes(user.role)) {
    throw new AuthError('Anda tidak memiliki akses ke fitur ini')
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}
