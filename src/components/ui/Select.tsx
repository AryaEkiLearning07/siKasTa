'use client'

import { forwardRef, useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
  wrapperClassName?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, wrapperClassName, required, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id || props.name || generatedId
    const hintId = hint ? `${selectId}-hint` : undefined
    const errorId = error ? `${selectId}-error` : undefined
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-brand-ink mb-1.5"
          >
            {label}
            {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            className={cn(
              'w-full cursor-pointer appearance-none rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-brand-ink transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green',
              'disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500',
              error
                ? 'border-danger focus:ring-danger focus:border-danger'
                : 'border-neutral-200 hover:border-neutral-300',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
        {hint && (
          <p id={hintId} className="mt-1.5 text-sm text-neutral-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-danger font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }
