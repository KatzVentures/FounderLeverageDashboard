import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();
    // Clear Google tokens (keep other session data if needed)
    session.googleTokens = undefined;
    await session.save();
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Logout failed' },
      { status: 500 }
    );
  }
}
