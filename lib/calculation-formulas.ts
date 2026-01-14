export const CALCULATION_CONSTANTS = {
  CEO_HOURLY_RATE: 250, // $250/hr
  EMAIL_READ_TIME: 2, // minutes
  EMAIL_RESPONSE_TIME: 5, // minutes
  MEETING_PREP_TIME: 10, // minutes
  MEETING_CONTEXT_SWITCH: 0, // minutes (set to zero per user request)
  MEETING_FOLLOWUP_TIME: 5, // minutes
  WEEKS_PER_MONTH: 4.3,
  
  // Time-back caps (monthly hours)
  MAX_EMAIL_TIMEBACK: 10,
  MAX_MEETING_PREP_TIMEBACK: 8,
  MAX_DECISION_TIMEBACK: 5,
  MAX_AUTOMATION_TIMEBACK: 12, // NEW: Cap for automation opportunities
  MAX_TOTAL_TIMEBACK: 25, // Increased from 20 to account for automation
  
  // Automation economics
  AUTOMATION_BUILD_COST_PER_HOUR: 150, // $150/hr for n8n/automation build
  AUTOMATION_MONTHLY_MAINTENANCE: 100, // $100/mo avg for hosting + maintenance
  VA_HOURLY_RATE: 35 // $35/hr for delegation comparison
};

export function calculateEmailCost(delegatableCount: number, weeklyVolume: number) {
  const responseTime = (delegatableCount * 0.6) * CALCULATION_CONSTANTS.EMAIL_RESPONSE_TIME; // 60% require responses
  const readTime = delegatableCount * CALCULATION_CONSTANTS.EMAIL_READ_TIME;
  const weeklyMinutes = responseTime + readTime;
  const monthlyHours = (weeklyMinutes / 60) * CALCULATION_CONSTANTS.WEEKS_PER_MONTH;
  const monthlyCost = monthlyHours * CALCULATION_CONSTANTS.CEO_HOURLY_RATE;
  
  return {
    hours: Math.round(monthlyHours * 10) / 10, // Round to 1 decimal place
    cost: Math.round(monthlyCost / 100) * 100 // Round to nearest $100
  };
}

export function calculateMeetingCost(weeklyMeetings: number, weeklyHours: number) {
  const prepMinutes = weeklyMeetings * CALCULATION_CONSTANTS.MEETING_PREP_TIME;
  const switchingMinutes = weeklyMeetings * CALCULATION_CONSTANTS.MEETING_CONTEXT_SWITCH;
  const followupMinutes = weeklyMeetings * CALCULATION_CONSTANTS.MEETING_FOLLOWUP_TIME;
  
  const totalWeeklyMinutes = (weeklyHours * 60) + prepMinutes + switchingMinutes + followupMinutes;
  const weeklyTrueHours = totalWeeklyMinutes / 60;
  const monthlyHours = (totalWeeklyMinutes / 60) * CALCULATION_CONSTANTS.WEEKS_PER_MONTH;
  const monthlyCost = monthlyHours * CALCULATION_CONSTANTS.CEO_HOURLY_RATE;
  
  return {
    actualHours: Math.round(weeklyHours * 10) / 10, // Round to 1 decimal place
    trueHours: Math.round(weeklyTrueHours * 10) / 10, // Round to 1 decimal place
    monthlyHours: Math.round(monthlyHours * 10) / 10, // Round to 1 decimal place
    monthlyCost: Math.round(monthlyCost / 100) * 100 // Round to nearest $100
  };
}

// NEW: Calculate automation opportunity vs delegation
export function calculateAutomationCost(automatableCount: number, weeklyVolume: number) {
  // Time spent on automatable work
  const responseTime = (automatableCount * 0.7) * CALCULATION_CONSTANTS.EMAIL_RESPONSE_TIME; // 70% require responses (higher than general delegatable)
  const readTime = automatableCount * CALCULATION_CONSTANTS.EMAIL_READ_TIME;
  const weeklyMinutes = responseTime + readTime;
  const weeklyHours = weeklyMinutes / 60;
  const monthlyHours = weeklyHours * CALCULATION_CONSTANTS.WEEKS_PER_MONTH;
  const monthlyCost = monthlyHours * CALCULATION_CONSTANTS.CEO_HOURLY_RATE;
  
  // Automation build cost (estimate 10-20 hours to build workflow)
  const estimatedBuildHours = Math.min(Math.max(10, automatableCount / 10), 20); // Scale with complexity, cap at 20hrs
  const buildCost = estimatedBuildHours * CALCULATION_CONSTANTS.AUTOMATION_BUILD_COST_PER_HOUR;
  
  // ROI calculation
  const monthlyMaintenance = CALCULATION_CONSTANTS.AUTOMATION_MONTHLY_MAINTENANCE;
  const breakEvenMonths = buildCost / (monthlyCost - monthlyMaintenance);
  
  // Delegation alternative cost
  const delegationHoursNeeded = weeklyHours * CALCULATION_CONSTANTS.WEEKS_PER_MONTH;
  const delegationCost = delegationHoursNeeded * CALCULATION_CONSTANTS.VA_HOURLY_RATE;
  
  return {
    weeklyHours: Math.round(weeklyHours * 10) / 10,
    monthlyHours: Math.round(monthlyHours * 10) / 10,
    monthlyCost: Math.round(monthlyCost / 100) * 100,
    automation: {
      buildCost: Math.round(buildCost / 100) * 100,
      monthlyMaintenance: monthlyMaintenance,
      breakEvenMonths: Math.round(breakEvenMonths * 10) / 10,
      firstYearSavings: Math.round((monthlyCost * 12) - buildCost - (monthlyMaintenance * 12))
    },
    delegation: {
      monthlyCost: Math.round(delegationCost / 100) * 100,
      annualCost: Math.round((delegationCost * 12) / 100) * 100
    }
  };
}

export function calculateAITimeback(emailData: any, meetingData: any, decisionData: any, automationData?: any) {
  // Email triage timeback (50% of human-delegatable emails only)
  const emailMinutes = (emailData.delegatableCount * 0.5) * 3.5;
  const emailHoursRaw = (emailMinutes / 60) * CALCULATION_CONSTANTS.WEEKS_PER_MONTH;
  const emailHours = Math.min(emailHoursRaw, CALCULATION_CONSTANTS.MAX_EMAIL_TIMEBACK);
  
  // Meeting prep timeback
  const meetingPrepMinutes = meetingData.weeklyCount * CALCULATION_CONSTANTS.MEETING_PREP_TIME;
  const meetingHoursRaw = (meetingPrepMinutes / 60) * CALCULATION_CONSTANTS.WEEKS_PER_MONTH;
  const meetingHours = Math.min(meetingHoursRaw, CALCULATION_CONSTANTS.MAX_MEETING_PREP_TIMEBACK);
  
  // Decision timeback
  const decisionMinutes = decisionData.pendingCount * 5;
  const decisionHoursRaw = decisionMinutes / 60;
  const decisionHours = Math.min(decisionHoursRaw, CALCULATION_CONSTANTS.MAX_DECISION_TIMEBACK);
  
  // NEW: Automation timeback (if automation data provided)
  let automationHours = 0;
  if (automationData && automationData.automatableCount) {
    const automationMinutes = (automationData.automatableCount * 0.8) * 4; // 80% of automatable work, 4min avg per item
    const automationHoursRaw = (automationMinutes / 60) * CALCULATION_CONSTANTS.WEEKS_PER_MONTH;
    automationHours = Math.min(automationHoursRaw, CALCULATION_CONSTANTS.MAX_AUTOMATION_TIMEBACK);
  }
  
  // Total with cap
  const totalHoursRaw = emailHours + meetingHours + decisionHours + automationHours;
  const totalHours = Math.min(totalHoursRaw, CALCULATION_CONSTANTS.MAX_TOTAL_TIMEBACK);
  const totalCost = Math.round((totalHours * CALCULATION_CONSTANTS.CEO_HOURLY_RATE) / 100) * 100;
  
  return {
    hours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
    cost: totalCost,
    breakdown: {
      email: Math.round(emailHours * 10) / 10, // Round to 1 decimal place
      meetings: Math.round(meetingHours * 10) / 10, // Round to 1 decimal place
      decisions: Math.round(decisionHours * 10) / 10, // Round to 1 decimal place
      automation: Math.round(automationHours * 10) / 10 // Round to 1 decimal place
    }
  };
}