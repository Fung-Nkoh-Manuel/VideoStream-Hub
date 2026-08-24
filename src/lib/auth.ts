import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import bcrypt from 'bcryptjs'
import clientPromise from './mongodb-client'
import { connectToDatabase } from './mongodb'
import User from './models/User'

const googleClientId = process.env.GOOGLE_CLIENT_ID?.replace(/^["']|["']$/g, '').trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.replace(/^["']|["']$/g, '').trim()

const providers = []

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      allowDangerousEmailAccountLinking: true
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
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.sub = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        ;(session.user as { id?: string }).id = (token.id as string) || token.sub
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}
