import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import dbConnect from '@/lib/db'
import User from '@/models/User'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          await dbConnect()

          const user = await User.findOne({ email: credentials.email }).select('+password')

          if (!user) {
            console.log('User not found:', credentials.email)
            return null
          }

          const isPasswordValid = await user.comparePassword(credentials.password)

          if (!isPasswordValid) {
            console.log('Invalid password for user:', credentials.email)
            return null
          }

          // Block login for inactive accounts
          if ((user as any).isActive === false || (user as any).approvalStatus === 'pending') {
            throw new Error('ACCOUNT_PENDING_APPROVAL')
          }
          if ((user as any).approvalStatus === 'rejected') {
            throw new Error('ACCOUNT_REJECTED')
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            organization: user.organization?.toString(),
            warehouse: user.warehouse?.toString(),
            warehouses: user.warehouses?.map((w: any) => w.toString()),
          }
        } catch (error: any) {
          console.error('Authorize error:', error)
          if (error.message === 'ACCOUNT_PENDING_APPROVAL' || error.message === 'ACCOUNT_REJECTED') {
            throw error
          }
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.organization = user.organization
        token.warehouse = user.warehouse
        token.warehouses = user.warehouses
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organization = token.organization as string
        session.user.warehouse = token.warehouse as string
        session.user.warehouses = token.warehouses as string[]
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
})
