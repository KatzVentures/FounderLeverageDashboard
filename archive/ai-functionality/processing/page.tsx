'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { tokens } from '@/lib/design-tokens';

export default function ProcessingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'ANSWERS_ONLY' | 'DEEP_ANALYSIS' | null>(null);
  const MIN_DISPLAY_TIME = 5000; // Minimum 5 seconds

  // Determine mode from URL or session
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode');
    if (mode === 'answers_only') {
      setAnalysisMode('ANSWERS_ONLY');
    } else {
      setAnalysisMode('DEEP_ANALYSIS');
    }
  }, []);

  useEffect(() => {
    const pageStartTime = Date.now();
    
    const processData = async () => {
      try {
        const response = await fetch('/api/calculate', {
          method: 'POST',
        });

        // Check if response is ok before parsing JSON
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
        }

        if (data.ok) {
          // Store results in sessionStorage if provided (session cookie too large)
          console.log('Processing response received:', {
            hasResults: !!data.results,
            resultsKeys: data.results ? Object.keys(data.results) : [],
            score: data.results?.score,
            analysisMode: data.results?.meta?.analysisMode,
          });
          
          if (data.results) {
            try {
              const resultsJson = JSON.stringify(data.results);
              console.log('Storing results in sessionStorage, size:', resultsJson.length, 'bytes');
              sessionStorage.setItem('calculationResults', resultsJson);
              console.log('✅ Results stored in sessionStorage successfully');
            } catch (storageError) {
              console.error('❌ Error storing results in sessionStorage:', storageError);
            }
          } else {
            console.warn('⚠️ No results in response from /api/calculate');
          }
          
          // Mark processing as complete
          setProcessingComplete(true);
          
          // Calculate how long we've been on this page
          const elapsedTime = Date.now() - pageStartTime;
          const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);
          
          // Wait for minimum display time, then redirect
          setTimeout(() => {
            router.replace('/results');
          }, remainingTime);
        } else {
          // Error - show message
          setError(data.error || 'Failed to process data');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Processing error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setIsProcessing(false);
      }
    };

    processData();
  }, [router]);

  // Animate progress bar - always takes at least 5 seconds
  useEffect(() => {
    if (!isProcessing || error) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Animate over minimum 5 seconds (update every 50ms)
        const increment = (100 / MIN_DISPLAY_TIME) * 50; // Update every 50ms
        return Math.min(prev + increment, 100);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isProcessing, error]);

  const handleRetry = () => {
    setError(null);
    setIsProcessing(true);
    setProgress(0);
    router.refresh();
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/disconnect', {
        method: 'POST',
      });
      router.push('/ai-team');
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: tokens.colors.accent }}>
      {/* MAIN CONTENT */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl mx-auto text-center px-8 w-full"
      >
        {isProcessing && !error && (
          <>
            <h1
              className="text-white font-bold uppercase tracking-wide mb-8"
              style={{
                fontFamily: "'Anton', sans-serif",
                fontWeight: 'normal',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                lineHeight: 1.2,
                letterSpacing: '0.05em',
              }}
            >
              {analysisMode === 'ANSWERS_ONLY' 
                ? 'CALCULATING YOUR SCORE...' 
                : "AI SECRET AGENTS ARE COOKIN' ..."}
            </h1>
            <p
              className="text-white mb-12"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1.1rem',
                lineHeight: 1.6,
              }}
            >
              {analysisMode === 'ANSWERS_ONLY'
                ? 'Calculating your score from your assessment answers...'
                : 'Reviewing your calendar and email patterns...'}
            </p>

            {/* Progress Bar Container */}
            <div
              style={{
                width: '100%',
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              {/* White background bar */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: tokens.colors.white,
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                {/* Yellow progress fill */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                  style={{
                    height: '100%',
                    backgroundColor: tokens.colors.primary,
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          </>
        )}

        {error && (
          <>
            <h1
              className="text-white font-bold uppercase tracking-wide mb-4"
              style={{
                fontFamily: "'Anton', sans-serif",
                fontWeight: 'normal',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                lineHeight: 1.2,
                letterSpacing: '0.05em',
              }}
            >
              PROCESSING ERROR
            </h1>
            <p
              className="text-white mb-6"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1.1rem',
                lineHeight: 1.6,
              }}
            >
              {error}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleRetry}
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
                Retry
              </button>
              <button
                onClick={handleDisconnect}
                className="px-8 py-4 font-bold uppercase tracking-wide text-white hover:underline transition-opacity"
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '1rem',
                  letterSpacing: '0.15em',
                  border: `2px solid ${tokens.colors.white}`,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </motion.div>
    </main>
  );
}
