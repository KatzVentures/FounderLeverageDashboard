'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tokens } from '@/lib/design-tokens';

export default function ConnectPage() {
  const router = useRouter();

  const handleConnect = () => {
    router.push('/api/auth/google');
  };

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ backgroundColor: tokens.colors.accent }}>
      {/* NAV BAR */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 flex items-start justify-between px-8 w-full"
        style={{
          height: '77px',
          backgroundColor: tokens.colors.accent,
          color: tokens.colors.white,
          paddingTop: '16px',
        }}
      >
        <div className="flex items-center gap-3">
          <img 
            src="/__Icon-Yellow-Lines.png" 
            alt="Hidden Cost of You Logo" 
            className="h-8 w-auto"
          />
        </div>

        <div className="flex items-center gap-8">
          <Link
            href="/how-it-works"
            className="hover:underline text-white uppercase tracking-wide"
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontWeight: 'normal',
              letterSpacing: '0.15em',
            }}
          >
            How It Works
          </Link>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto text-center"
        >
          <h1
            className="text-white font-bold uppercase tracking-wide mb-6"
            style={{
              fontFamily: "'Anton', sans-serif",
              fontWeight: 'normal',
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              lineHeight: 1.2,
              letterSpacing: '0.05em',
            }}
          >
            TIME FOR OUR AI TEAM TO DO ITS MAGIC
          </h1>

          <div className="space-y-6 mb-8">
            <p
              className="text-white"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1.1rem',
                lineHeight: 1.6,
              }}
            >
              Connect your Gmail + Calendar
            </p>

            <div
              className="text-white bg-black bg-opacity-30 p-6"
              style={{
                border: `2px solid ${tokens.colors.primary}`,
              }}
            >
              <h2
                className="text-yellow-400 font-bold uppercase mb-4"
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '1rem',
                  letterSpacing: '0.1em',
                }}
              >
                YOUR DATA IS SAFE
              </h2>
              <ul
                className="text-left space-y-3"
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                }}
              >
                <li>✓ <strong>Read-only access:</strong> We can only view your emails and calendar events</li>
                <li>✓ <strong>No modifications:</strong> We cannot send emails, create events, or change anything</li>
                <li>✓ <strong>Secure storage:</strong> Your data is encrypted and stored securely</li>
                <li>✓ <strong>You're in control:</strong> You can disconnect at any time</li>
                <li>✓ <strong>One-time use:</strong> After generating your results, your connection is automatically removed</li>
              </ul>
            </div>

            <p
              className="text-white"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '0.95rem',
                fontStyle: 'italic',
                opacity: 0.9,
              }}
            >
              We use Google's secure OAuth system. You'll be redirected to Google to sign in and grant permissions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleConnect}
              className="px-8 py-4 font-bold uppercase tracking-wide text-black hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: tokens.colors.primary,
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1rem',
                letterSpacing: '0.15em',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Connect Gmail + Calendar
            </button>

            <Link
              href="/"
              className="px-8 py-4 font-bold uppercase tracking-wide text-white hover:underline transition-opacity"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1rem',
                letterSpacing: '0.15em',
                border: `2px solid ${tokens.colors.white}`,
                textDecoration: 'none',
              }}
            >
              Back to Assessment
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
