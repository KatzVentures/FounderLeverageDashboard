import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-oauth';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Gate: require assessment answers before OAuth
    // TEMPORARILY DISABLED FOR TESTING - Remove this comment and uncomment below for production
    // if (!session.assessmentAnswers || Object.keys(session.assessmentAnswers).length === 0) {
    //   return NextResponse.redirect(new URL('/assessment', request.url));
    // }

    const authUrl = getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
