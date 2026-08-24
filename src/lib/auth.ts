import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import bcrypt from 'bcryptjs'
import clientPromise from './mongodb-client'
import { connectToDatabase } from './mongodb'
import User from './models/User'

// NOTE: "Sign in with Google" here authenticates the user INTO VideoStream
// Hub only. It is intentionally separate from "Connect YouTube" under
// Destinations, which is a per-platform OAuth grant stored on the
// Destination model (see src/lib/platform-connectors.ts). Do not merge them.

const providers = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  )
}

providers.push(
  CredentialsProvider({
    name: 'Email and password',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      await connectToDatabase()
      const user = await User.findOne({ email: credentials.email }).select('+passwordHash')
      if (!user || !user.passwordHash) return null

      const valid = await bcrypt.compare(credentials.password, user.passwordHash)
      if (!valid) return null

      return { id: user._id.toString(), name: user.name, email: user.email, image: user.image }
    }
  })
)

export const authOptions: NextAuthOptions = {
  // The Mongo adapter backs Google-provider accounts/sessions. Credentials
  // sign-in uses JWT sessions below and doesn't touch the adapter's
  // account/session collections, so both can coexist safely.
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        ;(session.user as { id?: string }).id = token.sub
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}
