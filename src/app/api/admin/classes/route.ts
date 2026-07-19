import { NextRequest } from 'next/server'
import { jsonError, jsonResponse } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { AdminClassServiceError, createAdminClass, listAdminClasses } from '@/lib/services/adminClasses'
import { createClassSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'KEPALA_SEKOLAH')) {
      return jsonError('Akses ditolak', 403)
    }

    const { searchParams } = new URL(request.url)
    const classes = await listAdminClasses({ tahunAjaran: searchParams.get('tahunAjaran') })

    return jsonResponse({ classes })
  } catch (error) {
    console.error('List classes error:', error)
    return jsonError('Terjadi kesalahan server', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return jsonError('Akses ditolak', 403)
    }

    const body = await request.json()
    const parsed = createClassSchema.safeParse(body)

    if (!parsed.success) {
      return jsonError('Data tidak valid', 400, parsed.error.flatten())
    }

    const newClass = await createAdminClass(parsed.data, user, request)

    return jsonResponse({ class: newClass }, { status: 201 })
  } catch (error) {
    if (error instanceof AdminClassServiceError) {
      return jsonError(error.message, error.status, error.details)
    }

    console.error('Create class error:', error)
    return jsonError('Terjadi kesalahan server', 500)
  }
}
