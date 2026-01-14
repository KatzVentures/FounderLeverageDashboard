import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { AnalysisMode, EmailScope } from '@/lib/analysis-mode';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisMode, emailScope } = body;

    // Validate analysisMode
    if (!analysisMode || (analysisMode !== 'ANSWERS_ONLY' && analysisMode !== 'DEEP_ANALYSIS')) {
      return NextResponse.json(
        { ok: false, error: 'Invalid analysisMode. Must be ANSWERS_ONLY or DEEP_ANALYSIS' },
        { status: 400 }
      );
    }

    // Validate emailScope if deep analysis
    if (analysisMode === 'DEEP_ANALYSIS') {
      if (!emailScope || (emailScope !== 'LABELED_TIME_ANALYZER' && emailScope !== 'ALL_14_DAYS')) {
        return NextResponse.json(
          { ok: false, error: 'Invalid emailScope. Must be LABELED_TIME_ANALYZER or ALL_14_DAYS for deep analysis' },
          { status: 400 }
        );
      }
    }

    const session = await getSession();

    // Require assessment answers
    if (!session.assessmentAnswers || Object.keys(session.assessmentAnswers).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Assessment answers required. Please complete the assessment first.' },
        { status: 400 }
      );
    }

    // Save to session
    session.analysisMode = analysisMode as AnalysisMode;
    session.emailScope = analysisMode === 'DEEP_ANALYSIS' ? (emailScope as EmailScope) : undefined;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Analysis config save error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to save analysis configuration' },
      { status: 500 }
    );
  }
}
