'use client'

import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
}

const cardPadding: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, padding = 'md', interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-neutral-200 bg-white shadow-card',
        cardPadding[padding],
        interactive && 'transition-shadow hover:shadow-card-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)

Card.displayName = 'Card'

type CardHeaderProps = HTMLAttributes<HTMLDivElement>

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 border-b border-neutral-200 pb-4', className)} {...props}>
      {children}
    </div>
  )
}

type CardTitleProps = HTMLAttributes<HTMLHeadingElement>

export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-brand-ink', className)} {...props}>
      {children}
    </h3>
  )
}

type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>

export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn('mt-1 text-sm text-neutral-500', className)} {...props}>
      {children}
    </p>
  )
}

type CardContentProps = HTMLAttributes<HTMLDivElement>

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  )
}

type CardFooterProps = HTMLAttributes<HTMLDivElement>

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Card }
