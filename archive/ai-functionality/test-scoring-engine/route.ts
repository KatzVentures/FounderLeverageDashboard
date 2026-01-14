import { NextRequest, NextResponse } from 'next/server';
import { calculateResults } from '@/lib/scoring-engine';
import { AnalysisMode } from '@/lib/analysis-mode';

export async function GET(request: NextRequest) {
  try {
    // Sample assessment answers
    const sampleAssessmentAnswers = {
      email: 'test@example.com',
      revenueRange: '1M-5M',
      q1: 'Daily', // Time allocation
      q2: 'Yes', // Delegation
      q3: 'No', // Process maturity
      q4: 'Yes', // Strategic focus
      q5: 'No', // Operating rhythm
      // Add more sample answers as needed
    };

    // Sample email analysis results from Claude
    const sampleEmailAnalyses = [
      {
        threadId: 'thread-1',
        category: 'Customer Support',
        timeDrainType: 'Status Update Loop',
        confidence: 0.85,
        reasoning: 'Frequent status update requests that could be automated',
        suggestedAction: 'Automate status updates with a dashboard',
      },
      {
        threadId: 'thread-2',
        category: 'Project Management',
        timeDrainType: 'Coordination Overhead',
        confidence: 0.8,
        reasoning: 'Multiple coordination emails that could be streamlined',
        suggestedAction: 'Delegate coordination to team lead',
      },
    ];

    // Sample calendar analysis results from Claude
    const sampleCalendarAnalyses = [
      {
        eventId: 'event-1',
        category: 'Team Meeting',
        meetingType: 'Status Update',
        isWasteful: true,
        confidence: 0.9,
        reasoning: 'Weekly status update that could be async',
        suggestedAction: 'Replace with async updates',
      },
    ];

    console.log('Testing scoring engine...');

    // Test 1: ANSWERS_ONLY mode
    console.log('\n1. Testing ANSWERS_ONLY mode...');
    const answersOnlyResults = calculateResults({
      analysisMode: 'ANSWERS_ONLY',
      emailScope: null,
      assessmentAnswers: sampleAssessmentAnswers,
    });

    // Test 2: DEEP_ANALYSIS mode with Claude data
    console.log('\n2. Testing DEEP_ANALYSIS mode with Claude analysis...');
    const deepAnalysisResults = calculateResults({
      analysisMode: 'DEEP_ANALYSIS',
      emailScope: 'ALL_14_DAYS',
      assessmentAnswers: sampleAssessmentAnswers,
      gmailMetrics: {
        totalThreads: 50,
        totalMessages: 120,
      },
      calendarMetrics: {
        totalEvents: 20,
        includedEvents: 18,
        weeklyHours: 12,
      },
      claudeAnalysis: {
        emailThreads: sampleEmailAnalyses,
        calendarEvents: sampleCalendarAnalyses,
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Scoring engine test successful!',
      tests: {
        answersOnly: {
          score: answersOnlyResults.score,
          stage: answersOnlyResults.stage?.name,
          componentScores: answersOnlyResults.componentScores,
          hasEmailData: !!answersOnlyResults.emailLoad && answersOnlyResults.emailLoad.count > 0,
          hasCalendarData: !!answersOnlyResults.meetingCost && answersOnlyResults.meetingCost.count > 0,
          aiOpportunitiesCount: answersOnlyResults.aiOpportunities?.length || 0,
        },
        deepAnalysis: {
          score: deepAnalysisResults.score,
          stage: deepAnalysisResults.stage?.name,
          componentScores: deepAnalysisResults.componentScores,
          emailLoad: deepAnalysisResults.emailLoad,
          meetingCost: deepAnalysisResults.meetingCost,
          automationMetrics: deepAnalysisResults.automationMetrics ? {
            weeklyHours: deepAnalysisResults.automationMetrics.weeklyHours,
            patterns: deepAnalysisResults.automationMetrics.patterns?.length || 0,
          } : null,
          aiOpportunitiesCount: deepAnalysisResults.aiOpportunities?.length || 0,
          aiOpportunities: deepAnalysisResults.aiOpportunities?.map(o => ({
            title: o.title,
            timeSaved: o.timeSaved,
            priority: o.priority,
          })),
        },
      },
    });
  } catch (error: any) {
    console.error('Scoring engine test error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to test scoring engine',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
