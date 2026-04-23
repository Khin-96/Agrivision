import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const email = request.nextUrl.searchParams.get('email');
    const verified = request.nextUrl.searchParams.get('verified') === 'true';
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { 
                role: 'farmer',
                idVerified: verified
            }
        });
        return NextResponse.json({ success: true, user });
    } catch (error) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
}
