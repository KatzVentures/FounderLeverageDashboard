'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState, useMemo } from 'react';
import { tokens } from '../../lib/design-tokens';
import { mockResults } from '../../lib/mock-results';
import { calculateEmailCost, calculateMeetingCost, calculateAITimeback } from '../../lib/calculation-formulas';
import { generateResults } from '../../lib/scoring';

export default function ResultsPage() {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [actualResults, setActualResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load results from session
  useEffect(() => {
    const loadResults = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/session-test');
        const data = await response.json();
        
        console.log('Session data loaded:', {
          hasResults: !!data.results,
        });
        
        // Get results from session if available
        if (data.results) {
          console.log('Loading results from session:', {
            hasResults: !!data.results,
            score: data.results?.score,
            resultsKeys: Object.keys(data.results || {}),
          });
          setActualResults(data.results);
        } else if (typeof window !== 'undefined') {
          // Try loading from sessionStorage (results too large for cookie)
          try {
            const storedResults = sessionStorage.getItem('calculationResults');
            console.log('Checking sessionStorage for results:', {
              hasStoredResults: !!storedResults,
              storedSize: storedResults ? storedResults.length : 0,
            });
            
            if (storedResults) {
              const parsedResults = JSON.parse(storedResults);
              console.log('✅ Loading results from sessionStorage:', {
                hasResults: !!parsedResults,
                score: parsedResults?.score,
                resultsKeys: Object.keys(parsedResults || {}),
              });
              setActualResults(parsedResults);
            } else {
              console.warn('⚠️ No results in sessionStorage');
            }
          } catch (storageError) {
            console.error('Error loading from sessionStorage:', storageError);
          }
        }
      } catch (error) {
        console.error('Error loading results:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadResults();
  }, []);
  
  // Use actual results if available, otherwise fall back to mockResults
  // IMPORTANT: Only use mockResults if we have NO actualResults at all (not even from sessionStorage)
  let results = actualResults || mockResults;
  
  // Log which results source we're using
  console.log('[RESULTS SOURCE] Using:', {
    hasActualResults: !!actualResults,
    actualResultsScore: actualResults?.score,
    hasMockResults: !!mockResults,
    mockResultsScore: mockResults?.score,
    finalResultsScore: results?.score,
  });
  
  // Remove any stored stage property - we always calculate from score
  if (results && 'stage' in results) {
    console.log('[STAGE FIX] Removing stored stage property:', results.stage);
    delete results.stage;
  }
  
  // Get score for stage calculation (extract once to avoid dependency issues)
  // Ensure score is a number - convert if needed
  const score = typeof results?.score === 'number' ? results.score : 
                typeof results?.score === 'string' ? parseFloat(results.score) : 
                null;
  
  // ALWAYS calculate stage from score - calculate directly, not in useMemo
  // This ensures we always get the correct stage based on current score
  const calculateStage = () => {
    console.log('[STAGE DEBUG] ===== STAGE CALCULATION START =====');
    console.log('[STAGE DEBUG] Raw results.score:', results?.score);
    console.log('[STAGE DEBUG] Extracted score:', score);
    console.log('[STAGE DEBUG] Score type:', typeof score);
    console.log('[STAGE DEBUG] Is NaN?', isNaN(score as number));
    
    if (typeof score === 'number' && !isNaN(score)) {
      const { getStageByScore } = require('../../lib/stages');
      const calculatedStage = getStageByScore(score);
      console.log('[STAGE DEBUG] Calculated stage:', calculatedStage);
      console.log('[STAGE DEBUG] Stage name:', calculatedStage.name);
      console.log('[STAGE DEBUG] Stage emoji:', calculatedStage.emoji);
      console.log('[STAGE DEBUG] ===== STAGE CALCULATION END =====');
      return calculatedStage;
    }
    
    console.error('[STAGE DEBUG] ERROR: Invalid score!', score);
    console.log('[STAGE DEBUG] ===== STAGE CALCULATION END (ERROR) =====');
    return { name: 'Crisis State', emoji: '🆘', description: 'Unable to calculate stage', minScore: 0, maxScore: 29 };
  };
  
  const stage = calculateStage();
  
  // Always ANSWERS_ONLY mode for self-assessment
  const isDeepAnalysis = false;
  
  // Only populate missing fields if we're using mockResults (no actualResults)
  // If we have actualResults, use it as-is even if fields are missing/zero
  if (!actualResults) {
    // Only apply fallbacks if we're using mockResults
    if (!results.timeBreakdown || !Array.isArray(results.timeBreakdown) || results.timeBreakdown.length === 0) {
      console.log('[FALLBACK] No actualResults - using mock timeBreakdown');
      results.timeBreakdown = mockResults.timeBreakdown ? [...mockResults.timeBreakdown] : [];
    }
    
    if (isDeepAnalysis) {
      console.log('Deep analysis with mockResults - populating required fields');
      if (!results.aiOpportunities || !Array.isArray(results.aiOpportunities) || results.aiOpportunities.length === 0) {
        results.aiOpportunities = mockResults.aiOpportunities || [];
      }
      if (!results.emailLoad || !results.emailLoad.count) {
        results.emailLoad = { ...mockResults.emailLoad };
      }
      if (!results.meetingCost || !results.meetingCost.count) {
        results.meetingCost = { ...mockResults.meetingCost };
      }
      if (!results.responseLag) {
        results.responseLag = { ...mockResults.responseLag };
      }
      if (!results.timeLeak || !results.timeLeak.description) {
        results.timeLeak = { ...mockResults.timeLeak };
      }
      if (!results.timeCategories || !Array.isArray(results.timeCategories) || results.timeCategories.length === 0) {
        results.timeCategories = mockResults.timeCategories || [];
      }
    }
  } else {
    // We have actualResults - use them as-is, don't replace with mock data
    console.log('Using actualResults - no mock data fallbacks applied');
    // Only ensure basic structure exists (empty arrays/objects if missing)
    if (!results.timeBreakdown) results.timeBreakdown = [];
    if (!results.timeCategories) results.timeCategories = [];
    if (isDeepAnalysis) {
      if (!results.aiOpportunities) results.aiOpportunities = [];
      if (!results.emailLoad) results.emailLoad = { count: 0, hours: 0, delegatableCount: 0, automatableCount: 0 };
      if (!results.meetingCost) results.meetingCost = { amount: 0, count: 0, weeklyHours: 0 };
      if (!results.responseLag) results.responseLag = { pending: 0, avgHours: 0 };
      if (!results.timeLeak) results.timeLeak = { totalHoursWasted: 0, weeklyValue: 0, monthlyValue: 0, topLeak: '', description: '' };
    }
    // Ensure score exists (stage is now calculated via useMemo/useEffect above)
    if (typeof results.score !== 'number') {
      console.warn('Score missing from actualResults');
    }
    
    console.log('Deep analysis data check complete:', {
      hasAiOpportunities: !!(results.aiOpportunities && results.aiOpportunities.length > 0),
      aiOpportunitiesCount: results.aiOpportunities?.length || 0,
      aiOpportunitiesType: typeof results.aiOpportunities,
      aiOpportunitiesIsArray: Array.isArray(results.aiOpportunities),
      aiOpportunitiesSample: results.aiOpportunities?.slice(0, 2).map((o: any) => ({ id: o?.id, title: o?.title })) || [],
      hasEmailLoad: !!results.emailLoad,
      emailLoad: results.emailLoad,
      hasMeetingCost: !!results.meetingCost,
      meetingCost: results.meetingCost,
      hasResponseLag: !!results.responseLag,
      responseLag: results.responseLag,
      hasTimeLeak: !!results.timeLeak,
      timeLeak: results.timeLeak,
      hasTimeBreakdown: !!(results.timeBreakdown && results.timeBreakdown.length > 0),
      hasTimeCategories: !!(results.timeCategories && results.timeCategories.length > 0),
      hasScore: typeof results.score === 'number',
      hasStage: true, // Always calculated from score
    });
  }
  
  const barChartRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const barChartInView = useInView(barChartRef, { once: true, amount: 0.3 });
  const cardsInView = useInView(cardsRef, { once: true, amount: 0.3 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animate score from 0 to final score over 2 seconds
  // IMPORTANT: This must depend on actualResults?.score so it re-runs when results change
  useEffect(() => {
    if (!mounted) return;
    
    // Get the current score from actualResults or mockResults
    const currentScore = actualResults?.score ?? mockResults?.score;
    
    if (typeof currentScore !== 'number' || isNaN(currentScore)) {
      console.warn('[SCORE ANIMATION] No valid score found, actualResults:', actualResults?.score, 'mockResults:', mockResults?.score);
      return;
    }
    
    const duration = 2000; // 2 seconds
    const startTime = Date.now();
    const startValue = 0;
    const endValue = currentScore;
    
    console.log('[SCORE ANIMATION] Starting animation to score:', endValue, 'actualResults.score:', actualResults?.score, 'mockResults.score:', mockResults?.score);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easeOut easing
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (endValue - startValue) * eased);
      
      setAnimatedScore(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at the target value
        setAnimatedScore(endValue);
        console.log('[SCORE ANIMATION] Animation complete, final score:', endValue);
      }
    };

    // Reset to 0 first, then animate
    setAnimatedScore(0);
    animate();
  }, [mounted, actualResults?.score]);

  // Calculate pie chart paths for time categories
  const radius = 80;
  const center = 100;
  
  const createPieSlice = (startAngle: number, endAngle: number) => {
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Build pie chart segments for time categories
  const timeCategories = results.timeCategories || [];
  let currentAngle = -Math.PI / 2; // Start at top
  const pieSegments = timeCategories.map((item: { category: string; percentage: number; color: string }) => {
    const percentage = item.percentage / 100;
    const segmentAngle = 2 * Math.PI * percentage;
    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentAngle;
    const path = createPieSlice(startAngle, endAngle);
    currentAngle = endAngle;
    return { ...item, path, startAngle, endAngle };
  });

  // Calculate costs using formulas (use results data)
  const emailCost = calculateEmailCost(
    results.emailLoad?.delegatableCount || 0,
    results.emailLoad?.count || 0
  );
  
  const meetingCost = calculateMeetingCost(
    results.meetingCost?.count || 0,
    results.meetingCost?.weeklyHours || 0
  );
  
  const aiTimeback = calculateAITimeback(
    { delegatableCount: results.emailLoad?.delegatableCount || 0 },
    { weeklyCount: results.meetingCost?.count || 0 },
    { pendingCount: results.responseLag?.pending || 0 },
    { automatableCount: results.emailLoad?.automatableCount || 0 }
  );

  // Round hours to whole numbers for display
  const emailHoursDisplay = Math.round(emailCost.hours);
  const meetingActualHoursDisplay = Math.round(meetingCost.actualHours);
  const meetingTrueHoursDisplay = Math.round(meetingCost.trueHours);
  const aiTimebackHoursDisplay = Math.round(aiTimeback.hours);

  // Show loading state while fetching results
  if (isLoading) {
    return (
      <div style={{ 
        padding: '20px', 
        color: 'white', 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000'
      }}>
        Loading results...
      </div>
    );
  }

  // Debug: Check if data is loaded
  if (!results) {
    return (
      <div style={{ 
        padding: '20px', 
        color: 'white', 
        backgroundColor: '#000000',
        minHeight: '100vh'
      }}>
        No data available. Please complete the assessment first.
      </div>
    );
  }
  

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#000000', color: '#FFFFFF', paddingTop: '77px', padding: '20px' }}>
      {/* HERO SECTION - Efficiency Index */}
      <section className="py-20 px-4" style={{ minHeight: '200px' }}>
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '2.5rem',
              letterSpacing: '0.05em',
              marginBottom: '24px',
            }}
          >
            YOUR EFFICIENCY INDEX
          </motion.h1>


          {/* Score Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ marginBottom: '8px' }}
          >
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '6rem',
                fontWeight: 'bold',
                color: '#EDDF00',
                lineHeight: 1,
              }}
            >
              {animatedScore}
            </span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              fontFamily: tokens.typography.fontFamily,
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '48px',
            }}
          >
            (out of 100)
          </motion.p>

          {/* Time Categories Pie Chart */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative" style={{ width: '300px', height: '300px', marginBottom: '24px' }}>
              <svg width="300" height="300" viewBox="0 0 200 200">
                {pieSegments.map((segment, index) => (
                  <motion.path
                    key={segment.category}
                    d={segment.path}
                    fill={segment.color}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 1.5,
                      delay: index * 0.2,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  />
                ))}
              </svg>
            </div>
            
            {/* Legend */}
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {timeCategories.map((category) => (
                <div key={category.category} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: category.color,
                      borderRadius: '50%',
                    }}
                  />
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.05em' }}>
                    {category.category}: {category.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Operating Mode */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '3rem',
              letterSpacing: '0.05em',
              marginBottom: '1rem',
            }}
          >
            {(() => {
              // Recalculate stage right here to ensure we're using the correct value
              const currentScore = typeof results?.score === 'number' ? results.score : 
                                   typeof results?.score === 'string' ? parseFloat(results.score) : null;
              if (typeof currentScore === 'number' && !isNaN(currentScore)) {
                const { getStageByScore } = require('../../lib/stages');
                const displayStage = getStageByScore(currentScore);
                console.log('[STAGE RENDER] Rendering stage for score', currentScore, ':', displayStage.name);
                return `${displayStage.emoji} ${displayStage.name}`;
              }
              console.warn('[STAGE RENDER] Using fallback stage, score was:', currentScore);
              return `${stage.emoji} ${stage.name}`;
            })()}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              fontFamily: tokens.typography.fontFamily,
              fontSize: '1.125rem',
              color: 'rgba(255, 255, 255, 0.8)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
                    {(() => {
              // Use the same recalculated stage for description
              const currentScore = typeof results?.score === 'number' ? results.score : 
                                   typeof results?.score === 'string' ? parseFloat(results.score) : null;
              if (typeof currentScore === 'number' && !isNaN(currentScore)) {
                const { getStageByScore } = require('../../lib/stages');
                return getStageByScore(currentScore).description || '';
              }
              return stage.description || '';
            })()}
          </motion.p>
        </div>
      </section>

      {/* DATA SNAPSHOT - 3 Column Grid (Only show for deep analysis) */}
      {isDeepAnalysis && (
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Email Cost */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              style={{
                backgroundColor: 'rgba(83, 104, 120, 0.2)',
                border: `2px solid ${tokens.colors.secondary}`,
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: tokens.colors.primary, marginBottom: '8px' }}>
                {emailHoursDisplay}
              </div>
              <div style={{ fontFamily: tokens.typography.fontFamily, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Hours/Month
              </div>
              <div style={{ fontFamily: tokens.typography.fontFamily, fontSize: '0.875rem', color: tokens.colors.white, lineHeight: 1.4 }}>
                {emailHoursDisplay} hours/month on delegatable email coordination (approximately ${emailCost.cost.toLocaleString()})
              </div>
            </motion.div>

            {/* Meeting Cost */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{
                backgroundColor: 'rgba(83, 104, 120, 0.2)',
                border: `2px solid ${tokens.colors.secondary}`,
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: tokens.colors.primary, marginBottom: '8px' }}>
                ${meetingCost.monthlyCost.toLocaleString()}
              </div>
              <div style={{ fontFamily: tokens.typography.fontFamily, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Monthly Overhead
              </div>
              <div style={{ fontFamily: tokens.typography.fontFamily, fontSize: '0.875rem', color: tokens.colors.white, lineHeight: 1.4 }}>
                Your {meetingActualHoursDisplay} hours of meetings/week actually consume {meetingTrueHoursDisplay} hours—${meetingCost.monthlyCost.toLocaleString()}/month in meeting overhead
              </div>
            </motion.div>

            {/* Response Lag */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              style={{
                backgroundColor: 'rgba(83, 104, 120, 0.2)',
                border: `2px solid ${tokens.colors.secondary}`,
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: tokens.colors.primary, marginBottom: '8px' }}>
                {results.responseLag?.pending || 0}
              </div>
              <div style={{ fontFamily: tokens.typography.fontFamily, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Pending Reply
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      )}

      {/* TIME BREAKDOWN - Horizontal Bar Chart */}
      <section className="py-12 px-4" ref={barChartRef}>
        <div className="max-w-6xl mx-auto">
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '2rem',
              letterSpacing: '0.05em',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            WHERE YOUR TIME GOES
          </h2>
          {(() => {
            // Debug log before rendering
            console.log('[RENDER] timeBreakdown render check:', {
              exists: !!results.timeBreakdown,
              isArray: Array.isArray(results.timeBreakdown),
              length: results.timeBreakdown?.length || 0,
              data: results.timeBreakdown,
              filtered: results.timeBreakdown?.filter((item: any) => item && item.category && typeof item.percentage === 'number')
            });
            return null;
          })()}
          <div className="space-y-6">
            {(() => {
              // Force ensure timeBreakdown exists right before rendering
              // Use mockResults directly if results doesn't have valid data
              const defaultTimeBreakdown = [
                { category: "Doing the work", percentage: 42, hours: 16.8, automatable: 10.2 },
                { category: "Coordinating others", percentage: 31, hours: 12.4, automatable: 0 },
                { category: "Strategic decisions", percentage: 18, hours: 7.2, automatable: 0 },
                { category: "Admin & overhead", percentage: 9, hours: 3.6, automatable: 1.8 },
              ];
              
              let timeBreakdownToRender: any[] = [];
              
              if (results?.timeBreakdown && Array.isArray(results.timeBreakdown) && results.timeBreakdown.length > 0) {
                timeBreakdownToRender = results.timeBreakdown;
              } else if (mockResults?.timeBreakdown && Array.isArray(mockResults.timeBreakdown) && mockResults.timeBreakdown.length > 0) {
                timeBreakdownToRender = mockResults.timeBreakdown;
              } else {
                timeBreakdownToRender = defaultTimeBreakdown;
              }
              
              console.log('[RENDER] Final timeBreakdownToRender:', JSON.stringify(timeBreakdownToRender, null, 2));
              
              const validItems = timeBreakdownToRender.filter((item: any) => {
                const valid = item && typeof item === 'object' && item.category && typeof item.percentage === 'number';
                if (!valid) {
                  console.warn('[RENDER] Filtering out invalid item:', item);
                }
                return valid;
              });
              
              console.log('[RENDER] Valid items count:', validItems.length, 'out of', timeBreakdownToRender.length);
              console.log('[RENDER] Valid items:', JSON.stringify(validItems, null, 2));
              
              if (validItems.length === 0) {
                console.error('[RENDER] NO VALID ITEMS - using default');
                return defaultTimeBreakdown.map((item: any, index: number) => (
                  <div key={index} style={{ padding: '10px', color: 'white', border: '1px solid red' }}>
                    DEBUG: {item.category} - {item.percentage}%
                  </div>
                ));
              }
              
              return validItems.map((item: any, index: number) => {
                console.log('[RENDER] Rendering item', index, ':', item.category, item.percentage);
                return (
              <motion.div
                      key={item.category || index}
                initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.6,
                        delay: barChartInView ? index * 0.1 : 0,
                  ease: [0.4, 0, 0.2, 1],
                }}
                      style={{
                        opacity: 1, // Ensure it's always visible
                      }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontFamily: tokens.typography.fontFamily, fontSize: '1rem', color: tokens.colors.white }}>
                    {item.category}
                  </span>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: tokens.colors.primary }}>
                    {item.percentage}%
                  </span>
                </div>
                <div
                  style={{
                    height: '32px',
                    backgroundColor: 'rgba(83, 104, 120, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                    transition={{
                      duration: 1,
                            delay: barChartInView ? index * 0.1 : 0,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                    style={{
                      height: '100%',
                      backgroundColor: tokens.colors.primary,
                    }}
                  />
                </div>
              </motion.div>
                  );
                });
            })()}
          </div>
        </div>
      </section>

      {/* PRIMARY TIME DRAIN (Only show for deep analysis) */}
      {isDeepAnalysis && (
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '2rem',
              letterSpacing: '0.05em',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            YOUR PRIMARY TIME DRAIN
          </h2>
          <div
            style={{
              backgroundColor: 'rgba(83, 104, 120, 0.2)',
              border: `2px solid ${tokens.colors.secondary}`,
              padding: '32px',
            }}
          >
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: tokens.colors.primary, marginBottom: '16px' }}>
                  {results.timeLeak?.totalHoursWasted || 0} hours/week wasted
                </div>
                <p style={{ fontFamily: tokens.typography.fontFamily, fontSize: '1rem', color: tokens.colors.white, marginBottom: '16px', lineHeight: 1.6 }}>
                  {results.timeLeak?.description || ''}
                </p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ fontFamily: tokens.typography.fontFamily, fontSize: '1rem', color: tokens.colors.white, marginBottom: '12px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: tokens.colors.primary }}>•</span>
                <strong>{emailHoursDisplay} hours/month on delegatable email coordination</strong> (approximately <strong style={{ color: tokens.colors.primary }}>${emailCost.cost.toLocaleString()}</strong>)
              </li>
              <li style={{ fontFamily: tokens.typography.fontFamily, fontSize: '1rem', color: tokens.colors.white, marginBottom: '12px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: tokens.colors.primary }}>•</span>
                Your <strong>{meetingActualHoursDisplay} hours of meetings/week</strong> actually consume <strong>{meetingTrueHoursDisplay} hours</strong>—<strong style={{ color: tokens.colors.primary }}>${meetingCost.monthlyCost.toLocaleString()}/month</strong> in meeting overhead
              </li>
              <li style={{ fontFamily: tokens.typography.fontFamily, fontSize: '1rem', color: tokens.colors.white, marginBottom: '12px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: tokens.colors.primary }}>•</span>
                Reclaim up to <strong>{aiTimebackHoursDisplay} hours/month</strong> (approximately <strong style={{ color: tokens.colors.primary }}>${aiTimeback.cost.toLocaleString()}</strong>)
              </li>
            </ul>
          </div>
        </div>
      </section>
      )}

      {/* TOP 3 AI OPPORTUNITIES (Only show for deep analysis) */}
      {isDeepAnalysis && (
      <section className="py-12 px-4" ref={cardsRef}>
        <div className="max-w-6xl mx-auto">
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '2rem',
              letterSpacing: '0.05em',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            YOUR TOP 3 AI SOLUTIONS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {results.aiOpportunities && results.aiOpportunities.length > 0 ? results.aiOpportunities.filter((opp: any) => opp).map((opportunity: any, index: number) => (
              <motion.div
                key={opportunity.id || index}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0,
                  delay: 0,
                }}
                style={{
                  backgroundColor: 'rgba(83, 104, 120, 0.5)',
                  border: `2px solid ${tokens.colors.secondary}`,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                  visibility: 'visible',
                  opacity: 1,
                  minHeight: '300px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '0.875rem',
                    color: tokens.colors.primary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '12px',
                  }}
                >
                  {opportunity.priority?.toUpperCase() || 'MEDIUM'} PRIORITY
                </div>
                <h3
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.25rem',
                    letterSpacing: '0.05em',
                    marginBottom: '12px',
                    lineHeight: 1.2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#FFFFFF',
                  }}
                >
                  {opportunity.emoji && <span>{opportunity.emoji}</span>}
                  {opportunity.title || 'Opportunity'}
                </h3>
                <p
                  style={{
                    fontFamily: tokens.typography.fontFamily,
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '16px',
                    lineHeight: 1.6,
                    flex: 1,
                  }}
                >
                  {opportunity.description || ''}
                </p>
                <div style={{ borderTop: `1px solid ${tokens.colors.secondary}`, paddingTop: '16px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: tokens.typography.fontFamily, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Time Saved</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', color: tokens.colors.primary }}>{opportunity.timeSaved || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: tokens.typography.fontFamily, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Monthly Value</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', color: tokens.colors.primary }}>
                      {opportunity.monthlySavings ? `$${opportunity.monthlySavings.toLocaleString()}` : opportunity.value ? `$${opportunity.value}` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: tokens.typography.fontFamily, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Setup</span>
                    <span style={{ fontFamily: tokens.typography.fontFamily, fontSize: '0.875rem', color: '#FFFFFF' }}>{opportunity.implementationTime || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: tokens.typography.fontFamily, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>ROI</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', color: tokens.colors.primary }}>{opportunity.roi || 'N/A'}</span>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#FFFFFF', padding: '40px', backgroundColor: 'rgba(255, 0, 0, 0.1)' }}>
                No AI opportunities available. (Debug: results = {results ? 'exists' : 'null'}, aiOpportunities = {results?.aiOpportunities ? results.aiOpportunities.length + ' items' : 'undefined'})
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* CTA SECTION */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '2.5rem',
              letterSpacing: '0.05em',
              marginBottom: '24px',
            }}
          >
            READY TO GET YOUR TIME BACK?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontFamily: tokens.typography.fontFamily,
              fontSize: '1.125rem',
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '32px',
              lineHeight: 1.6,
            }}
          >
            No gimmicks. No fluff. Just the proven mechanics of scale—tailored to your unique business stage.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onClick={() => window.open('https://calendly.com/jason-katzventures/intro', '_blank')}
            style={{
              backgroundColor: tokens.colors.primary,
              color: tokens.colors.dark,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.25rem',
              letterSpacing: '0.1em',
              padding: '16px 48px',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            GET STARTED NOW
          </motion.button>
        </div>
      </section>
    </main>
  );
}
