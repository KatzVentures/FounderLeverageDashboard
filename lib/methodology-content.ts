export interface ScoringComponent {
  name: string;
  weight: number; // percentage (0-100)
  description: string;
  dataSources: string[];
}

export interface ScoreRange {
  min: number;
  max: number;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export const scoringComponents: ScoringComponent[] = [
  {
    name: "Time Allocation",
    weight: 30,
    description: "Measures how effectively you allocate time between high-value strategic work and operational tasks. Higher scores indicate more time spent on work that drives growth.",
    dataSources: [
      "Your answers: Meeting time %, deep work blocks, strategic focus %",
      "From calendar: Hours in meetings per week, gaps between meetings",
      "Calculated: Meeting density as % of 40hr week, fragmentation score"
    ]
  },
  {
    name: "Delegation Quality",
    weight: 25,
    description: "Evaluates your ability to delegate effectively and build team capacity. Strong delegation frees you to focus on what only you can do.",
    dataSources: [
      "Your answers: Task ownership, revision frequency, process documentation",
      "From email: AI categorizes subjects + content to find human-delegatable work",
      "Calculated: % of emails that could be handled by VA/ops team"
    ]
  },
  {
    name: "Process Maturity",
    weight: 20,
    description: "Identifies repetitive manual work that should be automated entirely, not just delegated. Measures how much of your operational overhead could be eliminated with simple workflows.",
    dataSources: [
      "Your answers: Repetitive task frequency, manual data entry %, workflow automation",
      "From email: AI detects automatable patterns (recurring requests, status updates, data lookups)",
      "Calculated: Hours spent on repetitive work, automation ROI vs delegation cost"
    ]
  },
  {
    name: "Strategic Focus",
    weight: 15,
    description: "Assesses how well you protect time for high-value decisions versus coordination and status updates. Measures the ratio of strategic to operational work.",
    dataSources: [
      "Your answers: Strategic vs operational meeting mix, pending decisions",
      "From calendar: AI categorizes meeting titles + descriptions by type",
      "From email: Threads waiting on your response >24hrs"
    ]
  },
  {
    name: "Operating Rhythm",
    weight: 10,
    description: "Examines the systems and habits you have in place for managing priorities and maintaining sustainable work patterns. Measures consistency over time.",
    dataSources: [
      "Your answers: Weekly planning, reviews, recurring meetings, boundaries",
      "From calendar: Recurring events that actually happen vs get cancelled",
      "From email: Response time patterns, after-hours activity"
    ]
  }
];

export const scoreRanges: ScoreRange[] = [
  {
    min: 90,
    max: 100,
    name: "Elite Operator",
    emoji: "🚀",
    description: "You've built a machine. Your time is focused, your team owns outcomes, systems run without you, and you're leading at the right altitude.",
    color: "#4CAF50" // Green
  },
  {
    min: 70,
    max: 89,
    name: "Stretched Leader",
    emoji: "🎯",
    description: "You're leading well but still caught in the weeds. Your team needs more ownership, manual processes need automation, and your calendar needs real boundaries.",
    color: "#EDDF00" // Yellow
  },
  {
    min: 50,
    max: 69,
    name: "Overloaded Founder",
    emoji: "⚠️",
    description: "You're the bottleneck. Too many decisions, too many emails, too much manual work. Time to build systems, automate processes, and delegate.",
    color: "#FF9800" // Orange
  },
  {
    min: 0,
    max: 49,
    name: "Firefighter Mode",
    emoji: "🔥",
    description: "You're drowning in execution or in survival mode. Every hour is reactive, no systems exist. This pace is unsustainable—urgent intervention needed.",
    color: "#F44336" // Red
  }
];

export const methodologyHero = {
  headline: "HOW WE CALCULATE YOUR EFFICIENCY INDEX",
  headlinePart1: "HOW WE CALCULATE YOUR EFFICIENCY",
  headlinePart2: "INDEX",
  subheadline: "Our scoring system analyzes five key components of leadership effectiveness to give you an honest assessment of where your time and energy actually go—and which work should be automated vs delegated."
};

export const dataWeCollect = {
  title: "What Data We Access",
  items: [
    {
      source: "Gmail",
      what: "Email subjects, content, participants, timestamps",
      why: "To identify delegatable work, detect automatable patterns, and measure response bottlenecks"
    },
    {
      source: "Google Calendar",
      what: "Event titles, descriptions, attendees, duration, recurrence",
      why: "To measure meeting density and categorize strategic vs operational time"
    },
    {
      source: "Your Answers",
      what: "27 questions about your habits, processes, and time use",
      why: "To understand what we can't observe from email/calendar alone"
    }
  ]
};

export const privacyContent = {
  title: "PRIVACY FIRST",
  description: "We analyze email content and calendar events to categorize your work patterns. All data is processed in your browser session only—we never store your emails, calendar, or personal information. You can disconnect anytime."
};
