// Leader Stage Thresholds and Definitions
export interface LeaderStage {
  name: string;
  emoji: string;
  description: string;
  minScore: number;
  maxScore: number;
}

export const LEADER_STAGES: LeaderStage[] = [
  {
    name: "Elite Operator",
    emoji: "🚀",
    description: "You've built a machine. Your time is focused, your team owns outcomes, and you're leading at the right altitude.",
    minScore: 90,
    maxScore: 100,
  },
  {
    name: "Stretched Leader",
    emoji: "🎯",
    description: "You're leading well but still caught in the weeds. Your team needs more ownership, and your calendar needs real boundaries.",
    minScore: 70,
    maxScore: 89,
  },
  {
    name: "Overloaded Founder",
    emoji: "⚠️",
    description: "You're the bottleneck. Too many decisions, too many emails, not enough leverage. Time to build systems and delegate.",
    minScore: 50,
    maxScore: 69,
  },
  {
    name: "Firefighter Mode",
    emoji: "🔥",
    description: "You're drowning in execution. Your business is running you. You need structure, fast.",
    minScore: 30,
    maxScore: 49,
  },
  {
    name: "Crisis State",
    emoji: "🆘",
    description: "You're in survival mode. Every hour is reactive. This pace is unsustainable—urgent intervention needed.",
    minScore: 0,
    maxScore: 29,
  },
];

// Get stage based on score
export const getStageByScore = (score: number): LeaderStage => {
  // Ensure score is a valid number
  if (typeof score !== 'number' || isNaN(score)) {
    console.error('[getStageByScore] Invalid score:', score);
    return LEADER_STAGES[4]; // Return Crisis State for invalid scores
  }
  
  // Clamp score to valid range (0-100)
  const clampedScore = Math.max(0, Math.min(100, score));
  
  // Find matching stage
  const stage = LEADER_STAGES.find(
    (s) => clampedScore >= s.minScore && clampedScore <= s.maxScore
  );
  
  if (!stage) {
    console.error('[getStageByScore] No stage found for score:', clampedScore);
    // Fallback: return appropriate stage based on score
    return clampedScore >= 90 ? LEADER_STAGES[0] : LEADER_STAGES[4];
  }
  
  return stage;
};
