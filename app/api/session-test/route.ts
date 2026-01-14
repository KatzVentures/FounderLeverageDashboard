import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    
    // Initialize views counter if it doesn't exist
    if (typeof session.views !== 'number') {
      session.views = 0;
    }
    
    // Increment views
    session.views += 1;
    
    // Save session
    await session.save();
    
    return NextResponse.json({
      ok: true,
      views: session.views,
      hasAnswers: !!session.assessmentAnswers,
      results: session.results || null,
    });
  } catch (error) {
    console.error('Session test error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
