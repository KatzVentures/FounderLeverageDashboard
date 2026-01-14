/**
 * Email sanitization utilities for privacy-safe email content extraction
 */

/**
 * Personal email domains that indicate personal-life emails
 */
const PERSONAL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'icloud.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
];

/**
 * High-confidence personal-life signal patterns
 * These indicate personal, non-business emails with high confidence
 */
const PERSONAL_SIGNAL_PATTERNS = [
  // Family terms
  /\b(mom|dad|mother|father|parent|parents|kids|children|child|spouse|husband|wife|partner)\b/i,
  // Personal appointments
  /\b(my appointment|your appointment|reschedule my appointment|my doctor|my dentist)\b/i,
  // Personal-life logistics
  /\b(school pickup|birthday party|birthday celebration|family dinner|family gathering)\b/i,
];

/**
 * Reply header patterns to remove
 */
const REPLY_HEADER_PATTERNS = [
  /^On .+ wrote:.*$/m,
  /^From:.*$/m,
  /^Sent:.*$/m,
  /^To:.*$/m,
  /^Subject:.*$/m,
  /^Date:.*$/m,
  /^-\s*Original Message\s*-.*$/m,
];

/**
 * Check if an email domain is a personal domain
 */
export function isPersonalDomain(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  return domain ? PERSONAL_DOMAINS.includes(domain) : false;
}

/**
 * Check if text contains high-confidence personal-life signals
 */
export function containsHighConfidencePersonalSignals(text: string): boolean {
  const normalizedText = text.toLowerCase();
  return PERSONAL_SIGNAL_PATTERNS.some(pattern => pattern.test(normalizedText));
}

/**
 * Extract plain text from Gmail message payload
 * Handles both single-part and multi-part messages
 */
export function extractTextFromGmailPayload(payload: any): string {
  if (!payload) return '';

  // Single-part message
  if (payload.body?.data) {
    const mimeType = payload.mimeType?.toLowerCase() || '';
    if (mimeType === 'text/plain') {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    if (mimeType === 'text/html') {
      const html = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      return stripHtml(html);
    }
  }

  // Multi-part message - recursively search for text/plain or text/html
  if (payload.parts && Array.isArray(payload.parts)) {
    // First, try to find text/plain
    for (const part of payload.parts) {
      const mimeType = part.mimeType?.toLowerCase() || '';
      if (mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    // If no plain text, look for text/html
    for (const part of payload.parts) {
      const mimeType = part.mimeType?.toLowerCase() || '';
      if (mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        return stripHtml(html);
      }
    }
  }

  return '';
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  // Remove script and style tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Replace common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode numeric entities
  text = text.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  text = text.replace(/&#x([a-f\d]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return text;
}

/**
 * Sanitize email text by removing quoted replies, signatures, and normalizing
 */
export function sanitizeEmailText(raw: string): string {
  if (!raw) return '';

  let text = raw;

  // Remove reply headers
  REPLY_HEADER_PATTERNS.forEach(pattern => {
    text = text.replace(pattern, '');
  });

  // Remove quoted replies (lines starting with >)
  text = text.split('\n').filter(line => !line.trim().startsWith('>')).join('\n');

  // Remove signatures (split on "-- " or common separators)
  // Common patterns: "-- \n", "---\n", "--\n"
  const signatureMarkers = [
    /\n--\s*\n/,
    /\n---\n/,
    /\n--$/,
    /\nBest regards,?[\s\S]*$/i,
    /\nRegards,?[\s\S]*$/i,
    /\nSincerely,?[\s\S]*$/i,
    /\nThanks,?[\s\S]*$/i,
  ];

  signatureMarkers.forEach(pattern => {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      text = text.substring(0, match.index);
    }
  });

  // Normalize whitespace
  text = text.replace(/\r\n/g, '\n'); // Normalize line endings
  text = text.replace(/\r/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  text = text.replace(/[ \t]+/g, ' '); // Normalize spaces/tabs
  text = text.trim();

  // Truncate to 1200 characters
  if (text.length > 1200) {
    text = text.substring(0, 1200).trim();
    // Try to truncate at word boundary
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > 1000) {
      text = text.substring(0, lastSpace);
    }
  }

  return text;
}
