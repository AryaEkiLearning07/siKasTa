import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { appErrors } from '@/core/errors'
import { errorResponse } from '@/core/http/errors'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { parseDateOnly } from '@/lib/academic'
import { prisma } from '@/lib/prisma'
import { requireTeachingAssignmentAccess } from '@/lib/teacherAccess'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid')

const gradeSaveSchema = z.object({
  assessmentId: z.string().optional().nullable(),
  title: z.string().trim().min(1, 'Nama penilaian wajib diisi'),
  type: z.enum(['TUGAS', 'UH', 'UTS', 'UAS', 'PRAKTIK', 'SIKAP', 'LAINNYA']),
  semester: z.string().trim().min(1, 'Semester wajib diisi'),
  assessmentDate: dateOnlySchema,
  records: z.array(z.object({
    studentId: z.string().min(1),
    score: z.number().min(0).max(100).nullable(),
    note: z.string().max(255).optional().nullable(),
  })).min(1, 'Minimal satu nilai siswa wajib diisi'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
    await requireTeachingAssignmentAccess(assignmentId)
    const { searchParams } = new URL(request.url)
    const semester = searchParams.get('semester')

    const assessments = await prisma.assessment.findMany({
      where: {
        assignmentId,
        ...(semester ? { semester } : {}),
      },
      select: {
        id: true,
        title: true,
        type: true,
        semester: true,
        assessmentDate: true,
        records: {
          select: {
            id: true,
            studentId: true,
            score: true,
            note: true,
          },
        },
      },
      orderBy: [{ assessmentDate: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(
      { assessments },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return errorResponse(error, 'List grades error:')
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
    const parsed = gradeSaveSchema.safeParse(body)

    if (!parsed.success) {
      throw appErrors.validation('Data tidak valid', parsed.error.flatten())
    }

    const { assessmentId, title, type, semester, assessmentDate, records } = parsed.data
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

    if (assessmentId) {
      const existingAssessment = await prisma.assessment.findFirst({
        where: { id: assessmentId, assignmentId },
        select: { id: true },
      })

      if (!existingAssessment) {
        throw appErrors.notFound('Penilaian tidak ditemukan')
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const assessment = assessmentId
        ? await tx.assessment.update({
            where: { id: assessmentId },
            data: {
              title,
              type,
              semester,
              assessmentDate: parseDateOnly(assessmentDate),
            },
          })
        : await tx.assessment.create({
            data: {
              assignmentId,
              teacherId: user.id,
              classId: assignment.classId,
              subjectId: assignment.subjectId,
              title,
              type,
              semester,
              assessmentDate: parseDateOnly(assessmentDate),
            },
          })

      for (const record of records) {
        await tx.gradeRecord.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: assessment.id,
              studentId: record.studentId,
            },
          },
          update: {
            score: record.score,
            note: record.note || null,
          },
          create: {
            assessmentId: assessment.id,
            studentId: record.studentId,
            score: record.score,
            note: record.note || null,
          },
        })
      }

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: assessmentId ? 'grade_assessment_updated' : 'grade_assessment_created',
        status: 'SUCCESS',
        severity: 'LOW',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'Assessment',
        entityId: assessment.id,
        classId: assignment.classId,
        ...getRequestAuditFields(request),
        metadata: {
          title,
          type,
          semester,
          assessmentDate,
          subjectId: assignment.subjectId,
          subjectName: assignment.subject.name,
          className: assignment.class.name,
          recordCount: records.length,
        },
      })

      return tx.assessment.findUnique({
        where: { id: assessment.id },
        include: {
          records: {
            select: {
              id: true,
              studentId: true,
              score: true,
              note: true,
            },
          },
        },
      })
    })

    return NextResponse.json(
      { assessment: result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return errorResponse(error, 'Save grades error:')
  }
}
