// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // --- Google OAuth provider ---
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // --- Email + Password credentials provider ---
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isPasswordValid) return null;

        // ✅ return only safe fields
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          idVerified: user.idVerified,
          image: user.image,
          idFrontUrl: user.idFrontUrl,
          idBackUrl: user.idBackUrl,
          idType: user.idType,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * signIn callback: ensures a User exists in Prisma
     */
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // Default role
          let selectedRole: "buyer" | "farmer" = "buyer";

          // Try extracting ?role=farmer from callbackUrl
          if (account.callbackUrl) {
            try {
              const url = new URL(account.callbackUrl);
              const roleParam = url.searchParams.get("role");
              if (roleParam === "farmer" || roleParam === "buyer") {
                selectedRole = roleParam;
              }
            } catch {
              console.warn("Invalid callback URL, defaulting to buyer");
            }
          }

          // Ensure Prisma user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name!,
                role: selectedRole,
                idVerified: false,
                authProvider: "google",
                image: user.image || null,
              },
            });
          }

          return true;
        } catch (error) {
          console.error("❌ Google sign-in error:", error);
          return false;
        }
      }

      return true; // Allow credentials login
    },

    /**
     * jwt callback: attach Prisma user.id (not providerAccountId!)
     */
    async jwt({ token, user }) {
      try {
        if (user) {
          // When user signs in for the first time
          token.id = user.id;
          token.role = user.role;
          token.idVerified = user.idVerified;
          token.image = user.image;
          token.idFrontUrl = user.idFrontUrl;
          token.idBackUrl = user.idBackUrl;
          token.idType = user.idType;
        } else if (token.email) {
          // On subsequent requests, fetch Prisma user by email
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
          });

          if (dbUser) {
            token.id = dbUser.id; // ✅ always ensure Prisma cuid is used
            token.role = dbUser.role;
            token.idVerified = dbUser.idVerified;
            token.image = dbUser.image;
            token.idFrontUrl = dbUser.idFrontUrl;
            token.idBackUrl = dbUser.idBackUrl;
            token.idType = dbUser.idType;
          }
        }
      } catch (err) {
        console.error("❌ JWT callback error:", err);
      }

      return token;
    },

    /**
     * session callback: expose fields to client session
     */
    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user.id = token.id as string;
          session.user.role = token.role as "farmer" | "buyer";
          session.user.idVerified = token.idVerified as boolean;
          session.user.image = token.image as string | null;
          session.user.idFrontUrl = token.idFrontUrl as string | null;
          session.user.idBackUrl = token.idBackUrl as string | null;
          session.user.idType = token.idType as string | null;
        }
      } catch (err) {
        console.error("❌ Session callback error:", err);
      }

      return session;
    },

    /**
     * redirect callback: normalize URLs
     */
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/market`; // default
    },
  },

  pages: {
    signIn: "/auth",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
