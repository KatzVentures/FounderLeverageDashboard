/**
 * Scoring Engine - Calculates results from assessment + email/calendar + Claude analysis
 * Returns the same shape as mock-results.ts so results page works without changes
 */

import { AnalysisMode, EmailScope } from './analysis-mode';
// Stage is not stored - always calculated from score on the frontend
import { 
  calculateEmailCost, 
  calculateMeetingCost, 
  calculateAITimeback, 
  calculateAutomationCost,
  CALCULATION_CONSTANTS 
} from './calculation-formulas';
import { HOURLY_RATE, calculateWeeklyValue, calculateMonthlyValue } from './mock-results';
import { calculateTotalScore, calculateComponentScores } from './scoring';
import type { EmailAnalysisResult, CalendarAnalysisResult, AISolution } from './ai-analyzer';

export type ScoringInput = {
  analysisMode: AnalysisMode;
  emailScope?: EmailScope | null;
  assessmentAnswers: any;
  gmailMetrics?: {
    totalThreads?: number;
    totalMessages?: number;
    totalSentMessages?: number;
    totalReceivedMessages?: number;
    threadsAwaitingUserResponse?: number;
  };
  calendarMetrics?: {
    totalEvents?: number;
    includedEvents?: number;
    weeklyHours?: number;
  };
  emailThreadAnalyses?: EmailAnalysisResult[];
  calendarEventAnalyses?: CalendarAnalysisResult[];
  claudeAnalysis?: {
    emailThreads?: EmailAnalysisResult[];
    calendarEvents?: CalendarAnalysisResult[];
    aiSolutions?: AISolution[];
  };
};

/**
 * Extract metrics from Claude email analysis
 * Excludes PERSONAL_IGNORE threads from all calculations
 */
function extractEmailMetricsFromClaude(
  emailAnalyses: EmailAnalysisResult[],
  gmailMetrics?: ScoringInput['gmailMetrics']
) {
  // CRITICAL: Filter out PERSONAL_IGNORE threads - they should not count in any metrics
  const businessThreads = emailAnalyses.filter(a => 
    a.category !== 'PERSONAL_IGNORE'
  );
  
  const personalIgnoredCount = emailAnalyses.length - businessThreads.length;
  if (personalIgnoredCount > 0) {
    console.log(`Excluding ${personalIgnoredCount} PERSONAL_IGNORE threads from calculations`);
  }
  
  const totalThreads = gmailMetrics?.totalThreads || businessThreads.length || 0;
  
  // Map categories to delegatable/automatable based on new category structure
  // DELEGATABLE_OPERATIONAL → clearly delegatable
  // TEAM_COORDINATION → potentially delegatable (depends on context, but usually yes)
  // FIREFIGHTING → delegatable (team should handle escalations)
  // STRATEGIC_INPUT → NOT delegatable/automatable (CEO-only)
  // EXTERNAL_CRITICAL → depends, but often needs CEO - treat as strategic for now
  // PERSONAL_IGNORE → already filtered out above
  
  const delegatableCount = businessThreads.filter(a => 
    a.confidence >= 0.7 && (
      a.category === 'DELEGATABLE_OPERATIONAL' ||
      a.category === 'TEAM_COORDINATION' ||
      a.category === 'FIREFIGHTING' ||
      // Backward compatibility: also check for old category names
      (typeof a.category === 'string' && (
        a.category.toLowerCase().includes('support') ||
        a.category.toLowerCase().includes('coordination') ||
        a.category.toLowerCase().includes('operational')
      )) ||
      a.suggestedAction?.toLowerCase().includes('delegate')
    )
  ).length;
  
  // Automatable = repetitive tasks that can be fully automated
  // Check timeDrainType and suggestedAction for automation signals
  const automatableCount = businessThreads.filter(a =>
    a.confidence >= 0.7 && (
      // DELEGATABLE_OPERATIONAL with repetitive patterns is often automatable
      (a.category === 'DELEGATABLE_OPERATIONAL' && (
        a.timeDrainType?.toLowerCase().includes('status update') ||
        a.timeDrainType?.toLowerCase().includes('information request') ||
        a.timeDrainType?.toLowerCase().includes('recurring') ||
        a.suggestedAction?.toLowerCase().includes('automate')
      )) ||
      // Backward compatibility
      (typeof a.category === 'string' && (
        a.timeDrainType?.toLowerCase().includes('status update') ||
        a.timeDrainType?.toLowerCase().includes('information request') ||
        a.timeDrainType?.toLowerCase().includes('recurring')
      )) ||
      a.suggestedAction?.toLowerCase().includes('automate')
    )
  ).length;
  
  // Estimate total count if not provided (average 2-3 messages per thread)
  // Use businessThreads count, not total analyses (excludes PERSONAL_IGNORE)
  const estimatedCount = gmailMetrics?.totalMessages || (businessThreads.length * 2.5);
  
  // Use actual counts from Claude analysis - don't inflate with fallbacks
  return {
    count: Math.round(estimatedCount),
    delegatableCount: delegatableCount,
    automatableCount: automatableCount,
    personalIgnoredCount: personalIgnoredCount, // Track for logging/debugging
  };
}

/**
 * Extract metrics from Claude calendar analysis
 */
function extractCalendarMetricsFromClaude(
  calendarAnalyses: CalendarAnalysisResult[],
  calendarMetrics?: ScoringInput['calendarMetrics']
) {
  const totalEvents = calendarMetrics?.includedEvents || calendarAnalyses.length || 0;
  
  // Calculate wasteful meeting hours
  const wastefulEvents = calendarAnalyses.filter(a => 
    a.confidence >= 0.7 && a.isWasteful === true
  );
  
  // Estimate weekly hours from calendar data
  const avgMeetingDuration = calendarAnalyses.length > 0
    ? calendarAnalyses.reduce((sum, a) => {
        // We need duration from original event - for now estimate from patterns
        return sum + 30; // Default 30 min average
      }, 0) / calendarAnalyses.length
    : 30;
  
  const weeklyHours = calendarMetrics?.weeklyHours || 
    (totalEvents > 0 ? (totalEvents * avgMeetingDuration / 60) / 4.33 : 0); // Divide by weeks in month
  
  return {
    count: totalEvents,
    weeklyHours: Math.round(weeklyHours * 10) / 10,
    wastefulCount: wastefulEvents.length,
  };
}

/**
 * Calculate results from scoring input
 * Returns the same shape as mock-results.ts
 */
export function calculateResults(input: ScoringInput): typeof import('./mock-results').mockResults {
  const { 
    analysisMode, 
    emailScope, 
    assessmentAnswers, 
    gmailMetrics, 
    calendarMetrics,
    emailThreadAnalyses,
    calendarEventAnalyses,
    claudeAnalysis 
  } = input;

  // Combine Claude analysis sources (direct or from claudeAnalysis wrapper)
  const emailAnalyses = emailThreadAnalyses || claudeAnalysis?.emailThreads || [];
  const calAnalyses = calendarEventAnalyses || claudeAnalysis?.calendarEvents || [];
  const aiSolutions = claudeAnalysis?.aiSolutions || [];
  
  console.log('[Scoring Engine] Input received:', {
    analysisMode,
    emailAnalysesCount: emailAnalyses.length,
    calAnalysesCount: calAnalyses.length,
    hasGmailMetrics: !!gmailMetrics,
    hasCalendarMetrics: !!calendarMetrics,
  });

  // Calculate base score from assessment
  const totalScore = calculateTotalScore(assessmentAnswers);
  const componentScores = calculateComponentScores(assessmentAnswers);
  
  console.log('[Scoring Engine] Base score calculated:', totalScore);

  // Handle mode-specific data extraction
  let emailData = { count: 0, delegatableCount: 0, automatableCount: 0 };
  let meetingData = { count: 0, weeklyHours: 0 };
  let decisionData = { pending: 0, avgHours: 0 };

  if (analysisMode === 'DEEP_ANALYSIS') {
    // Use Claude analysis if available, otherwise fall back to raw metrics
    if (emailAnalyses.length > 0) {
      const extractedMetrics = extractEmailMetricsFromClaude(emailAnalyses, gmailMetrics);
      emailData = {
        count: extractedMetrics.count,
        delegatableCount: extractedMetrics.delegatableCount,
        automatableCount: extractedMetrics.automatableCount,
      };
      // Log personal ignored count for transparency
      if ((extractedMetrics as any).personalIgnoredCount > 0) {
        console.log(`[Scoring Engine] Excluded ${(extractedMetrics as any).personalIgnoredCount} personal threads from calculations`);
      }
    } else if (gmailMetrics) {
      // Fallback: estimate from raw metrics
      emailData = {
        count: gmailMetrics.totalMessages || gmailMetrics.totalThreads || 0,
        delegatableCount: Math.round((gmailMetrics.totalThreads || 0) * 0.4),
        automatableCount: Math.round((gmailMetrics.totalThreads || 0) * 0.3),
      };
    }

    if (calAnalyses.length > 0) {
      const calMetrics = extractCalendarMetricsFromClaude(calAnalyses, calendarMetrics);
      meetingData = {
        count: calMetrics.count,
        weeklyHours: calMetrics.weeklyHours,
      };
    } else if (calendarMetrics) {
      meetingData = {
        count: calendarMetrics.includedEvents || calendarMetrics.totalEvents || 0,
        weeklyHours: calendarMetrics.weeklyHours || 0,
      };
    }

    // Response lag from Gmail metrics or default
    // Decision data from gmailMetrics or calculated from threads
    // Note: threadsAwaitingUserResponse should be calculated from actual thread analysis
    decisionData = {
      pending: gmailMetrics?.threadsAwaitingUserResponse || 0,
      avgHours: 8.0, // Default estimate - TODO: Calculate from actual response times
    };
  }
  // For ANSWERS_ONLY, emailData, meetingData, decisionData remain at defaults (zeros)

  // Calculate costs and metrics
  // Delegatable emails = emails that require human judgment but can be handled by team/VA
  // Calculation: (60% need responses * 5min) + (100% need reading * 2min) per email = ~5 min avg per delegatable email
  // This is based on: support requests, coordination overhead, routine decisions that don't require CEO-level input
  const emailCost = calculateEmailCost(emailData.delegatableCount, emailData.count);
  const meetingCost = calculateMeetingCost(meetingData.count, meetingData.weeklyHours);
  const aiTimeback = calculateAITimeback(
    { delegatableCount: emailData.delegatableCount },
    { weeklyCount: meetingData.count },
    { pendingCount: decisionData.pending },
    { automatableCount: emailData.automatableCount }
  );

  // Calculate automation metrics
  const automationMetrics = emailData.automatableCount > 0
    ? (() => {
        const autoCalc = calculateAutomationCost(emailData.automatableCount, emailData.count);
        
        // Extract patterns from Claude analysis if available
        const patterns = emailAnalyses.length > 0
          ? (() => {
              const categoryCounts: Record<string, number> = {};
              emailAnalyses
                .filter(a => a.confidence >= 0.7)
                .forEach(a => {
                  const cat = a.category || 'Other';
                  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                });
              
              const sorted = Object.entries(categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4);
              
              const total = sorted.reduce((sum, [, count]) => sum + count, 0);
              
              return sorted.map(([type, count]) => ({
                type,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
              }));
            })()
          : [];

        return {
          weeklyHours: autoCalc.weeklyHours,
          monthlyHours: autoCalc.monthlyHours,
          monthlyCost: autoCalc.monthlyCost,
          patterns: patterns.length > 0 ? patterns : [
            { type: "Purchase order requests", count: Math.round(emailData.automatableCount * 0.41), percentage: 41 },
            { type: "Invoice processing", count: Math.round(emailData.automatableCount * 0.26), percentage: 26 },
            { type: "Inventory status checks", count: Math.round(emailData.automatableCount * 0.18), percentage: 18 },
            { type: "Order status updates", count: Math.round(emailData.automatableCount * 0.15), percentage: 15 },
          ],
          buildCost: autoCalc.automation.buildCost,
          monthlyMaintenance: autoCalc.automation.monthlyMaintenance,
          breakEvenMonths: autoCalc.automation.breakEvenMonths,
          firstYearSavings: autoCalc.automation.firstYearSavings,
          delegationAlternative: autoCalc.delegation.monthlyCost,
        };
      })()
    : undefined;

  // Calculate time categories (based on score and actual data)
  const worthyTime = Math.max(30, totalScore * 0.6);
  const wastedTime = analysisMode === 'DEEP_ANALYSIS' 
    ? Math.max(10, Math.min(40, (emailData.automatableCount + meetingData.weeklyHours) / 10))
    : Math.max(10, 100 - totalScore);
  const whirlwindTime = Math.max(0, 100 - worthyTime - wastedTime);

  // Calculate time breakdown
  const weeklyTotalHours = 40;
  const doingWorkHours = (worthyTime / 100) * weeklyTotalHours;
  const coordinatingHours = (whirlwindTime / 100) * weeklyTotalHours;
  const strategicHours = (worthyTime / 100) * weeklyTotalHours * 0.3;
  const adminHours = (wastedTime / 100) * weeklyTotalHours;

  // Calculate automatable hours from email analysis
  const automatableHours = emailData.automatableCount > 0
    ? (emailData.automatableCount * 0.15) // ~9 min per automatable email
    : 0;

  // Generate AI opportunities (exclude PERSONAL_IGNORE from analysis)
  const businessEmailAnalyses = emailAnalyses.filter(a => a.category !== 'PERSONAL_IGNORE');
  const aiOpportunities = generateAIOpportunities(
    emailData, 
    meetingData, 
    decisionData, 
    automationMetrics,
    businessEmailAnalyses,
    calAnalyses,
    aiSolutions // Pass AI solutions from Claude analysis
  );

  // Build results object (same shape as mock-results.ts)
  // NOTE: Stage is NOT stored - it's always calculated from score on the frontend
  console.log(`[Scoring Engine] Score: ${totalScore}`);
  
  return {
    score: totalScore,
    componentScores,
    timeCategories: [
      { category: "Worthy", percentage: Math.round(worthyTime), color: "#4CAF50" },
      { category: "Whirlwind", percentage: Math.round(whirlwindTime), color: "#EDDF00" },
      { category: "Wasted", percentage: Math.round(wastedTime), color: "#F44336" },
    ],
    emailLoad: {
      count: emailData.count,
      hours: emailCost.hours / CALCULATION_CONSTANTS.WEEKS_PER_MONTH,
      delegatableCount: emailData.delegatableCount,
      automatableCount: emailData.automatableCount,
    },
    automationMetrics,
    meetingCost: {
      amount: meetingCost.monthlyCost,
      count: meetingData.count,
      weeklyHours: meetingData.weeklyHours,
    },
    responseLag: {
      pending: decisionData.pending,
      avgHours: decisionData.avgHours,
    },
    timeBreakdown: [
      { 
        category: "Doing the work", 
        percentage: Math.round(doingWorkHours / weeklyTotalHours * 100), 
        hours: Math.round(doingWorkHours * 10) / 10, 
        automatable: Math.round(automatableHours * 10) / 10 
      },
      { 
        category: "Coordinating others", 
        percentage: Math.round(coordinatingHours / weeklyTotalHours * 100), 
        hours: Math.round(coordinatingHours * 10) / 10, 
        automatable: 0 
      },
      { 
        category: "Strategic decisions", 
        percentage: Math.round(strategicHours / weeklyTotalHours * 100), 
        hours: Math.round(strategicHours * 10) / 10, 
        automatable: 0 
      },
      { 
        category: "Admin & overhead", 
        percentage: Math.round(adminHours / weeklyTotalHours * 100), 
        hours: Math.round(adminHours * 10) / 10, 
        automatable: Math.round(automatableHours * 0.2 * 10) / 10 
      },
    ],
    timeLeak: (() => {
      // Calculate actual weekly hours wasted from email and meeting OVERHEAD (not total meeting time)
      const emailWeeklyHours = emailCost.hours / CALCULATION_CONSTANTS.WEEKS_PER_MONTH;
      // Only count meeting OVERHEAD (prep + follow-up): weekly meetings × 15 minutes per meeting
      const meetingOverheadMinutes = meetingData.count * (CALCULATION_CONSTANTS.MEETING_PREP_TIME + CALCULATION_CONSTANTS.MEETING_FOLLOWUP_TIME);
      const meetingOverheadWeeklyHours = meetingOverheadMinutes / 60;
      const totalWeeklyHoursWasted = emailWeeklyHours + meetingOverheadWeeklyHours;
      
      // Generate personalized top leak based on Claude analysis
      // IMPORTANT: Exclude PERSONAL_IGNORE threads from analysis
      const businessAnalyses = emailAnalyses.filter(a => a.category !== 'PERSONAL_IGNORE');
      
      let topLeak = "Email coordination and meeting overhead";
      let description = `You're spending ${Math.round(totalWeeklyHoursWasted)} hours per week on tasks that could be automated or delegated.`;
      
      if (businessAnalyses.length > 0) {
        // Find most common time drain from Claude analysis (excluding personal)
        const timeDrainCounts: Record<string, number> = {};
        businessAnalyses
          .filter(a => a.confidence >= 0.7 && a.timeDrainType)
          .forEach(a => {
            const drain = a.timeDrainType || '';
            timeDrainCounts[drain] = (timeDrainCounts[drain] || 0) + 1;
          });
        
        const sortedDrains = Object.entries(timeDrainCounts)
          .sort((a, b) => b[1] - a[1]);
        
        if (sortedDrains.length > 0) {
          const topDrain = sortedDrains[0][0];
          if (topDrain.includes('Status Update')) {
            topLeak = "Status update loops and repetitive requests";
            description = `You're spending ${Math.round(totalWeeklyHoursWasted)} hours per week responding to status updates and repetitive information requests that could be automated.`;
          } else if (topDrain.includes('Coordination')) {
            topLeak = "Coordination overhead and email back-and-forth";
            description = `You're spending ${Math.round(totalWeeklyHoursWasted)} hours per week on coordination emails that could be streamlined or delegated.`;
          } else if (topDrain.includes('Information Request')) {
            topLeak = "Manual information lookups and data requests";
            description = `You're spending ${Math.round(totalWeeklyHoursWasted)} hours per week answering information requests that could be automated with simple systems.`;
          }
        }
      } else if (emailData.automatableCount > emailData.delegatableCount) {
        topLeak = "Manual process work that could be automated";
        description = `You're spending ${Math.round(totalWeeklyHoursWasted)} hours per week on repetitive process work that could be fully automated with simple workflows.`;
      } else if (emailData.count > 50) {
        topLeak = "Email coordination and meeting overhead";
        description = `You're spending ${Math.round(totalWeeklyHoursWasted)} hours per week on email coordination and meeting overhead that could be automated or delegated.`;
      }
      
      // Calculate monthly overhead cost (only overhead, not actual meeting time)
      const meetingOverheadMonthlyHours = meetingOverheadWeeklyHours * CALCULATION_CONSTANTS.WEEKS_PER_MONTH;
      const meetingOverheadMonthlyCost = meetingOverheadMonthlyHours * CALCULATION_CONSTANTS.CEO_HOURLY_RATE;
      
      return {
        totalHoursWasted: Math.round(totalWeeklyHoursWasted * 10) / 10,
        weeklyValue: calculateWeeklyValue(totalWeeklyHoursWasted),
        monthlyValue: emailCost.cost + Math.round(meetingOverheadMonthlyCost / 100) * 100,
        topLeak,
        description,
      };
    })(),
    aiOpportunities,
    // Meta information (will be added by caller if needed)
  } as any;
}

/**
 * Generate AI opportunities from data and Claude analysis
 */
function generateAIOpportunities(
  emailData: { delegatableCount: number; automatableCount: number; count: number },
  meetingData: { count: number; weeklyHours: number },
  decisionData: { pending: number },
  automationMetrics?: any,
  emailAnalyses?: EmailAnalysisResult[],
  calAnalyses?: CalendarAnalysisResult[],
  aiSolutions?: AISolution[]
): any[] {
  // If we have AI solutions from Claude, use them (content-driven, not count-based)
  if (aiSolutions && aiSolutions.length > 0) {
    return aiSolutions.map((solution, index) => {
      // Estimate time savings and costs based on solution type
      // These are rough estimates - could be refined based on solution name/content
      const timeSavedHours = 4 + (index * 2); // Vary by solution (4-8 hours/week)
      const buildCost = 2000 + (index * 400); // Vary by solution ($2000-2800)
      const monthlyMaintenance = 100 + (index * 50); // Vary by solution ($100-200)
      
      return {
        id: index + 1,
        emoji: index === 0 ? "🤖" : index === 1 ? "🎯" : "📊",
        title: solution.name,
        description: solution.description,
        tools: solution.tools.join(", "), // Convert array to comma-separated string for display
        timeSaved: `${timeSavedHours} hours/week`,
        weeklySavings: Math.round(timeSavedHours * HOURLY_RATE),
        monthlySavings: Math.round(timeSavedHours * HOURLY_RATE * CALCULATION_CONSTANTS.WEEKS_PER_MONTH),
        buildCost,
        monthlyMaintenance,
        breakEvenWeeks: Math.round(buildCost / (timeSavedHours * HOURLY_RATE * 4)),
        roi: `${Math.round(((timeSavedHours * HOURLY_RATE * 52) - buildCost - (monthlyMaintenance * 12)) / buildCost)}x first year`,
        implementationTime: index === 0 ? "2-3 weeks" : index === 1 ? "1-2 weeks" : "2-4 weeks",
        priority: index < 2 ? "high" : "medium",
        type: "ai-powered",
      };
    }).slice(0, 3); // Ensure max 3 solutions
  }
  
  // Fallback to count-based logic if no AI solutions available
  const opportunities: any[] = [];
  
  // Opportunity 1: Automation (if automatable work found)
  // Note: emailAnalyses should already be filtered to exclude PERSONAL_IGNORE by caller
  if (emailData.automatableCount > 0 || (emailAnalyses && emailAnalyses.some(a => 
    a.confidence >= 0.7 && 
    a.category !== 'PERSONAL_IGNORE' &&
    (a.timeDrainType?.toLowerCase().includes('status update') || a.category === 'DELEGATABLE_OPERATIONAL')
  ))) {
    const autoHours = automationMetrics?.weeklyHours || (emailData.automatableCount * 0.15);
    
    // Extract personalized insights from Claude analysis (already filtered for personal)
    const automatableInsights = emailAnalyses?.filter(a => 
      a.confidence >= 0.7 &&
      a.category !== 'PERSONAL_IGNORE' &&
      (
        a.category === 'DELEGATABLE_OPERATIONAL' ||
        a.timeDrainType?.toLowerCase().includes('status update') ||
        a.timeDrainType?.toLowerCase().includes('information request') ||
        a.timeDrainType?.toLowerCase().includes('recurring') ||
        a.suggestedAction?.toLowerCase().includes('automate')
      )
    ) || [];
    
    // Find most common category for automatable work
    const categoryCounts: Record<string, number> = {};
    automatableInsights.forEach(a => {
      const cat = a.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'repetitive tasks';
    
    // Get most relevant suggested action
    const topSuggestion = automatableInsights
      .filter(a => a.suggestedAction)
      .sort((a, b) => b.confidence - a.confidence)[0]?.suggestedAction;
    
    // Build personalized title and description
    let title = "Automate Repetitive Email Work";
    if (topCategory.includes('Support')) title = "Automate Customer Support Requests";
    else if (topCategory.includes('Project')) title = "Automate Project Status Updates";
    else if (topCategory.includes('Sales')) title = "Automate Sales Follow-ups";
    else if (topCategory.includes('Coordination')) title = "Automate Team Coordination";
    
    const description = topSuggestion 
      ? topSuggestion
      : `Stop manually handling ${topCategory.toLowerCase()}. Automate ${automatableInsights.length > 0 ? 'these repetitive' : 'repetitive'} tasks so you can focus on what actually needs you.`;
    
    opportunities.push({
      id: 1,
      emoji: "🤖",
      title,
      description,
      timeSaved: `${Math.round(autoHours)} hours/week`,
      weeklySavings: Math.round(autoHours * HOURLY_RATE),
      monthlySavings: Math.round(autoHours * HOURLY_RATE * CALCULATION_CONSTANTS.WEEKS_PER_MONTH),
      buildCost: automationMetrics?.buildCost || 2400,
      monthlyMaintenance: automationMetrics?.monthlyMaintenance || 100,
      breakEvenWeeks: Math.round((automationMetrics?.buildCost || 2400) / (autoHours * HOURLY_RATE * 4)),
      roi: `${Math.round(((autoHours * HOURLY_RATE * 52) - (automationMetrics?.buildCost || 2400) - ((automationMetrics?.monthlyMaintenance || 100) * 12)) / (automationMetrics?.buildCost || 2400))}x first year`,
      implementationTime: "2-3 weeks",
      priority: "high",
      type: "automation",
    });
  }
  
  // Opportunity 2: Email triage/delegation (if delegatable work found)
  // Note: emailAnalyses should already be filtered to exclude PERSONAL_IGNORE by caller
  if (emailData.delegatableCount > 0 || (emailAnalyses && emailAnalyses.some(a => 
    a.confidence >= 0.7 && 
    a.category !== 'PERSONAL_IGNORE' &&
    (a.category === 'DELEGATABLE_OPERATIONAL' || a.category === 'TEAM_COORDINATION' || a.category === 'FIREFIGHTING')
  ))) {
    const emailHours = (emailData.delegatableCount * 0.08); // ~5 min per email
    
    // Extract delegatable insights from Claude (already filtered for personal)
    const delegatableInsights = emailAnalyses?.filter(a => 
      a.confidence >= 0.7 &&
      a.category !== 'PERSONAL_IGNORE' &&
      (
        a.category === 'DELEGATABLE_OPERATIONAL' ||
        a.category === 'TEAM_COORDINATION' ||
        a.category === 'FIREFIGHTING' ||
        // Backward compatibility
        (typeof a.category === 'string' && (
          a.category.toLowerCase().includes('support') ||
          a.category.toLowerCase().includes('coordination')
        )) ||
        a.suggestedAction?.toLowerCase().includes('delegate')
      )
    ) || [];
    
    // Find most common category
    const categoryCounts: Record<string, number> = {};
    delegatableInsights.forEach(a => {
      const cat = a.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'coordination emails';
    
    const topSuggestion = delegatableInsights
      .filter(a => a.suggestedAction)
      .sort((a, b) => b.confidence - a.confidence)[0]?.suggestedAction;
    
    let title = "Delegate Email Management";
    if (topCategory.includes('Support')) title = "Delegate Customer Support Emails";
    else if (topCategory.includes('Coordination')) title = "Delegate Team Coordination";
    else if (topCategory.includes('Project')) title = "Delegate Project Communications";
    
    const description = topSuggestion
      ? topSuggestion
      : `Let your team handle ${topCategory.toLowerCase()}. An AI assistant sorts your emails and routes ${delegatableInsights.length > 0 ? 'these' : 'routine'} tasks to the right person so you only see what actually needs your attention.`;
    
    opportunities.push({
      id: 2,
      emoji: "🎯",
      title,
      description,
      timeSaved: `${Math.round(emailHours)} hours/week`,
      weeklySavings: Math.round(emailHours * HOURLY_RATE),
      monthlySavings: Math.round(emailHours * HOURLY_RATE * CALCULATION_CONSTANTS.WEEKS_PER_MONTH),
      buildCost: 0,
      monthlyMaintenance: 200,
      breakEvenWeeks: 1,
      roi: `${Math.round((emailHours * HOURLY_RATE * 52) / 2400)}x first year`,
      implementationTime: "3-5 days",
      priority: "high",
      type: "ai-assisted",
    });
  }
  
  // Opportunity 3: Meeting optimization (if significant wasteful meetings found)
  const wastefulMeetings = calAnalyses?.filter(a => a.confidence >= 0.7 && a.isWasteful === true) || [];
  if (meetingData.count > 10 || meetingData.weeklyHours > 8 || wastefulMeetings.length > 0) {
    const meetingHours = wastefulMeetings.length > 0
      ? (wastefulMeetings.length * 0.5) // 30 min saved per wasteful meeting per week
      : (meetingData.count * 0.25); // ~15 min prep per meeting
    
    // Get personalized meeting suggestions from Claude
    const meetingSuggestions = calAnalyses
      ?.filter(a => a.confidence >= 0.7 && a.suggestedAction)
      .sort((a, b) => b.confidence - a.confidence) || [];
    
    const topMeetingSuggestion = meetingSuggestions[0]?.suggestedAction;
    const topWastefulCategory = wastefulMeetings.length > 0
      ? wastefulMeetings
          .map(m => m.category)
          .reduce((acc: Record<string, number>, cat) => {
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
          }, {})
      : {};
    const mostCommonWasteful = Object.entries(topWastefulCategory)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    
    let title = wastefulMeetings.length > 0 ? "Eliminate Wasteful Meetings & Automate Prep" : "Meeting Prep & Follow-up Assistant";
    if (mostCommonWasteful.includes('Status') || mostCommonWasteful.includes('Standup')) {
      title = "Replace Status Meetings with Async Updates";
    } else if (mostCommonWasteful.includes('Planning')) {
      title = "Streamline Planning Meetings";
    }
    
    const description = topMeetingSuggestion
      ? topMeetingSuggestion
      : wastefulMeetings.length > 0
      ? `You have ${wastefulMeetings.length} ${mostCommonWasteful || 'meetings'} per week that could be replaced with async updates or eliminated. Automate meeting prep and follow-up to save time on the rest.`
      : "Never walk into a meeting unprepared again. Get a one-page brief with everything you need to know before each meeting, plus automatic summaries and action items afterward. No more scrambling for context or losing track of decisions.";
    
    opportunities.push({
      id: 3,
      emoji: "📊",
      title,
      description,
      timeSaved: `${Math.round(meetingHours)} hours/week`,
      weeklySavings: Math.round(meetingHours * HOURLY_RATE),
      monthlySavings: Math.round(meetingHours * HOURLY_RATE * CALCULATION_CONSTANTS.WEEKS_PER_MONTH),
      buildCost: 1200,
      monthlyMaintenance: 150,
      breakEvenWeeks: Math.round(1200 / (meetingHours * HOURLY_RATE * 4)),
      roi: `${Math.round(((meetingHours * HOURLY_RATE * 52) - 1200 - 1800) / 1200)}x first year`,
      implementationTime: "1-2 weeks",
      priority: meetingHours > 6 || wastefulMeetings.length > 5 ? "high" : "medium",
      type: "ai-assisted",
    });
  }
  
  // Sort by priority and ROI, return top 3
  return opportunities
    .sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return b.weeklySavings - a.weeklySavings;
    })
    .slice(0, 3);
}
