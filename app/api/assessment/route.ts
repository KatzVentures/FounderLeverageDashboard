import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generateResults } from '@/lib/scoring';
import { createNotionLead } from '@/lib/notion';
import { getStageByScore } from '@/lib/stages';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { answers } = body;

    if (!answers) {
      return NextResponse.json(
        { ok: false, error: 'Missing answers in request body' },
        { status: 400 }
      );
    }

    console.log('[ASSESSMENT] Received answers:', Object.keys(answers));
    
    const session = await getSession();
    
    // Clear any old results first to prevent stale data
    session.results = undefined;
    session.assessmentAnswers = answers;
    
    // Calculate results directly from assessment answers (no email/calendar data)
    console.log('[ASSESSMENT] Generating results...');
    let results: any;
    try {
      results = generateResults(answers);
      console.log('[ASSESSMENT] Results generated, score:', results.score);
    } catch (error) {
      console.error('[ASSESSMENT] Error generating results:', error);
      throw error;
    }
    
    // Add metadata
    results.meta = {
      analysisMode: 'ANSWERS_ONLY',
      emailScopeUsed: null,
      calendarUsed: false,
      emailUsed: false,
      fallbackUsed: false,
    };
    
    // Store results in session (this overwrites any old results)
    session.results = results;
    await session.save();
    
    console.log('[ASSESSMENT] Saved new results with score:', results.score);

    // Create Notion lead (don't block on this)
    const name = answers.name;
    const email = answers.email;
    const revenueRange = answers.revenueRange;
    
    if (email) {
      const stage = getStageByScore(results.score);
      
      // Create Notion lead (Status automatically set to "Lead")
      createNotionLead({
        name: name || email.split('@')[0], // Use name or fallback to email prefix
        email,
        score: results.score,
        revenueRange,
        stage: {
          name: stage.name,
          emoji: stage.emoji,
        },
      }).catch((error) => {
        console.error('[ASSESSMENT] Failed to create Notion lead (non-blocking):', error);
      });
    } else {
      console.warn('[ASSESSMENT] No email provided, skipping Notion integration');
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('Assessment save error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to save assessment' },
      { status: 500 }
    );
  }
}
