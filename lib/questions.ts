/**
 * Assessment Questions - Original 24 questions + Process Maturity section
 * Maps to 5 scoring components: Time Allocation, Delegation Quality, Process Maturity, Strategic Focus, Operating Rhythm
 */

export type QuestionType = 'dropdown' | 'toggle';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // For dropdown questions
  component: 'timeAllocation' | 'delegationQuality' | 'processMaturity' | 'strategicFocus' | 'operatingRhythm';
  points: number; // Max points this question contributes to score
  reverseScored?: boolean; // If true, lower values = better (for reverse-scored questions)
}

export const assessmentQuestions: Question[] = [
  // WHERE YOUR TIME ACTUALLY GOES (6 dropdowns)
  {
    id: 'q1',
    text: 'How often do you block time for deep, focused work?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'timeAllocation',
    points: 4
  },
  {
    id: 'q2',
    text: 'How often do you get pulled into strategy and big-picture thinking?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'timeAllocation',
    points: 4
  },
  {
    id: 'q3',
    text: 'How often do you lead or attend scheduled team meetings?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'timeAllocation',
    points: 3
  },
  {
    id: 'q4',
    text: 'How often do you give guidance to accelerate results/projects?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'timeAllocation',
    points: 3
  },
  {
    id: 'q5',
    text: 'How often do you get pulled into unscheduled tasks?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'timeAllocation',
    points: 3,
    reverseScored: true
  },
  {
    id: 'q6',
    text: 'How often do you take over tasks your team should do?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'timeAllocation',
    points: 3,
    reverseScored: true
  },

  // WHAT YOU SHOULDN'T OWN (ANYMORE) (6 dropdowns)
  {
    id: 'q7',
    text: 'How confident are you in your team\'s decisions?',
    type: 'dropdown',
    options: ['Fully Confident', 'Very Confident', 'Mostly Confident', 'Somewhat Confident', 'Not Confident'],
    component: 'delegationQuality',
    points: 4
  },
  {
    id: 'q8',
    text: 'How often can you coach or mentor your reports?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'delegationQuality',
    points: 3
  },
  {
    id: 'q9',
    text: 'How often do you reset or clarify team responsibilities?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'delegationQuality',
    points: 3
  },
  {
    id: 'q10',
    text: 'How often do you ensure follow-through on delegated tasks?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'delegationQuality',
    points: 3
  },
  {
    id: 'q11',
    text: 'How often do you make decisions your team should own?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'delegationQuality',
    points: 3,
    reverseScored: true
  },
  {
    id: 'q12',
    text: 'How often do you redo work instead of giving feedback?',
    type: 'dropdown',
    options: ['Daily', 'Weekly', 'Occasionally', 'Rarely'],
    component: 'delegationQuality',
    points: 3,
    reverseScored: true
  },

  // HOW YOU PROTECT (OR DESTROY) YOUR FOCUS (6 toggles)
  {
    id: 'q13',
    text: 'I protect time for thinking, not just doing',
    type: 'toggle',
    component: 'strategicFocus',
    points: 3
  },
  {
    id: 'q14',
    text: 'I end each week with a clear review or recap',
    type: 'toggle',
    component: 'strategicFocus',
    points: 2
  },
  {
    id: 'q15',
    text: 'I start each day with a clear priority list',
    type: 'toggle',
    component: 'strategicFocus',
    points: 2
  },
  {
    id: 'q16',
    text: 'I batch communications and shallow work',
    type: 'toggle',
    component: 'strategicFocus',
    points: 2
  },
  {
    id: 'q17',
    text: 'I keep working even when I\'m mentally exhausted',
    type: 'toggle',
    component: 'strategicFocus',
    points: 2,
    reverseScored: true
  },
  {
    id: 'q18',
    text: 'I\'m always busy with tasks that feel urgent but aren\'t strategic',
    type: 'toggle',
    component: 'strategicFocus',
    points: 2,
    reverseScored: true
  },

  // YOUR PERSONAL OPERATING SYSTEM (6 toggles)
  {
    id: 'q19',
    text: 'I plan my week in advance with clear priorities',
    type: 'toggle',
    component: 'operatingRhythm',
    points: 2
  },
  {
    id: 'q20',
    text: 'I review my P&L & key financials at least monthly',
    type: 'toggle',
    component: 'operatingRhythm',
    points: 2
  },
  {
    id: 'q21',
    text: 'I schedule time weekly for learning or growth',
    type: 'toggle',
    component: 'operatingRhythm',
    points: 2
  },
  {
    id: 'q22',
    text: 'I block time each week for recovery or rest',
    type: 'toggle',
    component: 'operatingRhythm',
    points: 2
  },
  {
    id: 'q23',
    text: 'I start most days by checking Slack or email',
    type: 'toggle',
    component: 'operatingRhythm',
    points: 2,
    reverseScored: true
  },
  {
    id: 'q24',
    text: 'I often step in to fix issues my team could resolve themselves',
    type: 'toggle',
    component: 'operatingRhythm',
    points: 2,
    reverseScored: true
  },
];

// Scoring map for dropdown answers
// For normal questions: index 0 = best answer (highest score), last index = worst
// For reverse scored questions: index 0 = worst (lowest score), last index = best
export const scoringMap = {
  dropdown: [1.0, 0.75, 0.5, 0.25, 0.0], // 5-option dropdown scoring (for q7 confidence question)
  dropdown4: [1.0, 0.66, 0.33, 0.0], // 4-option dropdown scoring (for frequency questions and Process Maturity)
  dropdownReverse: [0.0, 0.25, 0.5, 0.75, 1.0], // Reverse scored 5-option (for q7 if reverse-scored)
  toggle: { true: 1.0, false: 0.0 }, // Full points or zero
  toggleReverse: { true: 0.0, false: 1.0 }, // Reverse scored toggles (q17, q18, q23, q24)
};

// Total possible points breakdown (to be updated based on final scoring logic):
// Time Allocation: 20 points (6 questions)
// Delegation Quality: 19 points (6 questions)
// Strategic Focus: 13 points (6 questions)
// Operating Rhythm: 12 points (6 questions)
// TOTAL: 64 points from self-assessment
// NOTE: Process Maturity section removed per requirements
