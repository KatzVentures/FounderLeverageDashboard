/**
 * Claude AI analyzer for email threads and calendar events
 * Handles batching, retries, and respects analysis mode + email scope
 */

import Anthropic from '@anthropic-ai/sdk';
import { AnalysisMode, EmailScope } from './analysis-mode';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Configuration constants
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;
const EMAIL_BATCH_SIZE = 10; // Conservative batch size for email threads
const CALENDAR_BATCH_SIZE = 20; // Larger batch size for calendar events (less token-heavy)
const MIN_CONFIDENCE_THRESHOLD = 0.7; // Conservative confidence threshold
const REQUEST_TIMEOUT_MS = 60000; // 60 second timeout

// Types
export interface EmailThread {
  threadId: string;
  subject: string;
  participants: string[];
  messageCount: number;
  snippets: Array<{
    messageId: string;
    direction: 'OUTBOUND' | 'INBOUND';
    timestampMs: number;
    text: string;
  }>;
}

export interface CalendarEvent {
  eventId: string;
  title: string;
  description: string;
  durationMinutes: number;
  attendeeCount: number;
  hasExternalAttendees: boolean;
  isRecurring: boolean;
}

export type EmailCategory = 
  | 'DELEGATABLE_OPERATIONAL'
  | 'STRATEGIC_INPUT'
  | 'TEAM_COORDINATION'
  | 'EXTERNAL_CRITICAL'
  | 'FIREFIGHTING'
  | 'PERSONAL_IGNORE';

export interface EmailAnalysisResult {
  threadId: string;
  category: EmailCategory | string; // Allow string for backward compatibility
  timeDrainType?: string;
  confidence: number;
  reasoning: string;
  suggestedAction?: string;
}

export interface CalendarAnalysisResult {
  eventId: string;
  category: string;
  meetingType?: string;
  isWasteful?: boolean;
  confidence: number;
  reasoning: string;
  suggestedAction?: string;
}

export interface AISolution {
  name: string; // Short, plain language name (e.g., "AI Email Triage")
  description: string; // Plain language explanation of what it does
  tools: string[]; // Specific tool names (e.g., ["Gmail AI", "Zapier"])
}

/**
 * Create prompt header with analysis mode and email scope context
 */
function createPromptHeader(analysisMode: AnalysisMode, emailScope?: EmailScope): string {
  let header = `=== ANALYSIS CONTEXT ===\n`;
  header += `Analysis Mode: ${analysisMode}\n`;
  
  if (analysisMode === 'DEEP_ANALYSIS' && emailScope) {
    header += `Email Scope: ${emailScope === 'LABELED_TIME_ANALYZER' 
      ? 'Labeled Emails (time analyzer label)' 
      : 'All Emails (last 14 days)'}\n`;
  }
  
  header += `\n`;
  header += `Please interpret the following data with this context in mind.\n`;
  header += `For ANSWERS_ONLY mode, focus on patterns from self-assessment only.\n`;
  header += `For DEEP_ANALYSIS mode, analyze actual email/calendar patterns.\n`;
  header += `=== END CONTEXT ===\n\n`;
  
  return header;
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BASE_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT_MS)
        ),
      ]);
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors (e.g., authentication, invalid API key)
      if (error.status === 401 || error.status === 403 || error.status === 400) {
        throw error;
      }
      
      // If last attempt, throw
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        MAX_DELAY_MS
      );
      
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Analyze a batch of email threads using Claude
 */
async function analyzeEmailBatch(
  threads: EmailThread[],
  analysisMode: AnalysisMode,
  emailScope?: EmailScope
): Promise<EmailAnalysisResult[]> {
  const header = createPromptHeader(analysisMode, emailScope);
  
  // Format threads for prompt
  const threadsJson = JSON.stringify(
    threads.map(t => ({
      threadId: t.threadId,
      subject: t.subject,
      participants: t.participants,
      messageCount: t.messageCount,
      snippetCount: t.snippets.length,
      snippets: t.snippets.map(s => ({
        direction: s.direction,
        timestamp: new Date(s.timestampMs).toISOString(),
        text: s.text.substring(0, 500), // Limit snippet length
      })),
    })),
    null,
    2
  );
  
  // System message with privacy rules
  const systemMessage = `You are analyzing sanitized business email snippets for a CEO time audit.

PRIVACY AND SAFETY RULES (highest priority):

- Your job is to categorize business work patterns, NOT personal life.
- If a thread appears to be about an individual's personal life (family, personal health, personal finances, personal appointments, personal travel), return:
    
    {"category":"PERSONAL_IGNORE","confidence":1.0,"reasoning":"Personal content detected"}
    
    and do NOT extract, quote, repeat, or summarize personal details.
    
- If you are uncertain whether something is personal, treat it as personal and return PERSONAL_IGNORE.
- Do not infer or speculate about sensitive traits (health, finances, relationships) beyond deciding PERSONAL_IGNORE.
- Output JSON only.

IMPORTANT CLARIFICATION:
- Industry terms (ex: "doctor", "patient", "insurance", "bank", "flight", "hotel") can be business.
- Only use PERSONAL_IGNORE when context indicates it is about someone's personal life rather than a business process.`;

  // User prompt with category structure
  const userPrompt = `${header}
Categorize each email thread.

Valid categories:
- DELEGATABLE_OPERATIONAL: Routine operational tasks that can be handled by team/VA (e.g., support requests, routine inquiries, standard processes)
- STRATEGIC_INPUT: Requires CEO-level strategic thinking or decisions (e.g., strategic planning, key partnerships, major decisions)
- TEAM_COORDINATION: Internal team coordination and communication (e.g., project updates, team syncs, workflow coordination)
- EXTERNAL_CRITICAL: Important external communications requiring CEO attention (e.g., key client communications, critical partnerships)
- FIREFIGHTING: Urgent/problem-solving emails that interrupt flow (e.g., escalations, urgent issues, crisis management)
- PERSONAL_IGNORE: Personal life emails (as defined in system message) - return this if uncertain about personal vs business

For each thread, also provide:
- Time Drain Type (optional): Identify specific inefficiency if applicable (e.g., "Status Update Loop", "Information Request Loop", "Coordination Back-and-forth", "Awaiting Response", "Recurring Question", "Manual Data Lookup", "N/A")
- Confidence score (0.0 to 1.0): Be conservative, only assign high confidence (≥0.8) when patterns are very clear
- Brief reasoning: Explain the categorization WITHOUT quoting snippet content
- Suggested action (optional): Provide a SPECIFIC, personalized action tailored to THIS business and THIS pattern (e.g., "Set up automated status dashboard to replace these weekly update emails", "Create self-service portal for vendor inquiries", "Delegate customer support escalations to ops team")

Rules:
- If it appears personal (as defined in system message), set category = PERSONAL_IGNORE.
- Provide brief reasoning WITHOUT quoting any snippet content.
- Make your analysis specific to the actual business context visible in the email subjects and content.

Return ONLY a valid JSON array with this structure:
[
  {
    "threadId": "string",
    "category": "DELEGATABLE_OPERATIONAL | STRATEGIC_INPUT | TEAM_COORDINATION | EXTERNAL_CRITICAL | FIREFIGHTING | PERSONAL_IGNORE",
    "timeDrainType": "string or null",
    "confidence": 0.0-1.0,
    "reasoning": "string",
    "suggestedAction": "string or null"
  }
]

THREADS:
${threadsJson}`;

  try {
    const response = await withRetry(async () => {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemMessage,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const text = content.text.trim();
    
    // Try to extract JSON from markdown code blocks if present
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const results: EmailAnalysisResult[] = JSON.parse(jsonText);
    
    // Validate and filter results by confidence threshold
    // IMPORTANT: Filter out PERSONAL_IGNORE threads - they should not be included in any calculations
    return results
      .filter(r => {
        // Always include PERSONAL_IGNORE if confidence is high enough, but we'll exclude them in scoring
        // Low confidence PERSONAL_IGNORE should be kept for safety (better safe than sorry)
        if (r.category === 'PERSONAL_IGNORE') {
          return r.confidence >= 0.7; // Higher threshold for personal detection
        }
        return r.confidence >= MIN_CONFIDENCE_THRESHOLD;
      })
      .map(r => ({
        ...r,
        // Ensure threadId matches input
        threadId: r.threadId || threads.find(t => !results.some(res => res.threadId === t.threadId))?.threadId || '',
      }));
  } catch (error: any) {
    console.error('Error analyzing email batch:', error);
    
    // Return empty results with low confidence for failed batch
    return threads.map(t => ({
      threadId: t.threadId,
      category: 'Unknown',
      confidence: 0.0,
      reasoning: `Analysis failed: ${error.message}`,
    }));
  }
}

/**
 * Analyze email threads with batching and retries
 */
export async function analyzeEmailThreads(
  threads: EmailThread[],
  analysisMode: AnalysisMode,
  emailScope?: EmailScope
): Promise<EmailAnalysisResult[]> {
  if (threads.length === 0) {
    return [];
  }

  console.log(`Analyzing ${threads.length} email threads in batches of ${EMAIL_BATCH_SIZE}...`);

  const results: EmailAnalysisResult[] = [];
  
  // Process in batches
  for (let i = 0; i < threads.length; i += EMAIL_BATCH_SIZE) {
    const batch = threads.slice(i, i + EMAIL_BATCH_SIZE);
    const batchNumber = Math.floor(i / EMAIL_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(threads.length / EMAIL_BATCH_SIZE);
    
    console.log(`Processing email batch ${batchNumber}/${totalBatches} (${batch.length} threads)...`);
    
    try {
      const batchResults = await analyzeEmailBatch(batch, analysisMode, emailScope);
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limiting
      if (i + EMAIL_BATCH_SIZE < threads.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`Error processing email batch ${batchNumber}:`, error);
      // Continue with next batch even if one fails
    }
  }

  console.log(`Completed analysis of ${results.length} email threads (${results.filter(r => r.confidence >= 0.8).length} high confidence)`);
  
  return results;
}

/**
 * Analyze a batch of calendar events using Claude
 */
async function analyzeCalendarBatch(
  events: CalendarEvent[],
  analysisMode: AnalysisMode
): Promise<CalendarAnalysisResult[]> {
  const header = createPromptHeader(analysisMode);
  
  // Format events for prompt
  const eventsJson = JSON.stringify(
    events.map(e => ({
      eventId: e.eventId,
      title: e.title,
      description: e.description.substring(0, 500), // Limit description length
      durationMinutes: e.durationMinutes,
      attendeeCount: e.attendeeCount,
      hasExternalAttendees: e.hasExternalAttendees,
      isRecurring: e.isRecurring,
    })),
    null,
    2
  );
  
  const prompt = `${header}
Analyze the following calendar events and categorize each one by:
1. Category - Be specific (e.g., "Weekly 1-on-1", "Daily Standup", "Client Check-in", "Project Planning", "Status Review", "All-hands", "Sales Call", "Other")
2. Meeting Type - Identify the purpose (e.g., "Status Update", "Decision Making", "Information Sharing", "Problem Solving", "Planning", "Check-in", "N/A")
3. Is Wasteful (boolean) - true if the meeting seems inefficient, unnecessary, could be replaced with async communication, or appears redundant
4. Confidence score (0.0 to 1.0) - be conservative, only assign high confidence (≥0.8) when patterns are very clear
5. Brief reasoning - Explain why this meeting is or isn't wasteful based on title, description, duration, and frequency
6. Suggested action - Provide a SPECIFIC, personalized action (e.g., "Replace this weekly status sync with async Slack updates", "Combine these two planning meetings into one", "Reduce from 60min to 30min and send agenda ahead", "Cancel and use email thread instead")

IMPORTANT: Base your analysis on the actual meeting titles, descriptions, and patterns you see. Be specific to what this business actually does.

For each event, identify:
- Whether this meeting represents a time drain based on ACTUAL context
- What SPECIFIC category of meeting this represents
- SPECIFIC suggestions for how this meeting could be improved, shortened, or eliminated

Return ONLY a valid JSON array with this structure:
[
  {
    "eventId": "string",
    "category": "string",
    "meetingType": "string or null",
    "isWasteful": boolean or null,
    "confidence": 0.0-1.0,
    "reasoning": "string",
    "suggestedAction": "string or null"
  }
]

Calendar events:
${eventsJson}`;

  try {
    const response = await withRetry(async () => {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const text = content.text.trim();
    
    // Try to extract JSON from markdown code blocks if present
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const results: CalendarAnalysisResult[] = JSON.parse(jsonText);
    
    // Validate and filter results by confidence threshold
    return results
      .filter(r => r.confidence >= MIN_CONFIDENCE_THRESHOLD)
      .map(r => ({
        ...r,
        // Ensure eventId matches input
        eventId: r.eventId || events.find(e => !results.some(res => res.eventId === e.eventId))?.eventId || '',
      }));
  } catch (error: any) {
    console.error('Error analyzing calendar batch:', error);
    
    // Return empty results with low confidence for failed batch
    return events.map(e => ({
      eventId: e.eventId,
      category: 'Unknown',
      confidence: 0.0,
      reasoning: `Analysis failed: ${error.message}`,
    }));
  }
}

/**
 * Analyze calendar events with batching and retries
 */
export async function analyzeCalendarEvents(
  events: CalendarEvent[],
  analysisMode: AnalysisMode
): Promise<CalendarAnalysisResult[]> {
  if (events.length === 0) {
    return [];
  }

  console.log(`Analyzing ${events.length} calendar events in batches of ${CALENDAR_BATCH_SIZE}...`);

  const results: CalendarAnalysisResult[] = [];
  
  // Process in batches
  for (let i = 0; i < events.length; i += CALENDAR_BATCH_SIZE) {
    const batch = events.slice(i, i + CALENDAR_BATCH_SIZE);
    const batchNumber = Math.floor(i / CALENDAR_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(events.length / CALENDAR_BATCH_SIZE);
    
    console.log(`Processing calendar batch ${batchNumber}/${totalBatches} (${batch.length} events)...`);
    
    try {
      const batchResults = await analyzeCalendarBatch(batch, analysisMode);
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limiting
      if (i + CALENDAR_BATCH_SIZE < events.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`Error processing calendar batch ${batchNumber}:`, error);
      // Continue with next batch even if one fails
    }
  }

  console.log(`Completed analysis of ${results.length} calendar events (${results.filter(r => r.confidence >= 0.8).length} high confidence)`);
  
  return results;
}

/**
 * Generate AI solutions by synthesizing patterns across email and calendar analyses
 * This function analyzes ALL factors: content patterns, counts, categories, meeting types, etc.
 */
export async function generateAISolutionsFromAnalysis(
  emailAnalyses: EmailAnalysisResult[],
  calendarAnalyses: CalendarAnalysisResult[],
  emailThreads: EmailThread[], // Need original threads to include subjects/snippets for context
  calendarEvents: CalendarEvent[], // Need original events to include titles/descriptions for context
  summaryMetrics: {
    emailCount: number;
    delegatableCount: number;
    automatableCount: number;
    meetingCount: number;
    weeklyMeetingHours: number;
  }
): Promise<AISolution[]> {
  if (emailAnalyses.length === 0 && calendarAnalyses.length === 0) {
    return [];
  }

  // Filter out PERSONAL_IGNORE emails
  const businessEmailAnalyses = emailAnalyses.filter(a => a.category !== 'PERSONAL_IGNORE');
  
  // Build summary of patterns for Claude
  const emailPatterns = businessEmailAnalyses.reduce((acc, analysis) => {
    const category = analysis.category || 'Other';
    acc.categories[category] = (acc.categories[category] || 0) + 1;
    
    if (analysis.timeDrainType) {
      acc.timeDrains[analysis.timeDrainType] = (acc.timeDrains[analysis.timeDrainType] || 0) + 1;
    }
    
    return acc;
  }, { categories: {} as Record<string, number>, timeDrains: {} as Record<string, number> });

  const calendarPatterns = calendarAnalyses.reduce((acc, analysis) => {
    const category = analysis.category || 'Other';
    acc.categories[category] = (acc.categories[category] || 0) + 1;
    
    if (analysis.isWasteful) {
      acc.wastefulCount++;
    }
    
    return acc;
  }, { categories: {} as Record<string, number>, wastefulCount: 0 });

  // Get representative email examples (top 10 by confidence, diverse categories)
  const representativeEmails = businessEmailAnalyses
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10)
    .map(analysis => {
      const thread = emailThreads.find(t => t.threadId === analysis.threadId);
      return {
        subject: thread?.subject || '',
        category: analysis.category,
        timeDrainType: analysis.timeDrainType || null,
        suggestedAction: analysis.suggestedAction || null,
        // Include first snippet for context (truncated)
        snippet: thread?.snippets?.[0]?.text?.substring(0, 200) || null,
      };
    });

  // Get representative calendar examples (top 10 by confidence, including wasteful ones)
  const representativeMeetings = calendarAnalyses
    .sort((a, b) => {
      // Prioritize wasteful meetings, then by confidence
      if (a.isWasteful && !b.isWasteful) return -1;
      if (!a.isWasteful && b.isWasteful) return 1;
      return b.confidence - a.confidence;
    })
    .slice(0, 10)
    .map(analysis => {
      const event = calendarEvents.find(e => e.eventId === analysis.eventId);
      return {
        title: event?.title || '',
        description: event?.description?.substring(0, 200) || null,
        duration: event?.durationMinutes || 0,
        attendees: event?.attendeeCount || 0,
        category: analysis.category,
        isWasteful: analysis.isWasteful || false,
        suggestedAction: analysis.suggestedAction || null,
      };
    });

  const prompt = `You are analyzing a CEO's email and calendar patterns to suggest 3 distinct AI-powered solutions.

ANALYSIS CONTEXT:
- Total emails analyzed: ${summaryMetrics.emailCount}
- Delegatable emails: ${summaryMetrics.delegatableCount}
- Automatable emails: ${summaryMetrics.automatableCount}
- Total meetings: ${summaryMetrics.meetingCount}
- Weekly meeting hours: ${summaryMetrics.weeklyMeetingHours}

EMAIL PATTERNS:
- Categories: ${JSON.stringify(emailPatterns.categories)}
- Time drain types: ${JSON.stringify(emailPatterns.timeDrains)}

CALENDAR PATTERNS:
- Meeting categories: ${JSON.stringify(calendarPatterns.categories)}
- Wasteful meetings: ${calendarPatterns.wastefulCount}

REPRESENTATIVE EMAIL EXAMPLES:
${JSON.stringify(representativeEmails, null, 2)}

REPRESENTATIVE MEETING EXAMPLES:
${JSON.stringify(representativeMeetings, null, 2)}

YOUR TASK:
Analyze ALL the patterns above - content (email subjects/snippets, meeting titles/descriptions), counts, categories, time drain types, meeting types, attendee patterns, etc. Synthesize this information to identify the 3 most impactful AI solutions.

Requirements:
1. Solutions must be TRUE AI-powered tools/features (not just "delegate" or generic "automate")
2. Solutions should be DISTINCT and COMPLEMENTARY (they can address similar problems but in different ways)
3. Base recommendations on ACTUAL CONTENT PATTERNS, not just counts
4. Each solution should have:
   - name: Short, plain language (e.g., "AI Email Triage", "Automated Status Dashboard")
   - description: Plain language explanation of what the AI does (1-2 sentences)
   - tools: Array of 2-4 specific tool names (e.g., ["Gmail AI", "Zapier", "n8n"])

Consider:
- What patterns emerge from the actual email/meeting content?
- What repetitive tasks could AI handle automatically?
- What coordination/communication overhead could AI reduce?
- What meeting patterns suggest opportunities for AI assistance?

Return ONLY a valid JSON array with exactly 3 solutions:
[
  {
    "name": "string",
    "description": "string",
    "tools": ["string", "string"]
  },
  ...
]`;

  try {
    const response = await withRetry(async () => {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const text = content.text.trim();
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const solutions: AISolution[] = JSON.parse(jsonText);
    
    // Validate we got exactly 3 solutions
    if (!Array.isArray(solutions) || solutions.length !== 3) {
      console.warn(`Expected 3 AI solutions, got ${solutions.length}`);
      return solutions.slice(0, 3); // Return up to 3
    }

    console.log(`Generated ${solutions.length} AI solutions from pattern analysis`);
    return solutions;
  } catch (error: any) {
    console.error('Error generating AI solutions:', error);
    return [];
  }
}
