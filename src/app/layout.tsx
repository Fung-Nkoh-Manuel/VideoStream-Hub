import type { Metadata } from 'next'
import Providers from '@/components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'VideoStream Hub — Create Once. Stream Everywhere.',
  description: 'Upload or go live once, publish to YouTube, TikTok, Facebook and beyond from a single hub.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
