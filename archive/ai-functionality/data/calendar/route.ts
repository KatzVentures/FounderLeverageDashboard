import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getGoogleOAuthClient } from '@/lib/google-oauth';
import { google } from 'googleapis';
import {
  toIso,
  isAllDay,
  computeDurationMinutes,
  truncate,
  hasExternalAttendees,
  extractDomain,
  containsPersonalSignals,
} from '@/lib/calendar-utils';

interface CalendarEvent {
  eventId: string;
  title: string;
  description: string;
  startIso: string;
  endIso: string;
  isAllDay: boolean;
  durationMinutes: number;
  organizerEmail: string | null;
  attendeeEmails: string[];
  attendeeCount: number;
  hasExternalAttendees: boolean;
  isRecurring: boolean;
  recurrence: string[];
}

interface ClaudeEvent {
  eventId: string;
  title: string;
  description: string;
  durationMinutes: number;
  attendeeCount: number;
  hasExternalAttendees: boolean;
  isRecurring: boolean;
}

interface ClaudeBatch {
  batchId: string;
  events: ClaudeEvent[];
}

interface CalendarResponse {
  ok: boolean;
  error?: string;
  windowDays?: number;
  totalEvents?: number;
  includedEvents?: number;
  excludedEvents?: number;
  events?: CalendarEvent[];
  claude?: {
    batchSize: number;
    batches: ClaudeBatch[];
  };
}

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

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session.googleTokens) {
      return NextResponse.json<CalendarResponse>(
        { ok: false, error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      );
    }

    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials(session.googleTokens);

    if (session.googleTokens.expiry_date && session.googleTokens.expiry_date <= Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        session.googleTokens = credentials;
        await session.save();
        oauth2Client.setCredentials(credentials);
      } catch (refreshError: any) {
        return NextResponse.json<CalendarResponse>(
          { ok: false, error: 'NOT_AUTHENTICATED' },
          { status: 401 }
        );
      }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await withRetry(() => gmail.users.getProfile({ userId: 'me' }));
    const userEmail = profile.data.emailAddress?.toLowerCase();
    
    if (!userEmail) {
      return NextResponse.json<CalendarResponse>(
        { ok: false, error: 'Could not retrieve user email address' },
        { status: 500 }
      );
    }

    const userEmailDomain = extractDomain(userEmail);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const timeMin = thirtyDaysAgo.toISOString();
    const timeMax = now.toISOString();

    const MAX_EVENTS = 500;
    const BATCH_SIZE = 40;
    const PAGE_SIZE = 250;

    let nextPageToken: string | undefined;
    const allEvents: any[] = [];
    let totalFetched = 0;

    do {
      const listResponse = await withRetry(() =>
        calendar.events.list({
          calendarId: 'primary',
          timeMin,
          timeMax,
          singleEvents: true,
          showDeleted: false,
          orderBy: 'startTime',
          maxResults: PAGE_SIZE,
          pageToken: nextPageToken,
        })
      );

      if (listResponse.data.items) {
        allEvents.push(...listResponse.data.items);
        totalFetched += listResponse.data.items.length;
      }

      nextPageToken = listResponse.data.nextPageToken || undefined;

      if (totalFetched >= MAX_EVENTS) {
        break;
      }
    } while (nextPageToken);

    const includedEvents: CalendarEvent[] = [];
    const excludedEvents: any[] = [];
    let excludedCount = 0;

    for (const event of allEvents) {
      if (event.status === 'cancelled') {
        excludedCount++;
        continue;
      }

      const title = event.summary || '';
      const description = event.description || '';
      const organizer = event.organizer;
      const attendees = event.attendees || [];
      const start = event.start || {};
      const end = event.end || {};
      const recurrence = event.recurrence || [];
      const recurringEventId = event.recurringEventId;

      const attendeeEmails = attendees
        .filter((a: any) => a.email && a.email.toLowerCase() !== userEmail)
        .map((a: any) => a.email.toLowerCase());

      const organizerEmail = organizer?.email?.toLowerCase() || null;
      const isSelfOrganizer = organizer?.self === true;

      let shouldExclude = false;
      let excludeReason = '';

      if (!title.trim() && attendeeEmails.length === 0 && !description.trim()) {
        shouldExclude = true;
        excludeReason = 'EMPTY';
      }

      if (!shouldExclude && attendeeEmails.length === 0 && isSelfOrganizer && containsPersonalSignals(title)) {
        shouldExclude = true;
        excludeReason = 'PERSONAL_SIGNALS';
      }

      // NEW: Exclude events with no attendees (only organizer) - these are calendar notes, not meetings
      if (!shouldExclude && attendeeEmails.length === 0 && isSelfOrganizer) {
        shouldExclude = true;
        excludeReason = 'NO_ATTENDEES';
      }

      if (shouldExclude) {
        excludedCount++;
        excludedEvents.push({ eventId: event.id, reason: excludeReason });
        continue;
      }

      const startIso = toIso(start);
      const endIso = toIso(end);
      const isAllDayEvent = isAllDay(start, end);
      const durationMinutes = computeDurationMinutes(start, end);

      includedEvents.push({
        eventId: event.id || '',
        title,
        description,
        startIso,
        endIso,
        isAllDay: isAllDayEvent,
        durationMinutes,
        organizerEmail,
        attendeeEmails,
        attendeeCount: attendeeEmails.length,
        hasExternalAttendees: hasExternalAttendees(attendeeEmails, userEmailDomain),
        isRecurring: !!recurringEventId || recurrence.length > 0,
        recurrence: recurrence.filter((r: string) => r.startsWith('RRULE:')).map((r: string) => r.replace(/^RRULE:/, '')),
      });
    }

    const batches: ClaudeBatch[] = [];
    for (let i = 0; i < includedEvents.length; i += BATCH_SIZE) {
      const batchEvents = includedEvents.slice(i, i + BATCH_SIZE);
      
      batches.push({
        batchId: `batch-${Math.floor(i / BATCH_SIZE) + 1}`,
        events: batchEvents.map(event => ({
          eventId: event.eventId,
          title: event.title,
          description: truncate(event.description, 1500),
          durationMinutes: event.durationMinutes,
          attendeeCount: event.attendeeCount,
          hasExternalAttendees: event.hasExternalAttendees,
          isRecurring: event.isRecurring,
        })),
      });
    }

    return NextResponse.json<CalendarResponse>({
      ok: true,
      windowDays: 30,
      totalEvents: allEvents.length,
      includedEvents: includedEvents.length,
      excludedEvents: excludedCount,
      events: includedEvents,
      claude: {
        batchSize: BATCH_SIZE,
        batches,
      },
    });
  } catch (error: any) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json<CalendarResponse>(
      {
        ok: false,
        error: error.message || 'Failed to fetch calendar events',
      },
      { status: error.code === 403 ? 403 : 500 }
    );
  }
}
