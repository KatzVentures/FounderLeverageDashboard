import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/google-oauth';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=no_code', request.url)
      );
    }

    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in session (preserve existing analysisMode and emailScope)
    const session = await getSession();
    
    // Preserve analysisMode and emailScope if they exist (from ai-team page selection)
    const existingAnalysisMode = session.analysisMode;
    const existingEmailScope = session.emailScope;
    
    session.googleTokens = tokens;
    
    // Restore analysisMode and emailScope if they were set
    if (existingAnalysisMode) {
      session.analysisMode = existingAnalysisMode;
    }
    if (existingEmailScope) {
      session.emailScope = existingEmailScope;
    }
    
    await session.save();
    
    console.log('OAuth callback - saved session:', {
      hasTokens: !!session.googleTokens,
      analysisMode: session.analysisMode,
      emailScope: session.emailScope,
    });

    // Redirect to processing page
    return NextResponse.redirect(new URL('/processing', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error instanceof Error ? error.message : 'OAuth failed')}`, request.url)
    );
  }
}
