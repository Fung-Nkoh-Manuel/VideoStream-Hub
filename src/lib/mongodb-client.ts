import { MongoClient } from 'mongodb'

// The NextAuth MongoDB adapter wants a raw MongoClient (not Mongoose), so
// this is kept separate from src/lib/mongodb.ts, which is the Mongoose
// connection used by every other model/query in the app.
const uri = process.env.MONGODB_URI

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient>

if (!uri) {
  // Deferred so the app can still boot (e.g. to show a setup message)
  // before MONGODB_URI is configured; any real DB call will throw clearly.
  clientPromise = Promise.reject(new Error('MONGODB_URI is not set. Add it to .env — see .env.example.'))
} else if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  clientPromise = new MongoClient(uri).connect()
}

export default clientPromise
