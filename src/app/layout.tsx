import type { Metadata } from 'next'
import { RouteLoadingProvider } from '@/components/ui/RouteLoading'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'siKasta',
  description: 'Sistem Kas dan Tabungan SMP Negeri 1 Dlanggu',
  icons: {
    icon: '/logo-spensagu.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-gray-50">
        <RouteLoadingProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </RouteLoadingProvider>
      </body>
    </html>
  )
}
