import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeachingAssignmentAccess } from '@/lib/teacherAccess'
import { errorResponse } from '@/core/http/errors'
import { createGradeExportBuffer, slugifyExportName } from '@/lib/schoolExcelExport'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
    const { user, assignment } = await requireTeachingAssignmentAccess(assignmentId)
    const { searchParams } = new URL(request.url)
    const semester = searchParams.get('semester') || undefined

    const [students, assessments] = await Promise.all([
      prisma.student.findMany({
        where: {
          classId: assignment.classId,
          status: { not: 'PINDAH' },
        },
        select: {
          id: true,
          name: true,
          nis: true,
          nisn: true,
          gender: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.assessment.findMany({
        where: {
          assignmentId,
          ...(semester ? { semester } : {}),
        },
        include: {
          records: {
            select: {
              studentId: true,
              score: true,
            },
          },
        },
        orderBy: [{ assessmentDate: 'asc' }, { createdAt: 'asc' }],
      }),
    ])

    const buffer = await createGradeExportBuffer({
      assignment,
      teacherName: user.name,
      semester,
      students: students.map(({ nis, ...student }) => ({
        ...student,
        nisn: student.nisn || nis || '',
      })),
      assessments,
    })
    const fileName = `rekap-nilai-${slugifyExportName(assignment.subject.name)}-${slugifyExportName(assignment.class.name)}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return errorResponse(error, 'Export grades error:')
  }
}
