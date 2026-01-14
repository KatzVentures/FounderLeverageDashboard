'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { AnalysisMode, EmailScope } from '@/lib/analysis-mode';

export default function AITeamPage() {
  const router = useRouter();
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode | null>(null);
  const [emailScope, setEmailScope] = useState<EmailScope>('LABELED_TIME_ANALYZER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLabelTutorial, setShowLabelTutorial] = useState(false);
  const [hasLabeledEmails, setHasLabeledEmails] = useState(false);
  const [answersOnlyExpanded, setAnswersOnlyExpanded] = useState(false);
  const [deepAnalysisExpanded, setDeepAnalysisExpanded] = useState(false);

  const handleSubmit = async () => {
    console.log('[AI-TEAM] Submit clicked:', {
      analysisMode,
      emailScope,
      hasLabeledEmails,
    });
    
    // Require a mode to be selected
    if (!analysisMode) {
      alert('Please select an analysis mode before proceeding.');
      return;
    }
    
    // If ANSWERS_ONLY is selected, clear emailScope and proceed
    if (analysisMode === 'ANSWERS_ONLY') {
      console.log('[AI-TEAM] Answers only mode - clearing emailScope and proceeding');
      setIsSubmitting(true);
      
      try {
        const response = await fetch('/api/analysis-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysisMode: 'ANSWERS_ONLY',
            emailScope: undefined, // Explicitly clear emailScope for answers-only
          }),
        });

        const data = await response.json();

        if (!data.ok) {
          throw new Error(data.error || 'Failed to save analysis configuration');
        }

        router.push('/processing?mode=answers_only');
        return; // Exit early for answers-only flow
      } catch (error) {
        console.error('Error saving analysis config:', error);
        alert('Failed to save your selection. Please try again.');
        setIsSubmitting(false);
        return;
      }
    }
    
    // For DEEP_ANALYSIS mode, validate email scope is set
    if (analysisMode === 'DEEP_ANALYSIS') {
      if (!emailScope || (emailScope !== 'LABELED_TIME_ANALYZER' && emailScope !== 'ALL_14_DAYS')) {
        alert('Please select an email review option (Labeled Emails or All Emails) before proceeding.');
        return;
      }
    }
    
    // Validate labeled emails checkbox - must be checked if Labeled Emails option is selected
    if (analysisMode === 'DEEP_ANALYSIS' && emailScope === 'LABELED_TIME_ANALYZER' && !hasLabeledEmails) {
      alert('Please watch the tutorial and confirm you\'ve labeled your emails before proceeding.');
      setShowLabelTutorial(true);
      return;
    }

    setIsSubmitting(true);
    
    // For deep analysis, use the selected emailScope
    const finalAnalysisMode = 'DEEP_ANALYSIS'; // Should already be set, but ensure it
    const finalEmailScope = emailScope; // Use the selected emailScope
    
    console.log('[AI-TEAM] Submitting with:', {
      finalAnalysisMode,
      finalEmailScope,
    });
    
    try {
      const response = await fetch('/api/analysis-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisMode: finalAnalysisMode,
          emailScope: finalEmailScope,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to save analysis configuration');
      }

      console.log('[AI-TEAM] Config saved, redirecting...', {
        finalAnalysisMode,
        willGoToAuth: finalAnalysisMode === 'DEEP_ANALYSIS',
      });

      // Redirect based on mode
      // Both email flows (labeled and all emails) require OAuth, so both go to /api/auth/google
      if (finalAnalysisMode === 'ANSWERS_ONLY') {
        router.push('/processing?mode=answers_only');
      } else {
        // Deep analysis (including both labeled and all emails) requires OAuth
        router.push('/api/auth/google');
      }
    } catch (error) {
      console.error('Error saving analysis config:', error);
      alert('Failed to save your selection. Please try again.');
      setIsSubmitting(false);
    }
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
          className="max-w-3xl mx-auto w-full"
        >
          <h1
            className="text-white font-bold uppercase tracking-wide mb-8 text-center"
            style={{
              fontFamily: "'Anton', sans-serif",
              fontWeight: 'normal',
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              lineHeight: 1.2,
              letterSpacing: '0.05em',
            }}
          >
            TIME FOR OUR AI TEAM TO WORK ITS MAGIC
          </h1>

          {/* Analysis Mode Selection */}
          <div className="space-y-6 mb-8">
            <div
              className="text-white bg-black bg-opacity-30 p-6"
              style={{
                border: `2px solid ${tokens.colors.primary}`,
              }}
            >
              <h2
                className="text-yellow-400 font-bold uppercase mb-6"
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '1.25rem',
                  letterSpacing: '0.1em',
                }}
              >
                Choose Your Analysis Mode
              </h2>

              {/* Answers Only Option - Accordion */}
              <div className="mb-6" style={{ border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px' }}>
                <div
                  className="flex items-center gap-4 cursor-pointer p-4"
                  onClick={() => {
                    setAnswersOnlyExpanded(!answersOnlyExpanded);
                    if (!answersOnlyExpanded) {
                      setAnalysisMode('ANSWERS_ONLY');
                      setEmailScope('ALL_14_DAYS'); // Reset to default (will be cleared on submit)
                      setDeepAnalysisExpanded(false);
                    }
                  }}
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    backgroundColor: answersOnlyExpanded ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="analysisMode"
                    value="ANSWERS_ONLY"
                    checked={analysisMode === 'ANSWERS_ONLY'}
                    onChange={(e) => {
                      setAnalysisMode('ANSWERS_ONLY');
                      setEmailScope('ALL_14_DAYS'); // Reset to default (will be cleared on submit)
                      setAnswersOnlyExpanded(true);
                      setDeepAnalysisExpanded(false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '20px',
                      height: '20px',
                      marginTop: '2px',
                      cursor: 'pointer',
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-bold text-lg mb-1">My Answers Only</div>
                    <div
                      className="text-sm opacity-90"
                      style={{ lineHeight: '1.5' }}
                    >
                      No Gmail or Calendar analysis. Results are based only on your assessment answers.
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '1.2rem',
                      color: tokens.colors.primary,
                      transform: answersOnlyExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    ›
                  </div>
                </div>
                
                {answersOnlyExpanded && (
                  <div className="p-4 pt-0" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div
                      className="text-sm"
                      style={{
                        backgroundColor: 'rgba(255, 0, 0, 0.2)',
                        padding: '12px',
                        borderLeft: '3px solid #ff4444',
                        lineHeight: '1.5',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <strong>⚠️ What you'll miss:</strong>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>Top 3 AI Solutions personalized to your email/calendar patterns</li>
                        <li>Email load analysis (delegatable/automatable emails)</li>
                        <li>Meeting cost breakdown from your actual calendar</li>
                        <li>Response lag metrics from real email data</li>
                        <li>Automation opportunity analysis</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Deep Analysis Option - Accordion */}
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px', marginBottom: '20px' }}>
                <div
                  className="flex items-center gap-4 cursor-pointer p-4"
                  onClick={() => {
                    setDeepAnalysisExpanded(!deepAnalysisExpanded);
                    if (!deepAnalysisExpanded) {
                      setAnalysisMode('DEEP_ANALYSIS');
                      setAnswersOnlyExpanded(false);
                    }
                  }}
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    backgroundColor: deepAnalysisExpanded ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="analysisMode"
                    value="DEEP_ANALYSIS"
                    checked={analysisMode === 'DEEP_ANALYSIS'}
                    onChange={(e) => {
                      setAnalysisMode(e.target.value as AnalysisMode);
                      setDeepAnalysisExpanded(true);
                      setAnswersOnlyExpanded(false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '20px',
                      height: '20px',
                      marginTop: '2px',
                      cursor: 'pointer',
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-bold text-lg mb-1">Deep Analysis (Recommended)</div>
                    <div
                      className="text-sm opacity-90"
                      style={{ lineHeight: '1.5' }}
                    >
                      Complete analysis using your Gmail + Calendar data. Get personalized AI solutions and detailed insights.
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '1.2rem',
                      color: tokens.colors.primary,
                      transform: deepAnalysisExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    ›
                  </div>
                </div>

                {deepAnalysisExpanded && (
                  <div className="p-4 pt-0" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {/* Email Scope Selection - Always visible when Deep Analysis is expanded */}
                    <div
                      className="mt-4 p-4"
                      style={{
                        backgroundColor: 'rgba(237, 223, 0, 0.1)',
                        borderLeft: '3px solid #EDDF00',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="font-semibold mb-3 text-sm uppercase tracking-wide">
                        Emails to review:
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="emailScope"
                            value="LABELED_TIME_ANALYZER"
                            checked={emailScope === 'LABELED_TIME_ANALYZER'}
                            onChange={(e) => {
                              setEmailScope(e.target.value as EmailScope);
                              // Ensure analysisMode is DEEP_ANALYSIS when email scope is selected
                              setAnalysisMode('DEEP_ANALYSIS');
                              setShowLabelTutorial(true);
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              marginTop: '2px',
                              cursor: 'pointer',
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-sm mb-1">Labeled Emails (Recommended)</div>
                            <div className="text-xs opacity-90" style={{ lineHeight: '1.4' }}>
                              We'll only analyze emails you label 'time analyzer'. This can include older emails beyond 14 days.
                            </div>
                            {/* Tutorial button and checkbox - nested under Labeled Emails */}
                            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setShowLabelTutorial(true)}
                                style={{
                                  marginBottom: '8px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  backgroundColor: 'rgba(237, 223, 0, 0.2)',
                                  color: tokens.colors.primary,
                                  border: `1px solid ${tokens.colors.primary}`,
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontFamily: 'Arial, Helvetica, sans-serif',
                                  display: 'block',
                                }}
                              >
                                📹 Watch Tutorial: How to Label Emails
                              </button>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={hasLabeledEmails}
                                  onChange={(e) => setHasLabeledEmails(e.target.checked)}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    cursor: 'pointer',
                                  }}
                                />
                                <span className="text-xs opacity-90" style={{ lineHeight: '1.4' }}>
                                  I've labeled my emails in Gmail
                                </span>
                              </label>
                            </div>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="emailScope"
                            value="ALL_14_DAYS"
                            checked={emailScope === 'ALL_14_DAYS'}
                            onChange={(e) => {
                              setEmailScope(e.target.value as EmailScope);
                              // Ensure analysisMode is DEEP_ANALYSIS when email scope is selected
                              setAnalysisMode('DEEP_ANALYSIS');
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              marginTop: '2px',
                              cursor: 'pointer',
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-sm mb-1">All Emails (Last 14 Days)</div>
                            <div className="text-xs opacity-90" style={{ lineHeight: '1.4' }}>
                              We'll analyze all emails from the last 14 days.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Data Privacy Notice - Always visible, no accordion */}
                    <div
                      className="mt-4 p-4"
                      style={{
                        backgroundColor: 'rgba(0, 255, 0, 0.1)',
                        borderLeft: '3px solid #4CAF50',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="font-semibold mb-2 text-sm">✓ Your Data Is Safe</div>
                      <ul className="text-xs space-y-1 opacity-90" style={{ lineHeight: '1.5' }}>
                        <li>• Read-only access - we can only view, never modify</li>
                        <li>• Encrypted and secure storage</li>
                        <li>• You can disconnect at any time</li>
                        <li>• One-time use for generating your results</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-4 font-bold uppercase tracking-wide text-black hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: tokens.colors.primary,
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1rem',
                letterSpacing: '0.15em',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting
                ? 'Processing...'
                : analysisMode === 'ANSWERS_ONLY'
                ? 'See My Results'
                : analysisMode === 'DEEP_ANALYSIS'
                ? 'Run Deep Analysis'
                : 'Select an Option'}
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

      {/* Label Tutorial Modal */}
      {showLabelTutorial && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowLabelTutorial(false)}
        >
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: `2px solid ${tokens.colors.primary}`,
              borderRadius: '8px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowLabelTutorial(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '32px',
                height: '32px',
                backgroundColor: 'transparent',
                border: `2px solid ${tokens.colors.white}`,
                borderRadius: '50%',
                color: tokens.colors.white,
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              ×
            </button>

            <div style={{ padding: '30px' }}>
              <h2
                style={{
                  fontFamily: "'Anton', sans-serif",
                  fontSize: '1.5rem',
                  color: tokens.colors.white,
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                How to Label Emails in Gmail
              </h2>

              <p
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '0.9rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '20px',
                  textAlign: 'center',
                  lineHeight: '1.6',
                }}
              >
                Label the emails you want us to analyze with the label <strong style={{ color: tokens.colors.primary }}>"time analyzer"</strong>
              </p>

              {/* YouTube Video Embed */}
              <div
                style={{
                  position: 'relative',
                  paddingBottom: '56.25%', // 16:9 aspect ratio
                  height: 0,
                  overflow: 'hidden',
                  marginBottom: '20px',
                }}
              >
                <iframe
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  src="https://www.youtube.com/embed/ya77Bho1itU"
                  title="How to Label Emails in Gmail"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Instructions */}
              <div
                style={{
                  backgroundColor: 'rgba(237, 223, 0, 0.1)',
                  borderLeft: `3px solid ${tokens.colors.primary}`,
                  padding: '15px',
                  marginTop: '20px',
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Anton', sans-serif",
                    fontSize: '1rem',
                    color: tokens.colors.primary,
                    marginBottom: '10px',
                  }}
                >
                  Quick Steps:
                </h3>
                <ol
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: '1.8',
                    paddingLeft: '20px',
                  }}
                >
                  <li>Open Gmail in a new tab</li>
                  <li>Select the emails you want to analyze</li>
                  <li>Click the Label icon (or use keyboard shortcut: l)</li>
                  <li>Create a new label called <strong style={{ color: tokens.colors.primary }}>"time analyzer"</strong></li>
                  <li>Apply the label to your selected emails</li>
                  <li>Return here and check the confirmation box</li>
                </ol>
              </div>

            </div>
          </div>
        </div>
      )}
    </main>
  );
}
