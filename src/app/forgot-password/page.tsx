'use client'

import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { Button } from '@/components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Real implementation: create a VerificationToken row and email a reset
    // link via your transactional email provider. Wired as a clear next
    // step rather than faked here since no email provider is configured.
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-card">
          <h1 className="text-lg font-semibold text-ink-800">Reset your password</h1>
          {sent ? (
            <p className="mt-3 text-sm text-slate-500">If an account exists for {email}, a reset link is on its way.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
                <Button type="submit" className="w-full">Send reset link</Button>
              </form>
            </>
          )}
          <p className="mt-4 text-center text-xs text-slate-500">
            <Link href="/login" className="font-medium text-ink-800 hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
