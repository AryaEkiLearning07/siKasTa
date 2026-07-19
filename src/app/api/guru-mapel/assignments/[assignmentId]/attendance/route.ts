import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { appErrors } from '@/core/errors'
import { errorResponse } from '@/core/http/errors'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { canEditDailyEntry, parseDateOnly } from '@/lib/academic'
import { prisma } from '@/lib/prisma'
import { requireTeachingAssignmentAccess } from '@/lib/teacherAccess'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid')

const attendanceSaveSchema = z.object({
  date: dateOnlySchema,
  meetingNumber: z.number().int().min(1).max(12).default(1),
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(['H', 'I', 'S', 'A']),
    note: z.string().max(255).optional().nullable(),
  })).min(1, 'Minimal satu data siswa wajib diisi'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
    const { assignment } = await requireTeachingAssignmentAccess(assignmentId)
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const meetingNumber = Number(searchParams.get('meetingNumber') || 1)

    const parsed = z.object({
      date: dateOnlySchema,
      meetingNumber: z.number().int().min(1).max(12),
    }).safeParse({ date, meetingNumber })

    if (!parsed.success) {
      throw appErrors.validation('Data tidak valid', parsed.error.flatten())
    }

    const [students, session] = await Promise.all([
      prisma.student.findMany({
        where: {
          classId: assignment.classId,
          status: { not: 'PINDAH' },
        },
        select: { id: true, name: true, nisn: true, status: true },
        orderBy: { name: 'asc' },
      }),
      prisma.attendanceSession.findFirst({
        where: {
          assignmentId,
          date: parseDateOnly(parsed.data.date),
          meetingNumber: parsed.data.meetingNumber,
        },
        include: {
          records: {
            select: {
              id: true,
              studentId: true,
              status: true,
              note: true,
            },
          },
        },
      }),
    ])

    const recordByStudentId = new Map((session?.records || []).map((record) => [record.studentId, record]))
    const records = students.map((student) => ({
      id: recordByStudentId.get(student.id)?.id || null,
      studentId: student.id,
      studentName: student.name,
      nisn: student.nisn,
      status: recordByStudentId.get(student.id)?.status || 'H',
      note: recordByStudentId.get(student.id)?.note || '',
    }))

    return NextResponse.json(
      {
        session: session ? {
          id: session.id,
          date,
          meetingNumber: session.meetingNumber,
          isLocked: session.isLocked,
        } : null,
        records,
        canEdit: canEditDailyEntry(parsed.data.date) && !session?.isLocked,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return errorResponse(error, 'Get attendance error:')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
    const { user, assignment } = await requireTeachingAssignmentAccess(assignmentId)
    const body = await request.json()
    const parsed = attendanceSaveSchema.safeParse(body)

    if (!parsed.success) {
      throw appErrors.validation('Data tidak valid', parsed.error.flatten())
    }

    const { date, meetingNumber, records } = parsed.data
    if (!canEditDailyEntry(date)) {
      throw appErrors.forbidden('Absensi tanggal sebelumnya hanya dapat dilihat')
    }

    const students = await prisma.student.findMany({
      where: {
        classId: assignment.classId,
        status: { not: 'PINDAH' },
      },
        select: { id: true },
    })
    const allowedStudentIds = new Set(students.map((student) => student.id))

    if (records.some((record) => !allowedStudentIds.has(record.studentId))) {
      throw appErrors.validation('Data siswa tidak sesuai dengan kelas ini')
    }

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.attendanceSession.upsert({
        where: {
          assignmentId_date_meetingNumber: {
            assignmentId,
            date: parseDateOnly(date),
            meetingNumber,
          },
        },
        update: {},
        create: {
          assignmentId,
          teacherId: user.id,
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          date: parseDateOnly(date),
          meetingNumber,
        },
      })

      if (session.isLocked) {
        throw appErrors.forbidden('Absensi ini sudah dikunci')
      }

      for (const record of records) {
        await tx.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: record.studentId,
            },
          },
          update: {
            status: record.status,
            note: record.note || null,
          },
          create: {
            sessionId: session.id,
            studentId: record.studentId,
            status: record.status,
            note: record.note || null,
          },
        })
      }

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'attendance_saved',
        status: 'SUCCESS',
        severity: 'LOW',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'AttendanceSession',
        entityId: session.id,
        classId: assignment.classId,
        ...getRequestAuditFields(request),
        metadata: {
          subjectId: assignment.subjectId,
          subjectName: assignment.subject.name,
          className: assignment.class.name,
          date,
          meetingNumber,
          recordCount: records.length,
        },
      })

      return session
    })

    return NextResponse.json(
      { session: result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return errorResponse(error, 'Save attendance error:')
  }
}
