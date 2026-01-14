/**
 * Analysis mode types and constants
 */

export type AnalysisMode = "ANSWERS_ONLY" | "DEEP_ANALYSIS";
export type EmailScope = "LABELED_TIME_ANALYZER" | "ALL_14_DAYS";

export const DEFAULTS = {
  analysisMode: "DEEP_ANALYSIS" as AnalysisMode,
  emailScope: "ALL_14_DAYS" as EmailScope,
  labeledThreadsCap: 300,
  labeledOptionalDaysCap: 180,
  allEmailsWindowDays: 14,
} as const;
