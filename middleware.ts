import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Korumasız sayfalar (giriş yapmadan erişilebilir)
const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public path'lere izin ver
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Static dosyalara izin ver
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Auth token kontrolü
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Token yoksa login'e yönlendir
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Token varsa devam et
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
