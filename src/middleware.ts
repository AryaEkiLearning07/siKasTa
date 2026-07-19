import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login']

// Routes that should redirect to login if not authenticated
const protectedPrefixes = ['/admin', '/kelas', '/kepala-sekolah', '/guru-mapel', '/wali-kelas', '/bendahara']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // For API routes and page routes
  const needsProtection = protectedPrefixes.some(prefix => pathname.startsWith(prefix))

  if (needsProtection) {
    const sessionCookie = request.cookies.get('spensakas_session')

    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
