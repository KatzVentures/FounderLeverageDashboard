import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getGoogleOAuthClient } from '@/lib/google-oauth';
import { google } from 'googleapis';
import {
  extractTextFromGmailPayload,
  sanitizeEmailText,
  containsHighConfidencePersonalSignals,
  isPersonalDomain,
} from '@/lib/email-sanitize';
import { EmailScope, DEFAULTS } from '@/lib/analysis-mode';

interface Snippet {
  messageId: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'UNKNOWN';
  timestampMs: number;
  text: string;
}

interface IncludedThread {
  threadId: string;
  subject: string;
  participants: string[];
  messageCount: number;
  snippets: Snippet[];
}

interface ExcludedThread {
  threadId: string;
  reason: 'PERSONAL_DOMAIN' | 'PERSONAL_SIGNALS' | 'EMPTY_SNIPPET' | 'OTHER';
}

interface GmailContentResponse {
  ok: boolean;
  error?: string;
  requiredScope?: string;
  windowDays?: number;
  maxThreads?: number;
  maxMessagesPerThread?: number;
  includedThreads?: IncludedThread[];
  excludedThreads?: ExcludedThread[];
}

// Retry helper with exponential backoff for rate limits
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error.code === 429 && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// Simple concurrency limiter
class ConcurrencyLimiter {
  private queue: Array<() => void> = [];
  private running = 0;

  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.running++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            next();
          }
        }
      };

      if (this.running < this.limit) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }
}

// Extract email from header value
function extractEmail(emailHeader: string | undefined): string | null {
  if (!emailHeader) return null;
  const match = emailHeader.match(/<?([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)>?/);
  return match ? match[1].toLowerCase() : null;
}

// Get all participants from headers
function getParticipants(messages: any[], userEmail: string): string[] {
  const participants = new Set<string>();
  
  for (const message of messages) {
    const headers = message.payload?.headers || [];
    const fromHeader = headers.find((h: any) => h.name === 'From')?.value;
    const toHeader = headers.find((h: any) => h.name === 'To')?.value;
    const ccHeader = headers.find((h: any) => h.name === 'Cc')?.value;

    const fromEmail = extractEmail(fromHeader);
    if (fromEmail && fromEmail !== userEmail) {
      participants.add(fromEmail);
    }

    [toHeader, ccHeader].forEach(header => {
      if (header) {
        const emails = header.split(',').map((e: string) => extractEmail(e.trim())).filter(Boolean);
        emails.forEach((email: string | null) => {
          if (email && email !== userEmail) {
            participants.add(email);
          }
        });
      }
    });
  }

  return Array.from(participants);
}

// Get subject from thread messages
function getSubject(messages: any[]): string {
  for (const message of messages) {
    const headers = message.payload?.headers || [];
    const subjectHeader = headers.find((h: any) => h.name === 'Subject');
    if (subjectHeader?.value) {
      return subjectHeader.value;
    }
  }
  return '(no subject)';
}

export async function GET(request: NextRequest) {
  try {
    // 1. Auth: Load session and validate googleTokens
    const session = await getSession();
    
    if (!session.googleTokens) {
      return NextResponse.json<GmailContentResponse>(
        { ok: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      );
    }

    // Get emailScope from query param or session
    const searchParams = request.nextUrl.searchParams;
    const emailScopeParam = searchParams.get('emailScope') as EmailScope | null;
    const emailScope = emailScopeParam || session.emailScope || DEFAULTS.emailScope;

    // Set up OAuth client with stored tokens
    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials(session.googleTokens);

    // Refresh token if needed
    if (session.googleTokens.expiry_date && session.googleTokens.expiry_date <= Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        session.googleTokens = credentials;
        await session.save();
        oauth2Client.setCredentials(credentials);
      } catch (refreshError: any) {
        return NextResponse.json<GmailContentResponse>(
          { ok: false, error: 'NOT_AUTHENTICATED' },
          { status: 401 }
        );
      }
    }

    // Get Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Verify scope by attempting to get profile
    try {
      await withRetry(() => gmail.users.getProfile({ userId: 'me' }));
    } catch (error: any) {
      if (error.code === 403) {
        return NextResponse.json<GmailContentResponse>(
          {
            ok: false,
            error: 'INSUFFICIENT_SCOPE',
            requiredScope: 'https://www.googleapis.com/auth/gmail.readonly',
          },
          { status: 403 }
        );
      }
      throw error;
    }

    // Get user's email address
    const profile = await withRetry(() => gmail.users.getProfile({ userId: 'me' }));
    const userEmail = profile.data.emailAddress?.toLowerCase();
    
    if (!userEmail) {
      return NextResponse.json<GmailContentResponse>(
        { ok: false, error: 'Could not retrieve user email address' },
        { status: 500 }
      );
    }

    // 2. Build search query based on emailScope
    let searchQuery: string;
    let maxThreads: number;
    let windowDays: number;

    if (emailScope === 'LABELED_TIME_ANALYZER') {
      // Query by label - no time restriction, but cap threads
      searchQuery = 'label:"time analyzer"';
      maxThreads = DEFAULTS.labeledThreadsCap;
      windowDays = DEFAULTS.labeledOptionalDaysCap; // For display purposes only
    } else {
      // ALL_14_DAYS - standard 14-day window
      searchQuery = `newer_than:${DEFAULTS.allEmailsWindowDays}d`;
      maxThreads = 200;
      windowDays = DEFAULTS.allEmailsWindowDays;
    }

    const MAX_MESSAGES_PER_THREAD = 3;
    
    let nextPageToken: string | undefined;
    const threadIds: string[] = [];

    // List threads with pagination
    do {
      const listResponse = await withRetry(() => 
        gmail.users.threads.list({
          userId: 'me',
          q: searchQuery,
          maxResults: 100,
          pageToken: nextPageToken,
        })
      );

      if (listResponse.data.threads) {
        threadIds.push(...listResponse.data.threads.map(t => t.id!));
      }

      nextPageToken = listResponse.data.nextPageToken || undefined;

      // Safety cap
      if (threadIds.length >= maxThreads) {
        threadIds.splice(maxThreads);
        break;
      }
    } while (nextPageToken);

    // 3. Process threads with concurrency limit
    const limiter = new ConcurrencyLimiter(4); // Process 4 threads at a time
    const includedThreads: IncludedThread[] = [];
    const excludedThreads: ExcludedThread[] = [];

    await Promise.all(
      threadIds.map(threadId =>
        limiter.run(async () => {
          try {
            const threadResponse = await withRetry(() =>
              gmail.users.threads.get({
                userId: 'me',
                id: threadId,
                format: 'full',
              })
            );

            const thread = threadResponse.data;
            const messages = thread.messages || [];
            
            if (messages.length === 0) {
              excludedThreads.push({ threadId, reason: 'EMPTY_SNIPPET' });
              return;
            }

            // Sort messages by timestamp and get newest 3
            const sortedMessages = [...messages].sort((a, b) => {
              const aTime = parseInt(a.internalDate || '0');
              const bTime = parseInt(b.internalDate || '0');
              return bTime - aTime; // Newest first
            });

            const newestMessages = sortedMessages.slice(0, MAX_MESSAGES_PER_THREAD);

            // Get participants and subject
            const participants = getParticipants(messages, userEmail);
            const subject = getSubject(messages);

            // Check for personal domain exclusion
            const hasPersonalDomain = participants.some(email => isPersonalDomain(email));
            if (hasPersonalDomain) {
              excludedThreads.push({ threadId, reason: 'PERSONAL_DOMAIN' });
              return;
            }

            // Extract and sanitize snippets
            const snippets: Snippet[] = [];
            let allSanitizedText = '';

            for (const message of newestMessages) {
              const headers = message.payload?.headers || [];
              const fromHeader = headers.find((h: any) => h.name === 'From')?.value;
              const fromEmail = extractEmail(fromHeader);
              const isFromUser = fromEmail === userEmail;

              const rawText = extractTextFromGmailPayload(message.payload);
              const sanitized = sanitizeEmailText(rawText);

              if (sanitized.trim().length === 0) {
                continue;
              }

              allSanitizedText += ' ' + sanitized;

              snippets.push({
                messageId: message.id || '',
                direction: isFromUser ? 'OUTBOUND' : 'INBOUND',
                timestampMs: parseInt(message.internalDate || '0'),
                text: sanitized,
              });
            }

            // Check for personal signals in subject or sanitized text
            const combinedText = (subject + ' ' + allSanitizedText).toLowerCase();
            if (containsHighConfidencePersonalSignals(combinedText)) {
              excludedThreads.push({ threadId, reason: 'PERSONAL_SIGNALS' });
              return;
            }

            // If no snippets after filtering, exclude
            if (snippets.length === 0) {
              excludedThreads.push({ threadId, reason: 'EMPTY_SNIPPET' });
              return;
            }

            // Include thread
            includedThreads.push({
              threadId,
              subject,
              participants,
              messageCount: messages.length,
              snippets,
            });
          } catch (error: any) {
            console.error(`Error processing thread ${threadId}:`, error.message);
            excludedThreads.push({ threadId, reason: 'OTHER' });
          }
        })
      )
    );

    // 4. Return response
    return NextResponse.json<GmailContentResponse>({
      ok: true,
      windowDays,
      maxThreads,
      maxMessagesPerThread: MAX_MESSAGES_PER_THREAD,
      includedThreads,
      excludedThreads,
    });
  } catch (error: any) {
    console.error('Gmail content fetch error:', error);
    return NextResponse.json<GmailContentResponse>(
      {
        ok: false,
        error: error.message || 'Failed to fetch Gmail content',
      },
      { status: error.code === 403 ? 403 : 500 }
    );
  }
}
