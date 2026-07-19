import { cn } from '@/lib/utils'

type SpinnerProps = {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

export function Spinner({ size = 'md', label = 'Memuat', className }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center', className)}>
      <svg
        className={cn('animate-spin', sizeClasses[size])}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
