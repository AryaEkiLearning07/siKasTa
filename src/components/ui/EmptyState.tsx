'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from './Button'
import type { ButtonProps } from './Button'
import { cn } from '@/lib/utils'

type EmptyStateAction =
  | { label: string; onClick: () => void; href?: never; variant?: ButtonProps['variant'] }
  | { label: string; href: string; onClick?: never; variant?: ButtonProps['variant'] }

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description: string
  variant?: 'default' | 'error' | 'empty' | 'no-access'
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  size?: 'sm' | 'md'
  className?: string
}

const ICONS: Record<NonNullable<EmptyStateProps['variant']>, React.ReactNode> = {
  default: (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 016.586 13H4" />
    </svg>
  ),
  error: (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  empty: (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 016.586 13H4" />
    </svg>
  ),
  'no-access': (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
}

export function EmptyState({
  icon,
  title,
  description,
  variant = 'empty',
  action,
  secondaryAction,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const role = variant === 'error' ? 'alert' : 'status'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        size === 'sm' ? 'py-8' : 'py-16',
        className
      )}
      role={role}
    >
      <div
        className={cn(
          'mb-4 rounded-full p-4',
          variant === 'error' && 'bg-danger-bg text-danger',
          variant === 'no-access' && 'bg-warning-bg text-warning',
          (variant === 'default' || variant === 'empty') && 'bg-neutral-100 text-neutral-400'
        )}
      >
        {icon || ICONS[variant]}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-brand-ink">{title}</h3>
      <p className="mb-6 max-w-sm text-neutral-500">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {secondaryAction && <EmptyStateActionButton action={secondaryAction} fallbackVariant="secondary" />}
          {action && <EmptyStateActionButton action={action} fallbackVariant="primary" />}
        </div>
      )}
    </div>
  )
}

function EmptyStateActionButton({
  action,
  fallbackVariant,
}: {
  action: EmptyStateAction
  fallbackVariant: ButtonProps['variant']
}) {
  const variant = action.variant || fallbackVariant

  if ('href' in action && action.href) {
    return (
      <Link
        href={action.href}
        className={cn(
          'inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2',
          variant === 'primary' && 'bg-brand-green text-white shadow-sm hover:bg-brand-greenDark hover:shadow-md',
          variant === 'secondary' && 'border-2 border-neutral-200 bg-white text-brand-ink hover:border-neutral-300 hover:bg-neutral-50',
          variant === 'danger' && 'bg-danger text-white shadow-sm hover:bg-red-700 hover:shadow-md',
          variant === 'ghost' && 'text-brand-ink hover:bg-neutral-100',
          variant === 'outline' && 'border border-brand-green bg-transparent text-brand-green hover:bg-brand-green-bg'
        )}
      >
        {action.label}
      </Link>
    )
  }

  return (
    <Button onClick={action.onClick} variant={variant}>
      {action.label}
    </Button>
  )
}
