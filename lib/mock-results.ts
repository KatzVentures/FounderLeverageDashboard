import { getStageByScore } from './stages';
import { CALCULATION_CONSTANTS, calculateAutomationCost } from './calculation-formulas';

// Hourly rate for calculating time value (using calculation constants)
export const HOURLY_RATE = CALCULATION_CONSTANTS.CEO_HOURLY_RATE;

// Calculate value from hours
export const calculateWeeklyValue = (hours: number): number => {
  return Math.round(hours * HOURLY_RATE);
};

export const calculateMonthlyValue = (weeklyValue: number): number => {
  return Math.round(weeklyValue * CALCULATION_CONSTANTS.WEEKS_PER_MONTH);
};

export const mockResults = {
  score: 72, // Adjusted to reflect new 5-component system
  // stage is NOT stored - always calculated from score on the frontend
  
  // NEW: Component scores (out of 100 total)
  componentScores: {
    timeAllocation: 21, // out of 30
    delegationQuality: 18, // out of 25
    processMaturity: 11, // out of 20 (NEW - shows low automation maturity)
    strategicFocus: 12, // out of 15
    operatingRhythm: 10, // out of 10
  },
  
  timeCategories: [
    { category: "Worthy", percentage: 42, color: "#4CAF50" },
    { category: "Whirlwind", percentage: 31, color: "#EDDF00" },
    { category: "Wasted", percentage: 27, color: "#F44336" },
  ],
  
  emailLoad: {
    count: 247,
    hours: 18.4,
    delegatableCount: 98, // Human-delegatable (reduced from 180)
    automatableCount: 82, // NEW: Automatable process work (POs, invoices, status requests)
  },
  
  // NEW: Automation opportunity analysis
  automationMetrics: (() => {
    const autoCalc = calculateAutomationCost(82, 247);
    return {
      weeklyHours: autoCalc.weeklyHours,
      monthlyHours: autoCalc.monthlyHours,
      monthlyCost: autoCalc.monthlyCost,
      patterns: [
        { type: "Purchase order requests", count: 34, percentage: 41 },
        { type: "Invoice processing", count: 21, percentage: 26 },
        { type: "Inventory status checks", count: 15, percentage: 18 },
        { type: "Order status updates", count: 12, percentage: 15 },
      ],
      buildCost: autoCalc.automation.buildCost,
      monthlyMaintenance: autoCalc.automation.monthlyMaintenance,
      breakEvenMonths: autoCalc.automation.breakEvenMonths,
      firstYearSavings: autoCalc.automation.firstYearSavings,
      delegationAlternative: autoCalc.delegation.monthlyCost,
    };
  })(),
  
  meetingCost: {
    amount: 11200,
    count: 23,
    weeklyHours: 12, // For calculations
  },
  
  responseLag: {
    pending: 34,
    avgHours: 8.2,
  },
  
  timeBreakdown: [
    { category: "Doing the work", percentage: 42, hours: 16.8, automatable: 10.2 }, // NEW: automatable hours
    { category: "Coordinating others", percentage: 31, hours: 12.4, automatable: 0 },
    { category: "Strategic decisions", percentage: 18, hours: 7.2, automatable: 0 },
    { category: "Admin & overhead", percentage: 9, hours: 3.6, automatable: 1.8 },
  ],
  
  timeLeak: {
    totalHoursWasted: 24.6,
    weeklyValue: calculateWeeklyValue(24.6),
    monthlyValue: calculateMonthlyValue(calculateWeeklyValue(24.6)),
    topLeak: "Manual process work (POs, invoices, status requests)",
    description: "You're spending 12+ hours per week on repetitive process work that could be fully automated with simple workflows.",
  },
  
  aiOpportunities: [
    {
      id: 1,
      emoji: "🤖",
      title: "Stop Manual Order & Invoice Processing",
      description: "Stop answering the same requests over and over. A simple automated system handles purchase orders, invoices, and inventory questions—no emails, no manual work, no delegation needed. It just runs in the background.",
      timeSaved: "12 hours/week",
      weeklySavings: 12 * HOURLY_RATE,
      monthlySavings: Math.round(12 * HOURLY_RATE * CALCULATION_CONSTANTS.WEEKS_PER_MONTH),
      buildCost: 2400, // ~16 hours @ $150/hr
      monthlyMaintenance: 100,
      breakEvenWeeks: 3,
      roi: "15x first year",
      implementationTime: "2-3 weeks",
      priority: "high",
      type: "automation", // NEW: distinguish from delegation
    },
    {
      id: 2,
      emoji: "🎯",
      title: "Smart Email Assistant for Your Team",
      description: "An AI assistant reads your emails, sorts what needs your attention, drafts responses for common requests, and sends the rest to your team. You only see what actually needs you—everything else gets handled automatically.",
      timeSaved: "8 hours/week",
      weeklySavings: 8 * HOURLY_RATE,
      monthlySavings: Math.round(8 * HOURLY_RATE * CALCULATION_CONSTANTS.WEEKS_PER_MONTH),
      buildCost: 0, // Software subscription
      monthlyMaintenance: 200, // AI API costs + tool
      breakEvenWeeks: 1,
      roi: "40x first year",
      implementationTime: "3-5 days",
      priority: "high",
      type: "ai-assisted", // NEW
    },
    {
      id: 3,
      emoji: "📊",
      title: "Meeting Prep & Follow-up Assistant",
      description: "Never walk into a meeting unprepared again. Get a one-page brief with everything you need to know before each meeting, plus automatic summaries and action items afterward. No more scrambling for context or losing track of decisions.",
      timeSaved: "6 hours/week",
      weeklySavings: 6 * HOURLY_RATE,
      monthlySavings: Math.round(6 * HOURLY_RATE * CALCULATION_CONSTANTS.WEEKS_PER_MONTH),
      buildCost: 1200, // ~8 hours @ $150/hr
      monthlyMaintenance: 150,
      breakEvenWeeks: 2,
      roi: "20x first year",
      implementationTime: "1-2 weeks",
      priority: "medium",
      type: "ai-assisted", // NEW
    },
  ],
};
