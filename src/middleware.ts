export { default } from 'next-auth/middleware'

// Everything under these paths requires a signed-in session. The landing
// page, /login, /register, and /forgot-password stay public.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/videos/:path*',
    '/upload/:path*',
    '/live/:path*',
    '/schedule/:path*',
    '/destinations/:path*',
    '/analytics/:path*',
    '/activity/:path*',
    '/settings/:path*'
  ]
}
