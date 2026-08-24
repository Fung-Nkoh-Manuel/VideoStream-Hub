import Link from 'next/link'
import Logo from '@/components/Logo'
import { PlatformIcon } from '@/components/ui'
import { Upload, Share2, CalendarClock, Radio, Check, ArrowRight } from 'lucide-react'

const FEATURES = [
  { Icon: Upload, title: 'Upload once', body: 'Drop in a file from any camera, phone, or editor. VideoStream Hub handles the rest — processing, thumbnails, and playback versions.' },
  { Icon: Share2, title: 'Publish everywhere', body: 'Send one video to YouTube, TikTok, and Facebook in a single action, with per-platform titles and thumbnails when you need them.' },
  { Icon: CalendarClock, title: 'Schedule ahead', body: 'Line up a week or a quarter of content on one calendar. Recurring slots for the things you post every week.' },
  { Icon: Radio, title: 'Go live everywhere', body: 'One camera or one OBS feed, mirrored out to every destination you\'ve connected, with per-platform status while you\'re on air.' }
]

const STEPS = [
  { label: 'Upload or go live', body: 'Bring a finished video or an OBS/browser feed.' },
  { label: 'Choose destinations', body: 'Pick platforms one at a time, or save a group like "Sunday Service."' },
  { label: 'Publish or schedule', body: 'Send it now, or set a date and let it queue itself up.' }
]

const PLATFORMS: Array<'YOUTUBE' | 'TIKTOK' | 'FACEBOOK' | 'TWITCH' | 'LINKEDIN' | 'X'> = ['YOUTUBE', 'TIKTOK', 'FACEBOOK', 'TWITCH', 'LINKEDIN', 'X']

const FAQS = [
  { q: 'Do I need separate logins for YouTube, TikTok, and Facebook?', a: 'You sign in to VideoStream Hub once. Then, from Destinations, you authorize each platform separately — the same way you\'d grant any app access to your accounts.' },
  { q: 'What if a platform isn\'t connected yet?', a: 'Destinations that need API approval or credentials show "Setup required" instead of pretending to work. You\'ll see exactly what\'s missing.' },
  { q: 'Can I use OBS instead of streaming from my browser?', a: 'Yes — Live Studio gives you an RTMP server URL and stream key that OBS (or any encoder) can point at directly.' },
  { q: 'What happens if one platform fails to publish?', a: 'Each destination publishes independently. One failure never blocks or rolls back the others — you\'ll see individual status for each.' }
]

export default function LandingPage() {
  return (
    <div className="bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-ink-800">Features</a>
            <a href="#how-it-works" className="hover:text-ink-800">How it works</a>
            <a href="#platforms" className="hover:text-ink-800">Platforms</a>
            <a href="#pricing" className="hover:text-ink-800">Pricing</a>
            <a href="#faq" className="hover:text-ink-800">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="focus-ring hidden text-sm font-semibold text-ink-800 sm:block">Sign in</Link>
            <Link href="/register" className="focus-ring rounded-xl bg-ink-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-700">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-800">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-teal-400">
            One input. Every platform.
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Create once.
            <br />
            Stream everywhere.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-slate-300 sm:text-lg">
            Upload a video or go live one time. VideoStream Hub publishes it to YouTube, TikTok, and Facebook — with scheduling, multistreaming, and analytics in one place.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-semibold text-white hover:bg-amber-600 sm:w-auto">
              Get started free <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="focus-ring w-full rounded-xl border border-white/20 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-white/5 sm:w-auto">
              Sign in
            </Link>
          </div>
          <div className="mx-auto mt-16 flex max-w-3xl items-center justify-center gap-6 opacity-90">
            {PLATFORMS.map((p) => (
              <PlatformIcon key={p} platform={p} size={18} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Features</p>
          <h2 className="mt-2 text-3xl font-bold text-ink-800">Everything between "record" and "posted"</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                <Icon size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink-800">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">How it works</p>
            <h2 className="mt-2 text-3xl font-bold text-ink-800">Three steps, every time</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.label} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 text-base font-bold text-white">{i + 1}</div>
                <h3 className="text-base font-semibold text-ink-800">{step.label}</h3>
                <p className="mt-2 text-sm text-slate-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Supported platforms</p>
          <h2 className="mt-2 text-3xl font-bold text-ink-800">Launch with three. Grow into more.</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">YouTube, TikTok, and Facebook are ready today. Twitch, LinkedIn, X, and custom RTMP destinations plug into the same architecture.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {[...PLATFORMS].map((p) => (
            <div key={p} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white py-6 shadow-card">
              <PlatformIcon platform={p} size={20} />
              <span className="text-xs font-medium text-slate-500">{p === 'X' ? 'X' : p.charAt(0) + p.slice(1).toLowerCase()}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing-ready */}
      <section id="pricing" className="border-y border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Pricing</p>
            <h2 className="mt-2 text-3xl font-bold text-ink-800">Built to grow with you</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">VideoStream Hub is free for personal use right now. Paid plans are coming as the platform grows.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { name: 'Free', price: '$0', blurb: 'For getting started', items: ['5 GB storage', 'Up to 3 destinations', 'Manual publishing', 'Basic analytics'] },
              { name: 'Pro', price: 'Coming later', blurb: 'For active creators', items: ['More storage', 'Scheduling & recurring streams', 'Unlimited destinations', 'Full analytics'] },
              { name: 'Business', price: 'Coming later', blurb: 'For teams', items: ['Team seats', 'Higher limits', 'Advanced analytics', 'Priority support'] }
            ].map((tier) => (
              <div key={tier.name} className="rounded-2xl border border-slate-100 p-6">
                <h3 className="text-base font-semibold text-ink-800">{tier.name}</h3>
                <p className="mt-1 text-2xl font-bold text-ink-800">{tier.price}</p>
                <p className="mt-1 text-sm text-slate-500">{tier.blurb}</p>
                <ul className="mt-5 space-y-2.5">
                  {tier.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={15} className="text-teal-600" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">FAQ</p>
          <h2 className="mt-2 text-3xl font-bold text-ink-800">Common questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-slate-100 bg-white p-5">
              <summary className="focus-ring cursor-pointer list-none text-sm font-semibold text-ink-800">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <Logo compact />
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} VideoStream Hub. Built for creators who\'d rather create than copy-paste.</p>
        </div>
      </footer>
    </div>
  )
}
