import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();
    
    // Clear all session data
    session.assessmentAnswers = undefined;
    session.googleTokens = undefined;
    session.results = undefined;
    
    await session.save();
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
