import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

// Cached across invocations of the same warm serverless function — this
// is the standard pattern for using Mongoose on Vercel, where each
// function instance must reuse its connection instead of opening a new
// one per request.
interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null }
if (!global._mongooseCache) global._mongooseCache = cache

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to .env (see .env.example) — a free MongoDB Atlas cluster works fine to start.')
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false })
  }
  cache.conn = await cache.promise
  return cache.conn
}
