'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { useRouteLoading } from '@/components/ui/RouteLoading'
import { getDashboardRoute } from '@/lib/routes'

export default function LoginPage() {
  const router = useRouter()
  const { startRouteLoading } = useRouteLoading()
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setFormMessage(null)

    if (!username) {
      setErrors({ username: 'Username wajib diisi' })
      setFormMessage({ type: 'error', text: 'Username wajib diisi' })
      return
    }
    if (!password) {
      setErrors({ password: 'Password wajib diisi' })
      setFormMessage({ type: 'error', text: 'Password wajib diisi' })
      return
    }

    setIsLoading(true)
    let keepLoadingForNavigation = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const message = data?.error || 'Login gagal'
        setFormMessage({ type: 'error', text: message })
        return
      }

      setFormMessage({ type: 'success', text: 'Login berhasil, membuka halaman...' })
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || getDashboardRoute(data)
      startRouteLoading('Membuka halaman')
      keepLoadingForNavigation = true
      router.push(redirectTo)
      router.refresh()
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Koneksi terlalu lama. Coba lagi.'
          : 'Terjadi kesalahan koneksi'
      setFormMessage({ type: 'error', text: message })
    } finally {
      window.clearTimeout(timeout)
      if (!keepLoadingForNavigation) {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="mb-6 inline-flex h-28 w-28 items-center justify-center rounded-2xl bg-white p-3 shadow-lg">
            <img src="/logo-spensagu.png" alt="Logo SMP Negeri 1 Dlanggu" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-brand-ink font-serif">siKasta</h1>
          <p className="text-neutral-500 mt-2">Sistem Kas dan Tabungan</p>
          <p className="text-brand-green font-semibold">SMP Negeri 1 Dlanggu</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-card-hover">
          <h2 className="mb-6 text-center font-serif text-xl font-semibold text-brand-ink">Selamat Datang</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username}
              placeholder="Masukkan username"
              autoComplete="username"
              disabled={isLoading}
            />

            <Input
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="Masukkan password"
              autoComplete="current-password"
              disabled={isLoading}
              className="pr-12"
              endAdornment={(
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  disabled={isLoading}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              )}
            />

            {formMessage && (
              <div
                className={`rounded-lg border px-3.5 py-3 text-sm font-medium ${
                  formMessage.type === 'error'
                    ? 'border-danger bg-danger-bg text-danger'
                    : 'border-success bg-success-bg text-success'
                }`}
                role="alert"
              >
                {formMessage.text}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading} loadingText="Memproses login">
              Masuk
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Belum punya akun? Hubungi administrator sekolah.
          </p>
        </Card>
      </div>
    </div>
  )
}
