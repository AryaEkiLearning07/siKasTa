type EmptyContext = 'card' | 'table' | 'detail'

export const EMPTY_TABLE_VALUE = '–'

export function formatEmptyValue(value: string | null | undefined, context: EmptyContext = 'card'): string {
  if (value && value.trim()) return value

  if (context === 'card' || context === 'detail') {
    return 'Belum ada'
  }

  return EMPTY_TABLE_VALUE
}

export function formatTableCell(value: string | null | undefined, placeholder = EMPTY_TABLE_VALUE): string {
  return value && value.trim() ? value : placeholder
}
