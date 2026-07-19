import { appErrors } from '@/core/errors'
import { getCurrentUser, type SessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function requireTeachingAssignmentAccess(assignmentId: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw appErrors.unauthenticated()
  }

  const assignment = await prisma.teachingAssignment.findFirst({
    where: {
      id: assignmentId,
      teacherId: user.id,
      isActive: true,
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          tingkat: true,
          tahunAjaran: true,
          members: {
            where: { role: 'WALI_KELAS' },
            select: { id: true, name: true },
            take: 1,
          },
        },
      },
      subject: {
        select: { id: true, name: true },
      },
    },
  })

  if (!assignment) {
    throw appErrors.forbidden('Anda tidak memiliki akses ke kelas atau mata pelajaran ini')
  }

  return { user, assignment }
}

export function isHomeroomTeacherForClass(user: SessionUser, classId: string) {
  if (user.role === 'ADMIN') return true
  if (user.role === 'WALI_KELAS' && user.classId === classId) return true
  return user.homeroomAssignments.some((assignment) => assignment.classId === classId)
}
