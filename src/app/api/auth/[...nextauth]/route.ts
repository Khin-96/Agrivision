import NextAuth, { type NextAuthOptions, type User, type Account, type Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Define the role type locally based on your schema
type UserRole = "farmer" | "buyer";

const authOptions: NextAuthOptions = {
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
          role: user.role as UserRole,
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
    // ✅ Typed params here
    async signIn({ user, account }: { user: User; account: Account | null }) {
      if (account?.provider === "google") {
        try {
          let selectedRole: UserRole = "buyer";
          if (account?.callbackUrl) {
            try {
              const url = new URL(account.callbackUrl);
              const roleParam = url.searchParams.get("role");
              if (roleParam === "farmer" || roleParam === "buyer") {
                selectedRole = roleParam as UserRole;
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

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.idVerified = (user as any).idVerified;
        token.image = (user as any).image;
        token.idFrontUrl = (user as any).idFrontUrl;
        token.idBackUrl = (user as any).idBackUrl;
        token.idType = (user as any).idType;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as UserRole;
        (session.user as any).idVerified = token.idVerified as boolean;
        (session.user as any).image = token.image as string | null;
        (session.user as any).idFrontUrl = token.idFrontUrl as string | null;
        (session.user as any).idBackUrl = token.idBackUrl as string | null;
        (session.user as any).idType = token.idType as string | null;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/market`;
    },
  },

  pages: {
    signIn: "/auth",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
