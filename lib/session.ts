import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  assessmentAnswers?: any;
  results?: any;
  views?: number;
}

export const sessionOptions = {
  password: process.env.SESSION_PASSWORD || (() => {
    throw new Error('SESSION_PASSWORD environment variable is not set');
  })(),
  cookieName: 'founder_leverage_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    httpOnly: true,
    path: '/',
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return await getIronSession<SessionData>(cookieStore, sessionOptions);
}
