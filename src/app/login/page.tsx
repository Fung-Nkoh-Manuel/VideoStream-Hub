'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { Button } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError('That email and password don\'t match an account.')
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-card">
          <h1 className="text-lg font-semibold text-ink-800">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back — pick up where you left off.</p>

          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-800 hover:bg-slate-50"
          >
            <GoogleG /> Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-100" /> or <span className="h-px flex-1 bg-slate-100" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
            />
            {error && <p className="text-sm text-live">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-4 flex justify-between text-xs text-slate-500">
            <Link href="/forgot-password" className="hover:text-ink-800">Forgot password?</Link>
            <Link href="/register" className="hover:text-ink-800">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 6.1 29.5 4 24 4c-7.6 0-14.2 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 45c5.4 0 10.3-2 13.9-5.4l-6.4-5.4C29.4 35.7 26.8 36.5 24 36.5c-5.3 0-9.8-3.5-11.3-8.4l-6.5 5C9.7 40.6 16.3 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.4 5.4C40.9 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  )
}
