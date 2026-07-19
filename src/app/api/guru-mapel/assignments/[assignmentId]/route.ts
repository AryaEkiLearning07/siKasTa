import { NextResponse } from 'next/server'
import { errorResponse } from '@/core/http/errors'
import { requireTeachingAssignmentAccess } from '@/lib/teacherAccess'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
    const { assignment } = await requireTeachingAssignmentAccess(assignmentId)

    const [students, attendanceSessions, assessments] = await Promise.all([
      prisma.student.findMany({
        where: {
          classId: assignment.classId,
          status: { not: 'PINDAH' },
        },
        select: {
          id: true,
          name: true,
          nisn: true,
          status: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.attendanceSession.findMany({
        where: { assignmentId },
        select: {
          id: true,
          date: true,
          meetingNumber: true,
          isLocked: true,
          _count: {
            select: { records: true },
          },
        },
        orderBy: [{ date: 'desc' }, { meetingNumber: 'desc' }],
        take: 20,
      }),
      prisma.assessment.findMany({
        where: { assignmentId },
        select: {
          id: true,
          title: true,
          type: true,
          semester: true,
          assessmentDate: true,
          _count: {
            select: { records: true },
          },
        },
        orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      }),
    ])

    return NextResponse.json(
      {
        assignment,
        students,
        attendanceSessions,
        assessments,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return errorResponse(error, 'Get teacher assignment error:')
  }
}
