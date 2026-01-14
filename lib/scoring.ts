/**
 * Scoring Logic - Calculate Efficiency Index from assessment responses
 */

import { assessmentQuestions, scoringMap } from './questions';
import { getStageByScore } from './stages';
import { calculateEmailCost, calculateMeetingCost, calculateAITimeback, calculateAutomationCost } from './calculation-formulas';
import { CALCULATION_CONSTANTS } from './calculation-formulas';
import { HOURLY_RATE, calculateWeeklyValue, calculateMonthlyValue } from './mock-results';

export interface AssessmentResponses {
  [questionId: string]: string | boolean;
  email?: string;
}

export interface EmailCalendarData {
  emailLoad?: {
    count: number;
    delegatableCount: number;
    automatableCount: number;
  };
  meetingCost?: {
    count: number;
    weeklyHours: number;
  };
  responseLag?: {
    pending: number;
    avgHours: number;
  };
}

/**
 * Calculate component score from self-assessment answers
 */
function calculateComponentScore(
  component: string,
  responses: AssessmentResponses,
  emailCalendarData?: EmailCalendarData
): number {
  // Get all questions for this component
  const componentQuestions = assessmentQuestions.filter(q => q.component === component);
  
  // Calculate self-assessment points
  let selfAssessmentPoints = 0;
  componentQuestions.forEach(question => {
    const response = responses[question.id];
    if (response === undefined) return; // Skip unanswered questions
    
    if (question.type === 'dropdown' && typeof response === 'string' && question.options) {
      const optionIndex = question.options.indexOf(response);
      if (optionIndex >= 0) {
        // Choose the right scoring array based on question type
        let scoringArray: number[];
        if (question.reverseScored) {
          scoringArray = question.options.length === 4 
            ? [0.0, 0.33, 0.66, 1.0] // Reverse 4-option (for q5, q6, q11, q12)
            : scoringMap.dropdownReverse; // Reverse 5-option (currently unused, kept for q7 if needed)
        } else {
          scoringArray = question.options.length === 4 
            ? scoringMap.dropdown4 // Normal 4-option (frequency questions, Process Maturity)
            : scoringMap.dropdown; // Normal 5-option (q7 confidence question)
        }
        const multiplier = scoringArray[optionIndex] || scoringArray[Math.min(optionIndex, scoringArray.length - 1)];
        selfAssessmentPoints += question.points * multiplier;
      }
    } else if (question.type === 'toggle' && typeof response === 'boolean') {
      // Use reverse scoring map if question is reverse-scored
      const toggleMap = question.reverseScored 
        ? scoringMap.toggleReverse 
        : scoringMap.toggle;
      const multiplier = toggleMap[response.toString() as keyof typeof toggleMap];
      selfAssessmentPoints += question.points * multiplier;
    }
  });
  
  // Calculate data-driven points (50% of total comes from email/calendar analysis)
  // For now, we'll use a placeholder - in production, this would come from actual email/calendar API
  let dataPoints = 0;
  const componentWeights = {
    timeAllocation: 30,
    delegationQuality: 25,
    strategicFocus: 20,
    operatingRhythm: 15
  };
  
  const componentWeight = componentWeights[component as keyof typeof componentWeights] || 0;
  const maxComponentPoints = componentWeight;
  const maxSelfAssessment = componentQuestions.reduce((sum, q) => sum + q.points, 0);
  
  // Data points = remaining points to reach component weight
  // In production, calculate from email/calendar data
  dataPoints = Math.max(0, maxComponentPoints - maxSelfAssessment);
  
  // For now, scale self-assessment to component weight
  // In production, replace with real data analysis
  const selfAssessmentScaled = (selfAssessmentPoints / maxSelfAssessment) * (maxComponentPoints * 0.5);
  dataPoints = maxComponentPoints * 0.5; // Placeholder - would come from actual data
  
  return Math.round(selfAssessmentScaled + dataPoints);
}

/**
 * Calculate total score from all component scores
 */
export function calculateTotalScore(
  responses: AssessmentResponses,
  emailCalendarData?: EmailCalendarData
): number {
  const components = ['timeAllocation', 'delegationQuality', 'strategicFocus', 'operatingRhythm'];
  
  let totalScore = 0;
  components.forEach(component => {
    totalScore += calculateComponentScore(component, responses, emailCalendarData);
  });
  
  return Math.min(100, Math.max(0, totalScore));
}

/**
 * Calculate component scores object
 */
export function calculateComponentScores(
  responses: AssessmentResponses,
  emailCalendarData?: EmailCalendarData
) {
  return {
    timeAllocation: calculateComponentScore('timeAllocation', responses, emailCalendarData),
    delegationQuality: calculateComponentScore('delegationQuality', responses, emailCalendarData),
    strategicFocus: calculateComponentScore('strategicFocus', responses, emailCalendarData),
    operatingRhythm: calculateComponentScore('operatingRhythm', responses, emailCalendarData),
  };
}

/**
 * Generate results structure from assessment responses and email/calendar data
 * This function will replace mockResults when real data is available
 */
export function generateResults(
  responses: AssessmentResponses,
  emailCalendarData?: EmailCalendarData
) {
  const totalScore = calculateTotalScore(responses, emailCalendarData);
  const componentScores = calculateComponentScores(responses, emailCalendarData);
  
  // Use provided data or defaults
  const emailData = emailCalendarData?.emailLoad || {
    count: 0,
    delegatableCount: 0,
    automatableCount: 0,
  };
  
  const meetingData = emailCalendarData?.meetingCost || {
    count: 0,
    weeklyHours: 0,
  };
  
  const decisionData = emailCalendarData?.responseLag || {
    pending: 0,
    avgHours: 0,
  };
  
  // Calculate costs
  const emailCost = calculateEmailCost(emailData.delegatableCount, emailData.count);
  const meetingCost = calculateMeetingCost(meetingData.count, meetingData.weeklyHours);
  const aiTimeback = calculateAITimeback(
    { delegatableCount: emailData.delegatableCount },
    { weeklyCount: meetingData.count },
    { pendingCount: decisionData.pending },
    { automatableCount: emailData.automatableCount }
  );
  
  // Calculate automation metrics if automatableCount > 0
  const automationMetrics = emailData.automatableCount > 0
    ? (() => {
        const autoCalc = calculateAutomationCost(emailData.automatableCount, emailData.count);
        return {
          weeklyHours: autoCalc.weeklyHours,
          monthlyHours: autoCalc.monthlyHours,
          monthlyCost: autoCalc.monthlyCost,
          patterns: [], // Would come from email analysis
          buildCost: autoCalc.automation.buildCost,
          monthlyMaintenance: autoCalc.automation.monthlyMaintenance,
          breakEvenMonths: autoCalc.automation.breakEvenMonths,
          firstYearSavings: autoCalc.automation.firstYearSavings,
          delegationAlternative: autoCalc.delegation.monthlyCost,
        };
      })()
    : undefined;
  
  // Calculate time categories (simplified - would come from calendar analysis)
  const worthyTime = Math.max(30, totalScore * 0.6); // At least 30% if score is decent
  const wastedTime = Math.max(10, 100 - totalScore); // Inverse relationship
  const whirlwindTime = 100 - worthyTime - wastedTime;
  
  return {
    score: totalScore,
    // NOTE: stage is NOT stored - always calculated from score on the frontend
    componentScores,
    timeCategories: [
      { category: "Worthy", percentage: Math.round(worthyTime), color: "#4CAF50" },
      { category: "Whirlwind", percentage: Math.round(whirlwindTime), color: "#EDDF00" },
      { category: "Wasted", percentage: Math.round(wastedTime), color: "#F44336" },
    ],
    emailLoad: {
      count: emailData.count,
      hours: emailCost.hours / CALCULATION_CONSTANTS.WEEKS_PER_MONTH, // Convert monthly to weekly
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
      { category: "Doing the work", percentage: Math.round(worthyTime * 0.7), hours: 0, automatable: 0 },
      { category: "Coordinating others", percentage: Math.round(whirlwindTime), hours: 0, automatable: 0 },
      { category: "Strategic decisions", percentage: Math.round(worthyTime * 0.3), hours: 0, automatable: 0 },
      { category: "Admin & overhead", percentage: Math.round(wastedTime), hours: 0, automatable: 0 },
    ],
    timeLeak: {
      totalHoursWasted: Math.round((emailCost.hours + meetingCost.monthlyHours) / CALCULATION_CONSTANTS.WEEKS_PER_MONTH),
      weeklyValue: calculateWeeklyValue((emailCost.hours + meetingCost.monthlyHours) / CALCULATION_CONSTANTS.WEEKS_PER_MONTH),
      monthlyValue: emailCost.cost + meetingCost.monthlyCost,
      topLeak: emailData.automatableCount > emailData.delegatableCount 
        ? "Manual process work (POs, invoices, status requests)"
        : "Email coordination and meeting overhead",
      description: emailData.automatableCount > emailData.delegatableCount
        ? "You're spending 12+ hours per week on repetitive process work that could be fully automated with simple workflows."
        : "You're spending nearly 25 hours per week on tasks that could be automated or delegated.",
    },
    // Generate AI opportunities from actual patterns found
    aiOpportunities: generateAIOpportunities(emailData, meetingData, decisionData, automationMetrics),
  };
}

/**
 * Generate business-friendly AI opportunity descriptions from email/calendar analysis
 * This ensures descriptions stay business-focused, not technical, when using real data
 */
function generateAIOpportunities(
  emailData: { delegatableCount: number; automatableCount: number; count: number },
  meetingData: { count: number; weeklyHours: number },
  decisionData: { pending: number },
  automationMetrics?: any
): any[] {
  const opportunities: any[] = [];
  
  // Opportunity 1: Automation (if automatable work found)
  if (emailData.automatableCount > 20) {
    const autoHours = automationMetrics?.weeklyHours || (emailData.automatableCount * 0.15);
    opportunities.push({
      id: 1,
      emoji: "🤖",
      title: "Stop Manual Order & Invoice Processing",
      description: `Stop answering the same requests over and over. A simple automated system handles ${emailData.automatableCount > 50 ? 'recurring' : 'repetitive'} tasks like purchase orders, invoices, and inventory questions—no emails, no manual work, no delegation needed. It just runs in the background.`,
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
  
  // Opportunity 2: Email triage (if delegatable work found)
  if (emailData.delegatableCount > 30) {
    const emailHours = (emailData.delegatableCount * 0.08); // ~5 min per email
    opportunities.push({
      id: 2,
      emoji: "🎯",
      title: "Smart Email Assistant for Your Team",
      description: `An AI assistant reads your emails, sorts what needs your attention, drafts responses for common requests, and sends the rest to your team. You only see what actually needs you—everything else gets handled automatically.`,
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
  
  // Opportunity 3: Meeting prep (if significant meeting time)
  if (meetingData.count > 10 || meetingData.weeklyHours > 8) {
    const meetingHours = meetingData.count * 0.25; // ~15 min prep per meeting
    opportunities.push({
      id: 3,
      emoji: "📊",
      title: "Meeting Prep & Follow-up Assistant",
      description: "Never walk into a meeting unprepared again. Get a one-page brief with everything you need to know before each meeting, plus automatic summaries and action items afterward. No more scrambling for context or losing track of decisions.",
      timeSaved: `${Math.round(meetingHours)} hours/week`,
      weeklySavings: Math.round(meetingHours * HOURLY_RATE),
      monthlySavings: Math.round(meetingHours * HOURLY_RATE * CALCULATION_CONSTANTS.WEEKS_PER_MONTH),
      buildCost: 1200,
      monthlyMaintenance: 150,
      breakEvenWeeks: Math.round(1200 / (meetingHours * HOURLY_RATE * 4)),
      roi: `${Math.round(((meetingHours * HOURLY_RATE * 52) - 1200 - 1800) / 1200)}x first year`,
      implementationTime: "1-2 weeks",
      priority: meetingHours > 6 ? "high" : "medium",
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
