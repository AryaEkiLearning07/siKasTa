'use client'

import type { ReactNode, SVGProps } from 'react'
import { cn } from '@/lib/utils'

type IconName =
  | 'book'
  | 'calendar-check'
  | 'cash'
  | 'chevron-down'
  | 'chart'
  | 'coins'
  | 'download'
  | 'eye'
  | 'eye-off'
  | 'home'
  | 'logout'
  | 'menu'
  | 'money-in'
  | 'money-out'
  | 'plus'
  | 'settings'
  | 'receipt'
  | 'refresh'
  | 'search'
  | 'school'
  | 'shield-check'
  | 'users'
  | 'wallet'
  | 'x'

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number
}

const paths: Record<IconName, ReactNode> = {
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H7a3 3 0 0 0-3 3V5.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </>
  ),
  'calendar-check': (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 9h18" />
      <path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="m9 15 2 2 4-5" />
    </>
  ),
  cash: (
    <>
      <path d="M3 7h18v10H3z" />
      <path d="M7 7a4 4 0 0 1-4 4" />
      <path d="M17 7a4 4 0 0 0 4 4" />
      <path d="M7 17a4 4 0 0 0-4-4" />
      <path d="M17 17a4 4 0 0 1 4-4" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  'chevron-down': (
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-3" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.1 4.1" />
      <path d="M6.6 6.6C3.6 8.6 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.1-.8" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </>
  ),
  'money-in': (
    <>
      <path d="M3 7h18v10H3z" />
      <path d="M7 7a4 4 0 0 1-4 4" />
      <path d="M17 17a4 4 0 0 1 4-4" />
      <circle cx="12" cy="12" r="2" />
      <path d="M17 3v5h-5" />
      <path d="m17 8-6-6" />
    </>
  ),
  'money-out': (
    <>
      <path d="M3 7h18v10H3z" />
      <path d="M7 7a4 4 0 0 1-4 4" />
      <path d="M17 17a4 4 0 0 1 4-4" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 22h5v-5" />
      <path d="m11 16 6 6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 0 1-15.5 6.2" />
      <path d="M3 12A9 9 0 0 1 18.5 5.8" />
      <path d="M18 2v4h4" />
      <path d="M6 22v-4H2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  settings: (
    <>
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.36.4.7.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-.5 1Z" />
    </>
  ),
  school: (
    <>
      <path d="m3 10 9-6 9 6-9 6-9-6Z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      <path d="M21 10v6" />
    </>
  ),
  'shield-check': (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14" />
      <path d="M18 12h4v4h-4a2 2 0 0 1 0-4Z" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
}

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      className={cn('shrink-0', className)}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
