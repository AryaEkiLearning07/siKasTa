'use client'

import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  startAdornment?: ReactNode
  endAdornment?: ReactNode
  wrapperClassName?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, startAdornment, endAdornment, wrapperClassName, required, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || props.name || generatedId
    const hintId = hint ? `${inputId}-hint` : undefined
    const errorId = error ? `${inputId}-error` : undefined
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-brand-ink mb-1.5"
          >
            {label}
            {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {startAdornment && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
              {startAdornment}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            className={cn(
              'w-full rounded-lg border bg-white px-3.5 py-2.5 text-brand-ink transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green',
              'disabled:bg-neutral-100 disabled:cursor-not-allowed placeholder:text-neutral-400',
              Boolean(startAdornment) && 'pl-10',
              Boolean(endAdornment) && 'pr-10',
              error
                ? 'border-danger focus:ring-danger focus:border-danger'
                : 'border-neutral-200 hover:border-neutral-300',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            {...props}
          />
          {endAdornment && (
            <span className="absolute inset-y-0 right-3 flex items-center text-neutral-400">
              {endAdornment}
            </span>
          )}
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

Input.displayName = 'Input'

export { Input }
