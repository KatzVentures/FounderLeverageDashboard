import { OAuth2Client } from 'google-auth-library';

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.APP_URL 
    ? `${process.env.APP_URL}/api/auth/callback`
    : 'http://localhost:3000/api/auth/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables');
  }

  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });
}

export function getAuthUrl(): string {
  const oauth2Client = getGoogleOAuthClient();
  
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
  });
}
