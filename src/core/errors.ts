export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'MAINTENANCE'
  | 'BUSINESS_RULE_VIOLATION'

export class AppError extends Error {
  status: number
  code: AppErrorCode
  details?: unknown

  constructor(message: string, status: number, code: AppErrorCode, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const appErrors = {
  unauthenticated(message = 'Silakan login terlebih dahulu') {
    return new AppError(message, 401, 'UNAUTHENTICATED')
  },
  forbidden(message = 'Akses ditolak') {
    return new AppError(message, 403, 'FORBIDDEN')
  },
  validation(message = 'Data tidak valid', details?: unknown) {
    return new AppError(message, 400, 'VALIDATION_ERROR', details)
  },
  notFound(message: string) {
    return new AppError(message, 404, 'NOT_FOUND')
  },
  conflict(message: string, details?: unknown) {
    return new AppError(message, 409, 'CONFLICT', details)
  },
  maintenance(message: string) {
    return new AppError(message, 503, 'MAINTENANCE')
  },
  businessRule(message: string, details?: unknown) {
    return new AppError(message, 400, 'BUSINESS_RULE_VIOLATION', details)
  },
}
