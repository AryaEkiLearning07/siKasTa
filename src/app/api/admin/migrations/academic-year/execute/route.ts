import { NextRequest } from 'next/server'
import { jsonError, jsonResponse } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { AcademicYearMigrationError, executeAcademicYearMigration } from '@/lib/services/academicYearMigration'
import { executeAcademicYearMigrationSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return jsonError('Akses ditolak', 403)
    }

    const body = await request.json()
    const parsed = executeAcademicYearMigrationSchema.safeParse(body)

    if (!parsed.success) {
      return jsonError('Data tidak valid', 400, parsed.error.flatten())
    }

    const result = await executeAcademicYearMigration(parsed.data, user)
    return jsonResponse(result)
  } catch (error) {
    if (error instanceof AcademicYearMigrationError) {
      return jsonError(error.message, error.status)
    }

    console.error('Execute academic year migration error:', error)
    return jsonError('Terjadi kesalahan server', 500)
  }
}
