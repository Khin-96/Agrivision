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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // Get role from callback URL or default to buyer
          let selectedRole: "buyer" | "farmer" = "buyer";
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
                emailVerified: null,
                password: null,
              },
            });
          }

          return true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }

      return true; // Allow credentials login
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.idVerified = user.idVerified;
        token.image = user.image;
        token.idFrontUrl = user.idFrontUrl;
        token.idBackUrl = user.idBackUrl;
        token.idType = user.idType;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "farmer" | "buyer";
        session.user.idVerified = token.idVerified as boolean;
        session.user.image = token.image as string | null;
        session.user.idFrontUrl = token.idFrontUrl as string | null;
        session.user.idBackUrl = token.idBackUrl as string | null;
        session.user.idType = token.idType as string | null;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Handle redirects properly
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      
      // Default redirect to market page
      return `${baseUrl}/market`;
    },
  },

  pages: {
    signIn: "/auth",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};