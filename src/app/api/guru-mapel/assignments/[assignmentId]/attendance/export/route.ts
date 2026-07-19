import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { appErrors } from '@/core/errors'
import { errorResponse } from '@/core/http/errors'
import { parseDateOnly } from '@/lib/academic'
import { createAttendanceExportBuffer, slugifyExportName } from '@/lib/schoolExcelExport'
import { prisma } from '@/lib/prisma'
import { requireTeachingAssignmentAccess } from '@/lib/teacherAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
    const { user, assignment } = await requireTeachingAssignmentAccess(assignmentId)
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const parsed = z.object({
      from: dateOnlySchema.optional().nullable(),
      to: dateOnlySchema.optional().nullable(),
    }).safeParse({ from, to })

    if (!parsed.success) {
      throw appErrors.validation('Data tidak valid', parsed.error.flatten())
    }

    const [students, sessions] = await Promise.all([
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
      prisma.attendanceSession.findMany({
        where: {
          assignmentId,
          ...(parsed.data.from || parsed.data.to ? {
            date: {
              ...(parsed.data.from ? { gte: parseDateOnly(parsed.data.from) } : {}),
              ...(parsed.data.to ? { lte: parseDateOnly(parsed.data.to) } : {}),
            },
          } : {}),
        },
        include: {
          records: {
            select: {
              studentId: true,
              status: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { meetingNumber: 'asc' }],
      }),
    ])

    const buffer = await createAttendanceExportBuffer({
      assignment,
      teacherName: user.name,
      students: students.map(({ nis, ...student }) => ({
        ...student,
        nisn: student.nisn || nis || '',
      })),
      sessions,
    })
    const fileName = `absensi-${slugifyExportName(assignment.subject.name)}-${slugifyExportName(assignment.class.name)}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return errorResponse(error, 'Export attendance error:')
  }
}
