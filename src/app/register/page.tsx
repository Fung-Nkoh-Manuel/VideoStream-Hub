'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { Button } from '@/components/ui'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    const signInRes = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (signInRes?.error) {
      window.location.href = '/login'
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
          <h1 className="text-lg font-semibold text-ink-800">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Start uploading and streaming in a couple of minutes.</p>

          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-800 hover:bg-slate-50"
          >
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-100" /> or <span className="h-px flex-1 bg-slate-100" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            <input type="password" required placeholder="Password (min. 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            {error && <p className="text-sm text-live">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-ink-800 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
