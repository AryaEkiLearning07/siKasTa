import { jsonError } from '@/lib/api'
import { AppError } from '../errors'

export function errorResponse(error: unknown, logLabel: string) {
  if (error instanceof AppError) {
    return jsonError(error.message, error.status, error.details)
  }

  console.error(logLabel, error)
  return jsonError('Terjadi kesalahan server', 500)
}
