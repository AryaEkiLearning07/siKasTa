import { NextRequest } from 'next/server'
import { jsonError, jsonResponse } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { buildAcademicYearMigrationPreview } from '@/lib/services/academicYearMigration'
import { academicYearMigrationSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return jsonError('Akses ditolak', 403)
    }

    const body = await request.json()
    const parsed = academicYearMigrationSchema.safeParse(body)

    if (!parsed.success) {
      return jsonError('Data tidak valid', 400, parsed.error.flatten())
    }

    const preview = await buildAcademicYearMigrationPreview(parsed.data)
    return jsonResponse({ preview })
  } catch (error) {
    console.error('Preview academic year migration error:', error)
    return jsonError('Terjadi kesalahan server', 500)
  }
}
