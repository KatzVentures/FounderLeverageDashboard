import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generateResults } from '@/lib/scoring';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getSession();

    // Validate assessment answers exist
    if (!session.assessmentAnswers || Object.keys(session.assessmentAnswers).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'missing_assessment' },
        { status: 400 }
      );
    }

    // Generate results from assessment answers only (no email/calendar data)
    const results = generateResults(session.assessmentAnswers);
    
    // Add metadata
    results.meta = {
      analysisMode: 'ANSWERS_ONLY',
      emailScopeUsed: null,
      calendarUsed: false,
      emailUsed: false,
      fallbackUsed: false,
    };

    // Store results in session
    try {
      session.results = results;
      await session.save();
      console.log('Results saved to session successfully');
    } catch (saveError: any) {
      console.error('Error saving results to session:', saveError);
      // Don't throw - results are generated, just log the error
    }

    const processingTime = Date.now() - startTime;

    console.log('Returning results to client:', {
      hasResults: !!results,
      resultsKeys: results ? Object.keys(results) : [],
      score: results?.score,
      analysisMode: results?.meta?.analysisMode,
    });

    return NextResponse.json({ 
      ok: true, 
      processingTime: Math.max(processingTime, 5000), // Minimum 5 seconds
      results: results
    });
  } catch (error: any) {
    console.error('Calculate error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to calculate results',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
