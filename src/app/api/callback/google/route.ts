import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) return NextResponse.json({ error: 'No code received' });

  // TODO: Exchange the code for tokens with Google
  // Example: fetch('https://oauth2.googleapis.com/token', {...})

  // After successful login, redirect to your landing page
  return NextResponse.redirect(new URL('/', req.url)); // '/' points to app/page.tsx
}
