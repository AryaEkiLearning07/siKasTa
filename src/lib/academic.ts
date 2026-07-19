export const APP_TIME_ZONE = 'Asia/Bangkok'

const currentDateFormatters = new Map<string, Intl.DateTimeFormat>()

function getCurrentDateFormatter(timeZone: string) {
  const existing = currentDateFormatters.get(timeZone)
  if (existing) return existing

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  currentDateFormatters.set(timeZone, formatter)
  return formatter
}

export function getCurrentDateString(timeZone = APP_TIME_ZONE): string {
  const parts = getCurrentDateFormatter(timeZone).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

export function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

export function formatDateOnly(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date
  return value.toISOString().slice(0, 10)
}

export function canEditDailyEntry(date: string): boolean {
  return date === getCurrentDateString()
}
