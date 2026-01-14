import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getGoogleOAuthClient } from '@/lib/google-oauth';
import { google } from 'googleapis';
import { EmailScope, DEFAULTS } from '@/lib/analysis-mode';

interface ThreadData {
  threadId: string;
  messageCount: number;
  participants: string[];
  userSentCount: number;
  userReceivedCount: number;
  firstTimestamp: number;
  lastTimestamp: number;
  lastMessageFromUser: boolean;
}

interface EmailMetrics {
  totalThreads: number;
  totalMessages: number;
  totalSentMessages: number;
  totalReceivedMessages: number;
  avgThreadLength: number;
  threadsAwaitingUserResponse: number;
  awaitingUserResponseOver24h: number;
  estimatedTimeSpentMinutes: number;
  threads: ThreadData[];
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
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// Extract email from header value (handles "Name <email@domain.com>" format)
function extractEmail(emailHeader: string | undefined): string | null {
  if (!emailHeader) return null;
  
  // Match email in angle brackets or standalone email
  const match = emailHeader.match(/<?([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)>?/);
  return match ? match[1].toLowerCase() : null;
}

// Get all participants from message headers
function getParticipants(message: any, userEmail: string): Set<string> {
  const participants = new Set<string>();
  
  const from = extractEmail(message.payload?.headers?.find((h: any) => h.name === 'From')?.value);
  const to = message.payload?.headers?.find((h: any) => h.name === 'To')?.value;
  const cc = message.payload?.headers?.find((h: any) => h.name === 'Cc')?.value;
  
  if (from && from !== userEmail) participants.add(from);
  
  // Parse To and Cc (can contain multiple emails)
  [to, cc].forEach(header => {
    if (header) {
      const emails = header.split(',').map((e: string) => extractEmail(e.trim())).filter(Boolean);
      emails.forEach((email: string | null) => {
        if (email && email !== userEmail) {
          participants.add(email);
        }
      });
    }
  });
  
  return participants;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Auth: Load session and validate googleTokens
    const session = await getSession();
    
    if (!session.googleTokens) {
      return NextResponse.json(
        { error: 'Authentication required. Please connect your Google account.' },
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
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json(
          { error: 'Session expired. Please reconnect your Google account.' },
          { status: 401 }
        );
      }
    }

    // Get Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get user's email address from profile
    const profile = await withRetry(() => gmail.users.getProfile({ userId: 'me' }));
    const userEmail = profile.data.emailAddress?.toLowerCase();
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Could not retrieve user email address' },
        { status: 500 }
      );
    }

    // 2. Build search query based on emailScope
    let searchQuery: string;
    let maxThreads: number;

    if (emailScope === 'LABELED_TIME_ANALYZER') {
      // Query by label - no time restriction, but cap threads
      searchQuery = 'label:"time analyzer"';
      maxThreads = DEFAULTS.labeledThreadsCap;
      
      // Optionally apply age cap if needed (180 days)
      // For now, we'll rely on thread count cap
    } else {
      // ALL_14_DAYS - standard 14-day window
      searchQuery = `newer_than:${DEFAULTS.allEmailsWindowDays}d`;
      maxThreads = 500; // Higher cap for recent emails
    }

    let pageCount = 0;
    let threadCount = 0;
    let messageCount = 0;
    let nextPageToken: string | undefined;
    const threadIds: string[] = [];

    // Paginate threads.list
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
        threadCount += listResponse.data.threads.length;
      }

      nextPageToken = listResponse.data.nextPageToken || undefined;
      pageCount++;

      // Safety cap
      if (threadCount >= maxThreads) {
        console.log(`Reached safety cap of ${maxThreads} threads`);
        threadIds.splice(maxThreads);
        break;
      }
    } while (nextPageToken);

    console.log(`Pages fetched: ${pageCount}`);
    console.log(`Threads fetched: ${threadIds.length}`);
    console.log(`Email scope: ${emailScope}`);

    // 3. For each thread: Fetch full thread and process messages
    const threads: ThreadData[] = [];
    const now = Date.now();
    
    for (const threadId of threadIds) {
      try {
        const threadResponse = await withRetry(() =>
          gmail.users.threads.get({
            userId: 'me',
            id: threadId,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Cc', 'Date'],
          })
        );

        const thread = threadResponse.data;
        const messages = thread.messages || [];
        
        if (messages.length === 0) continue;

        messageCount += messages.length;

        // Process thread metadata
        let userSentCount = 0;
        let userReceivedCount = 0;
        let firstTimestamp = Number.MAX_SAFE_INTEGER;
        let lastTimestamp = 0;
        let lastMessageFromUser = false;
        const allParticipants = new Set<string>();

        // Track the latest message to determine if last message is from user
        let latestMessageTimestamp = 0;
        let latestMessageFromUser = false;

        // Process each message
        for (const message of messages) {
          const headers = message.payload?.headers || [];
          const fromHeader = headers.find((h: any) => h.name === 'From')?.value;
          const dateHeader = headers.find((h: any) => h.name === 'Date')?.value;
          
          const fromEmail = extractEmail(fromHeader);
          const isFromUser = fromEmail === userEmail;

          if (isFromUser) {
            userSentCount++;
          } else {
            userReceivedCount++;
          }

          // Track participants
          const participants = getParticipants(message, userEmail);
          participants.forEach(p => allParticipants.add(p));

          // Track timestamps
          const internalDate = message.internalDate ? parseInt(message.internalDate) : 0;
          if (internalDate > 0) {
            firstTimestamp = Math.min(firstTimestamp, internalDate);
            
            // Track the latest message
            if (internalDate > latestMessageTimestamp) {
              latestMessageTimestamp = internalDate;
              latestMessageFromUser = isFromUser;
            }
            
            lastTimestamp = Math.max(lastTimestamp, internalDate);
          }
        }

        lastMessageFromUser = latestMessageFromUser;

        threads.push({
          threadId,
          messageCount: messages.length,
          participants: Array.from(allParticipants),
          userSentCount,
          userReceivedCount,
          firstTimestamp: firstTimestamp === Number.MAX_SAFE_INTEGER ? 0 : firstTimestamp,
          lastTimestamp,
          lastMessageFromUser,
        });
      } catch (error: any) {
        console.error(`Error processing thread ${threadId}:`, error.message);
        // Continue with next thread
        continue;
      }
    }

    console.log(`Messages processed: ${messageCount}`);

    // 4. Derived metrics
    const totalThreads = threads.length;
    const totalMessages = messageCount;
    const totalSentMessages = threads.reduce((sum, t) => sum + t.userSentCount, 0);
    const totalReceivedMessages = threads.reduce((sum, t) => sum + t.userReceivedCount, 0);
    const avgThreadLength = totalThreads > 0 ? totalMessages / totalThreads : 0;
    const threadsAwaitingUserResponse = threads.filter(t => !t.lastMessageFromUser).length;
    
    // Calculate awaitingUserResponseOver24h
    const awaitingUserResponseOver24h = threads.filter(t => {
      if (t.lastMessageFromUser) return false;
      const hoursSinceLastMessage = (now - t.lastTimestamp) / (1000 * 60 * 60);
      return hoursSinceLastMessage >= 24;
    }).length;

    const estimatedTimeSpentMinutes = totalSentMessages * 5;

    // 5. Return JSON matching the email metrics schema
    const metrics: EmailMetrics = {
      totalThreads,
      totalMessages,
      totalSentMessages,
      totalReceivedMessages,
      avgThreadLength: Math.round(avgThreadLength * 100) / 100,
      threadsAwaitingUserResponse,
      awaitingUserResponseOver24h,
      estimatedTimeSpentMinutes,
      threads,
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Gmail data fetch error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch Gmail data',
        details: error.code === 403 ? 'Gmail API access denied. Please re-authorize.' : undefined
      },
      { status: error.code === 403 ? 403 : 500 }
    );
  }
}
