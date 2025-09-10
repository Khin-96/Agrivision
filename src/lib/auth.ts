// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        
        // Get user role from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, idVerified: true }
        });

        session.user.role = dbUser?.role || 'buyer';
        session.user.idVerified = dbUser?.idVerified || false;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Check if user exists in database
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email! }
      });

      if (!existingUser) {
        // Create new user with default role as 'buyer'
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email!,
            name: user.name!,
            image: user.image,
            role: 'buyer',
            idVerified: false
          }
        });
      }
      
      return true;
    }
  },
  pages: {
    signIn: '/auth',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
  },
};