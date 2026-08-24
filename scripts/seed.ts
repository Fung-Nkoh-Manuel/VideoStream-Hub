import bcrypt from 'bcryptjs'
import { connectToDatabase } from '../src/lib/mongodb'
import User from '../src/lib/models/User'
import { Destination } from '../src/lib/models/Destination'

async function main() {
  await connectToDatabase()

  const passwordHash = await bcrypt.hash('password123', 12)
  const user = await User.findOneAndUpdate(
    { email: 'demo@videostreamhub.app' },
    { $setOnInsert: { name: 'Demo User', email: 'demo@videostreamhub.app', passwordHash } },
    { upsert: true, new: true }
  )

  await Destination.deleteMany({ userId: user._id })
  await Destination.insertMany([
    { userId: user._id, platform: 'YOUTUBE', accountName: 'Main Channel', status: 'SETUP_REQUIRED' },
    { userId: user._id, platform: 'FACEBOOK', accountName: 'Page', status: 'SETUP_REQUIRED' },
    { userId: user._id, platform: 'TIKTOK', accountName: '', status: 'SETUP_REQUIRED' }
  ])

  console.log('Seeded demo user: demo@videostreamhub.app / password123')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
