// types/next-auth.d.ts
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: 'farmer' | 'buyer';
      idVerified: boolean;
      image?: string | null;
      idFrontUrl?: string | null;
      idBackUrl?: string | null;
      idType?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: 'farmer' | 'buyer';
    idVerified: boolean;
    image?: string | null;
    idFrontUrl?: string | null;
    idBackUrl?: string | null;
    idType?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'farmer' | 'buyer';
    idVerified: boolean;
    idFrontUrl?: string | null;
    idBackUrl?: string | null;
    idType?: string | null;
  }
}