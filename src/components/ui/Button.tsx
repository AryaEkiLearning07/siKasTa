'use client'

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingText?: string
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

    const variants = {
      primary: 'bg-brand-green text-white hover:bg-brand-greenDark focus:ring-brand-green shadow-sm hover:shadow-md',
      secondary: 'bg-white text-brand-ink border-2 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 focus:ring-brand-green',
      danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger shadow-sm hover:shadow-md',
      ghost: 'text-brand-ink hover:bg-neutral-100 focus:ring-brand-green',
      outline: 'bg-transparent text-brand-green border border-brand-green hover:bg-brand-green-bg focus:ring-brand-green',
    }

    const sizes = {
      sm: 'min-h-8 px-3 py-1.5 text-sm',
      md: 'min-h-10 px-4 py-2 text-sm',
      lg: 'min-h-11 px-5 py-2.5 text-base',
    }

    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || undefined}
        {...props}
      >
        {isLoading && <Spinner size="sm" label={loadingText || 'Memproses'} />}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span className="truncate">{isLoading && loadingText ? loadingText : children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
