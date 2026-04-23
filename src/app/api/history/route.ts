import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const history = await prisma.analysis.findMany({
            where: {
                user: { email: session.user.email }
            },
            orderBy: { date: 'desc' },
            take: limit,
        });

        return NextResponse.json(history);
    } catch (error) {
        console.error('Failed to fetch history:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { imageUrl, results, metadata } = body;

        if (!imageUrl || !results) {
            return NextResponse.json({ error: 'Missing results or imageUrl' }, { status: 400 });
        }

        const analysis = await prisma.analysis.create({
            data: {
                userId: user.id,
                imageUrl,
                results,
                metadata: metadata || {},
            },
        });

        return NextResponse.json(analysis);
    } catch (error) {
        console.error('Failed to save analysis:', error);
        return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            // Delete specific analysis
            await prisma.analysis.deleteMany({
                where: {
                    id,
                    user: { email: session.user.email }
                }
            });
            return NextResponse.json({ success: true, message: 'Analysis deleted' });
        } else {
            // Clear all history for user
            await prisma.analysis.deleteMany({
                where: {
                    user: { email: session.user.email }
                }
            });
            return NextResponse.json({ success: true, message: 'History cleared' });
        }
    } catch (error) {
        console.error('Failed to delete history:', error);
        return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
    }
}
