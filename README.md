# VideoStream Hub

**Create once. Stream everywhere.**

Upload or go live one time — publish to YouTube, TikTok, Facebook (and, as you connect more, Twitch, LinkedIn, X, or a custom RTMP endpoint) from a single dashboard, with scheduling, multistreaming, and basic analytics.

Built for a single user today (v2 of this project — see §8 for what changed), structured so it can grow into a multi-user SaaS later without a rewrite.

---

## 1. Status: READY vs. REQUIRES CREDENTIALS vs. REQUIRES PLATFORM APPROVAL

| Area | Status |
|---|---|
| Landing page, auth (Google + email/password), all 9 app pages, responsive layout | **READY** |
| MongoDB/Mongoose data layer (users, videos, destinations, publishing, scheduling, streams, analytics, activity) | **READY** |
| Direct-to-Cloudinary video upload with real progress, `/api/videos`, `/api/destinations`, `/api/register` | **READY** |
| Vercel Cron scheduling endpoint (`/api/cron/process-schedule`) | **READY** — architecture only; the publish/stream calls it triggers depend on the rows below |
| Google sign-in | **REQUIRES CREDENTIALS** — self-serve, no approval needed |
| Cloudinary storage | **REQUIRES CREDENTIALS** — self-serve, free tier is enough to start |
| YouTube publishing/live | **REQUIRES CREDENTIALS + PLATFORM APPROVAL** for live-broadcast scopes |
| TikTok publishing | **REQUIRES CREDENTIALS + PLATFORM APPROVAL** (Content Posting API review) |
| Facebook/Meta publishing/live | **REQUIRES CREDENTIALS + PLATFORM APPROVAL** (video permissions review) |
| Live multistreaming (actually going live) | **REQUIRES CREDENTIALS** — pick any relay vendor, implement one class |
| AI metadata generation | **REQUIRES CREDENTIALS** — self-serve (Anthropic API key) |

Nothing in this app fakes a "Connected" or "Live" state — every unconfigured integration shows an honest setup message instead.

## 2. Tech stack

- **Next.js 14** (App Router) + TypeScript — frontend and API routes in one project, Vercel-native
- **Tailwind CSS** — design system in `tailwind.config.js`
- **MongoDB + Mongoose** — see `src/lib/mongodb.ts` (connection) and `src/lib/models/*` (schemas)
- **NextAuth.js** (`@auth/mongodb-adapter`) — Google OAuth + email/password (bcrypt) for signing into the app itself
- **Cloudinary** — video/thumbnail storage, direct browser-to-Cloudinary upload (bypasses Vercel's serverless body-size limits)
- **Vercel Cron** — drives scheduled publishing/streaming without a persistent server
- **Recharts, lucide-react, Zod** — charts, icons, input validation

## 3. Local setup

```bash
npm install
cp .env.example .env
# minimum to run locally:
#   MONGODB_URI      -> a free MongoDB Atlas cluster connection string
#   NEXTAUTH_SECRET  -> openssl rand -base64 32

npm run db:seed      # optional: creates demo@videostreamhub.app / password123
npm run dev           # http://localhost:3000
```

**I could not run `npm install` / `npm run build` in the sandbox that generated this project (no network access), so please run a build locally as your first step** and fix anything a fresh install surfaces.

### MongoDB Atlas setup
1. Create a free cluster at mongodb.com/cloud/atlas.
2. Database Access -> add a user with a password. Network Access -> allow access from anywhere (`0.0.0.0/0`) for Vercel, or use Atlas's Vercel integration for scoped IPs.
3. Copy the connection string into `MONGODB_URI`.

### Cloudinary setup
1. Create a free account at cloudinary.com.
2. Copy Cloud Name, API Key, and API Secret from the console into `.env`.
3. That's it -- `/api/upload/sign` handles signed direct uploads automatically once these are set.

### Credentials for the rest, and where to get them

| Integration | Env vars | Where | Approval needed? |
|---|---|---|---|
| Google sign-in | `GOOGLE_CLIENT_ID/SECRET` | Google Cloud Console -> Credentials | No |
| YouTube | `YOUTUBE_CLIENT_ID/SECRET` | Same Google Cloud project, enable YouTube Data API v3 | Yes, for live-broadcast scopes |
| TikTok | `TIKTOK_CLIENT_KEY/SECRET` | TikTok Developer Portal | **Yes** |
| Facebook/Meta | `META_APP_ID/SECRET` | Meta for Developers | **Yes** |
| Streaming relay | `STREAM_PROVIDER_API_KEY/URL` | Any API-driven RTMP multistream relay vendor you choose | Varies |
| AI metadata | `ANTHROPIC_API_KEY` | console.anthropic.com | No |

## 4. Project structure

```
src/lib/mongodb.ts              Mongoose connection singleton (Vercel-serverless-safe)
src/lib/mongodb-client.ts       Raw MongoClient promise for the NextAuth adapter
src/lib/models/*.ts             User, Video, Destination(+Group), PublishJob, ScheduledItem, LiveStream, Analytics, Activity/Notification
src/lib/auth.ts                 NextAuth config -- Google + credentials providers, MongoDB adapter
src/lib/cloudinary.ts           Server-side Cloudinary config
src/lib/platform-connectors.ts  Per-platform OAuth/publish interface -- add a platform by adding one entry
src/lib/streaming-provider.ts   Vendor-agnostic live-relay interface -- swap providers without touching UI
src/lib/mock-data.ts            Demo data powering most page UIs today -- see SS6 to wire a page to live data
src/app/(pages)                 One folder per nav item: dashboard, videos, upload, live, schedule, destinations, analytics, activity, settings
src/app/api/videos, /destinations, /register   Wired to MongoDB end-to-end as reference implementations
src/app/api/upload/sign         Issues signed Cloudinary upload params for direct browser upload
src/app/api/cron/process-schedule   Vercel Cron target -- processes due ScheduledItem rows
src/middleware.ts               Route protection -- every app page requires a session
vercel.json                     Cron schedule configuration
```

## 5. Vercel deployment

1. Push this repo to GitHub/GitLab/Bitbucket and import it in Vercel.
2. Add every env var from `.env.example` that you're ready to turn on, in the Vercel project's Environment Variables settings -- never commit `.env`.
3. Set `NEXTAUTH_URL` to your production domain.
4. Vercel automatically picks up `vercel.json`'s cron entry. **Note:** cron on the Hobby plan runs at most once/day -- the `*/5 * * * *` default in `vercel.json` requires a Pro plan; adjust to `0 * * * *` (hourly) or similar if staying on Hobby.
5. Deploy. No persistent process, local disk, or long-running server is used anywhere -- uploads go straight to Cloudinary, scheduling is polled by Cron, and live streaming is delegated to an external relay provider once configured.

## 6. Moving a page from demo data to live data

Every authenticated page currently imports from `src/lib/mock-data.ts` so the full UI is reviewable with realistic content before any real videos or connections exist. To make a page live: replace the mock import with a `fetch('/api/...')` call. The API routes already scope every query to `session.user.id` -- extend that same pattern to any new route so one user can never see another's data.

## 7. Known limitations

- Real OAuth connectors for YouTube/TikTok/Facebook (`src/lib/platform-connectors.ts`) and the live-streaming relay (`src/lib/streaming-provider.ts`) are fully architected interfaces -- implementing the concrete class for each is the remaining step once you have credentials/approval.
- Video transcoding beyond Cloudinary's automatic eager transformations isn't wired to a webhook yet -- add `/api/webhooks/cloudinary` to populate `Video.assets` when Cloudinary finishes processing a rendition.
- Password-reset emails aren't sent yet (no email provider configured) -- the flow and UI exist in `/forgot-password`.
- The Vercel Cron endpoint processes due `ScheduledItem` rows but the actual publish/stream calls it makes depend on the connectors above being implemented.

## 8. What changed in this v2 (Prisma/SQLite -> MongoDB/Cloudinary/Vercel)

- Removed Prisma entirely (schema, client, seed script, dependency) -- replaced with Mongoose models in `src/lib/models/`.
- Added `src/lib/mongodb.ts` (Mongoose) and `src/lib/mongodb-client.ts` (raw driver for the NextAuth adapter), both safe for serverless/hot-reload.
- Migrated `auth.ts`, `/api/register`, `/api/videos`, `/api/destinations` to Mongoose queries.
- Added Cloudinary (`src/lib/cloudinary.ts`, `/api/upload/sign`) and rebuilt the Upload page to do a real signed direct-to-Cloudinary upload with genuine progress, instead of a simulated one.
- Added `/api/cron/process-schedule` + `vercel.json` for database-backed, serverless-safe scheduling.
- Added `/api/ai/metadata` (Anthropic-backed "Generate with AI").
- Updated `.env.example`, `package.json`, and this README for the new stack.
