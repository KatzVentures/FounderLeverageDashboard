/**
 * Calendar utility functions for event processing and batching
 */

/**
 * Convert Google Calendar date/datetime to ISO string
 */
export function toIso(dateOrDateTime: { date?: string; dateTime?: string }): string {
  if (dateOrDateTime.dateTime) {
    return dateOrDateTime.dateTime;
  }
  if (dateOrDateTime.date) {
    // Convert date-only (YYYY-MM-DD) to ISO datetime at midnight UTC
    return `${dateOrDateTime.date}T00:00:00Z`;
  }
  return '';
}

/**
 * Check if event is all-day (has date but no dateTime)
 */
export function isAllDay(start: { date?: string; dateTime?: string }, end: { date?: string; dateTime?: string }): boolean {
  return !!(start.date && !start.dateTime && end.date && !end.dateTime);
}

/**
 * Compute duration in minutes between start and end
 * Returns 0 for all-day events, or actual duration in minutes
 */
export function computeDurationMinutes(
  start: { date?: string; dateTime?: string },
  end: { date?: string; dateTime?: string }
): number {
  const isAllDayEvent = isAllDay(start, end);
  
  if (isAllDayEvent) {
    // Return 0 for all-day events (or could return 1440 if preferred)
    return 0;
  }

  const startIso = toIso(start);
  const endIso = toIso(end);

  if (!startIso || !endIso) {
    return 0;
  }

  const startDate = new Date(startIso);
  const endDate = new Date(endIso);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60)); // Convert to minutes
}

/**
 * Truncate text to max characters
 */
export function truncate(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  
  // Try to truncate at word boundary
  const truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxChars * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Check if attendees include external domains (not matching user's domain)
 */
export function hasExternalAttendees(attendeeEmails: string[], userEmailDomain: string): boolean {
  if (attendeeEmails.length === 0) return false;
  
  return attendeeEmails.some(email => {
    const domain = email.toLowerCase().split('@')[1];
    return domain && domain !== userEmailDomain.toLowerCase();
  });
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  const parts = email.toLowerCase().split('@');
  return parts.length > 1 ? parts[1] : '';
}

/**
 * Check if event title contains personal-only signals
 */
export function containsPersonalSignals(title: string): boolean {
  if (!title) return false;
  
  const lowerTitle = title.toLowerCase();
  const personalPatterns = [
    /\bdentist\b/,
    /\btherapy\b/,
    /\bdoctor appointment\b/,
    /\bschool pickup\b/,
    /\bbirthday\b/,
  ];
  
  return personalPatterns.some(pattern => pattern.test(lowerTitle));
}
