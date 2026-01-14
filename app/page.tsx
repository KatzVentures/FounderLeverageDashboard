'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tokens } from '../lib/design-tokens';
import { assessmentQuestions } from '../lib/questions';

// Group questions into sections by component for UI display
// Questions are automatically pulled from assessmentQuestions, so updates there will reflect in the form
// NOTE: Process Maturity section removed per requirements
const assessmentSections = [
  {
    id: 1,
    title: "WHERE YOUR TIME ACTUALLY GOES",
    questions: assessmentQuestions.filter(q => q.component === 'timeAllocation')
  },
  {
    id: 2,
    title: "WHAT YOU SHOULDN'T OWN (ANYMORE)",
    questions: assessmentQuestions.filter(q => q.component === 'delegationQuality')
  },
  {
    id: 3,
    title: "STRATEGIC FOCUS",
    questions: assessmentQuestions.filter(q => q.component === 'strategicFocus')
  },
  {
    id: 4,
    title: "OPERATING RHYTHM",
    questions: assessmentQuestions.filter(q => q.component === 'operatingRhythm')
  }
];

export default function Home() {
  const router = useRouter();
  const [showAssessment, setShowAssessment] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward

  const handleStartAssessment = () => {
    setShowAssessment(true);
    setShowIntro(true);
  };

  const handleCloseAssessment = () => {
    setShowAssessment(false);
    setShowIntro(true);
    setCurrentSection(0);
    setName('');
    setEmail('');
    setResponses({});
    setErrorMessage('');
    setDirection(0);
  };

  const handleContinueFromIntro = () => {
    // No email validation at intro - email will be collected at the end
    setShowIntro(false);
    setErrorMessage('');
  };

  const handleResponseChange = (questionId: string, value: string | boolean) => {
    // For toggles, explicitly set false for unchecked (NO), true for checked (YES)
    // Default to false (NO) if not set
    setResponses(prev => ({ ...prev, [questionId]: value }));
    setErrorMessage('');
  };

  const validateSection = (sectionIndex: number): boolean => {
    const section = assessmentSections[sectionIndex];
    
    // All questions (both dropdowns and toggles) are required
    return section.questions.every(q => {
      if (q.type === 'dropdown') {
        return responses[q.id] !== undefined && responses[q.id] !== '';
      }
      // Toggle questions: default to false (NO) if not answered, both true and false are valid
      // If undefined, treat as false (NO) - so toggles are always valid
      return true; // Toggles are always valid (default NO or explicit YES/NO)
    });
  };

  const handleNext = () => {
    if (!validateSection(currentSection)) {
      setErrorMessage('Please answer all questions in this section');
      return;
    }

    // If we're on the last section, show email/revenue collection instead of submitting
    if (currentSection === assessmentSections.length - 1) {
      // Move to email/revenue collection step
      setCurrentSection(assessmentSections.length); // This will be the email/revenue step
      return;
    }

    if (currentSection < assessmentSections.length - 1) {
      setDirection(1);
      setCurrentSection(prev => prev + 1);
    }
  };

  const handleBack = () => {
    // If we're on the email/revenue step, go back to last question section
    if (currentSection === assessmentSections.length) {
      setDirection(-1);
      setCurrentSection(assessmentSections.length - 1);
      return;
    }
    
    if (currentSection > 0) {
      setDirection(-1);
      setCurrentSection(prev => prev - 1);
    } else {
      // Go back to intro from first section
      setShowIntro(true);
      setCurrentSection(0);
    }
  };

  const handleSubmit = async () => {
    // Validate name, email and revenue before submitting
    if (!name || name.trim() === '') {
      setErrorMessage('Please enter your name');
      return;
    }
    
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    
    if (!responses.revenueRange) {
      setErrorMessage('Please select your company revenue range');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // Include name, email and revenue in responses
      const answersWithContact = {
        ...responses,
        name: name.trim(),
        email: email,
        revenueRange: responses.revenueRange,
      };
      
      // POST answers to /api/assessment
      const response = await fetch('/api/assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: answersWithContact }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[ASSESSMENT] Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned an error page instead of JSON');
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to save assessment');
      }

      // Navigate directly to results page
      router.push('/results');
    } catch (error) {
      console.error('Assessment submission error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit assessment. Please try again.');
      setIsLoading(false);
    }
  };

  const currentSectionData = !showIntro && currentSection < assessmentSections.length ? assessmentSections[currentSection] : null;
  const isEmailRevenueStep = !showIntro && currentSection === assessmentSections.length;
  const progress = !showIntro ? ((currentSection + 1) / (assessmentSections.length + 1)) * 100 : 0;
  

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* NAV BAR - Always visible */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 w-full"
        style={{
          height: '77px',
          backgroundColor: tokens.colors.accent || '#000100',
          color: tokens.colors.white || '#FFFFFF',
          display: 'flex',
          visibility: 'visible',
          opacity: 1,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3" style={{ display: 'flex', visibility: 'visible' }}>
          <img 
            src="/KATZ-VENTURES-LOGOS-GREY_Full.png" 
            alt="Katz Ventures Logo" 
            style={{ height: '80px', width: 'auto', display: 'block', visibility: 'visible' }}
            onError={(e) => {
              console.error('Logo failed to load');
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Navigation Links - Removed per requirements */}
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center overflow-x-hidden overflow-y-auto">
        {/* Hero Background Image */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="/road walking.png"
            alt="Hero background"
            fill
            className="object-cover"
            priority
            quality={90}
          />
        </div>

        {/* Dark overlay for text readability */}
        <motion.div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundColor: showAssessment ? 'rgba(0, 1, 0, 0.75)' : 'rgba(0, 0, 0, 0.3)',
          }}
          transition={{ duration: 0.4 }}
        />

        {/* Main Headline - Upper left */}
        {!showAssessment && (
          <div
            className="relative z-10"
            style={{ 
              position: 'absolute', 
              top: 'clamp(232px, 24vh, 272px)', 
              left: 'clamp(20px, 2vw, 40px)',
              zIndex: 10,
              maxWidth: 'min(600px, calc(100vw - 40px))',
              width: 'auto',
            }}
          >
            <h1
              className="text-white font-bold uppercase tracking-wide"
              style={{
                fontFamily: "'Anton', sans-serif",
                fontWeight: 'normal',
                fontSize: 'clamp(2.55rem, 5.1vw, 4.46rem)',
                lineHeight: 1.2,
                letterSpacing: '0.05em',
                textAlign: 'left',
                whiteSpace: 'nowrap',
              }}
            >
              GET YOUR TIME BACK.
            </h1>
            
            {/* Sub-headline text - Under main headline */}
            <p
              style={{
                color: '#FFFFFF',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: 'clamp(0.75rem, 1.1vw, 0.9rem)',
                fontWeight: 'normal',
                fontStyle: 'italic',
                letterSpacing: '0.05em',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                marginTop: '1rem',
                lineHeight: 1.4,
              }}
            >
              IN JUST 5 MINUTES, SEE WHERE YOUR TIME<br />AND MONEY GOES - AND HOW TO SOLVE IT,<br />RIGHT NOW.
            </p>
          </div>
        )}

        {/* CTA Button and Arrow - Page center */}
        {!showAssessment && (
          <div
            className="relative z-10"
            style={{ 
              position: 'absolute', 
              bottom: 'clamp(250px, 30vh, 400px)', 
              left: '50%', 
              transform: 'translateX(-50%)', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              zIndex: 10,
              width: 'auto',
              maxWidth: 'calc(100vw - 40px)',
            }}
          >
            {/* CTA Button */}
            <button
              onClick={handleStartAssessment}
              className="inline-block px-6 py-3 text-white uppercase tracking-wide border-2 border-white hover:bg-white hover:text-black transition-all duration-300 cursor-pointer"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontWeight: 'normal',
                fontSize: '0.675em',
                letterSpacing: '0.15em',
                backgroundColor: 'transparent',
              }}
            >
              Start Assessment
            </button>

            {/* Scroll Indicator - Arrow under button */}
            <motion.div
              style={{ 
                marginTop: '22px',
                position: 'relative',
                zIndex: 11,
                color: '#FFFFFF',
                fontSize: '2rem',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              }}
              animate={{ y: [0, 10, 0] }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: 'easeInOut'
              }}
            >
              ↓
            </motion.div>
          </div>
        )}

        {/* Assessment Form Overlay */}
        <AnimatePresence mode="wait">
          {showAssessment && !isLoading && (
            <motion.div
              key="assessment-form"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-20 flex items-start justify-center p-4"
              style={{ overflowY: 'auto', paddingTop: '80px', paddingBottom: '40px' }}
            >
              <div
                style={{
                  maxWidth: '550px',
                  width: '100%',
                  backgroundColor: 'rgba(83, 104, 120, 0.25)',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(83, 104, 120, 0.4)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
                  margin: 'auto',
                  maxHeight: 'calc(100vh - 120px)',
                  position: 'relative',
                  overflowY: 'auto',
                }}
                className="md:p-6 p-3"
              >
                {/* Close Button */}
                <button
                  onClick={handleCloseAssessment}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(83, 104, 120, 0.5)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    transition: 'background-color 0.3s ease',
                    zIndex: 10,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(237, 223, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(83, 104, 120, 0.5)';
                  }}
                  aria-label="Close assessment"
                >
                  ×
                </button>
                <AnimatePresence mode="wait">
                  {showIntro ? (
                    <motion.div
                      key="intro"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                      style={{ textAlign: 'center' }}
                    >
                      {/* Intro Message */}
                      <h2
                        style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: '1.5rem',
                          color: '#FFFFFF',
                          letterSpacing: '0.05em',
                          marginBottom: '24px',
                          lineHeight: 1.3,
                        }}
                      >
                        THIS PROCESS TAKES 5 MINUTES - AND IS WELL WORTH IT.
                      </h2>
                      
                      {/* Start Button */}
                      <button
                        onClick={handleContinueFromIntro}
                        style={{
                          backgroundColor: '#EDDF00',
                          color: '#000000',
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: '1.125rem',
                          padding: '12px 48px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          width: '100%',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(237, 223, 0, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        GET STARTED
                      </button>


                      {/* Error Message */}
                      {errorMessage && (
                        <p
                          style={{
                            fontSize: '0.875rem',
                            color: '#EDDF00',
                            marginTop: '16px',
                            textAlign: 'center',
                          }}
                        >
                          {errorMessage}
                        </p>
                      )}
                    </motion.div>
                  ) : currentSectionData ? (
                    <motion.div
                      key={currentSection}
                      custom={direction}
                      initial={{ opacity: 0, x: direction > 0 ? 300 : -300 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: direction > 0 ? -300 : 300 }}
                      transition={{ duration: 0.4, ease: [0.77, 0, 0.175, 1] }}
                    >
                      {/* Section Header */}
                      <div style={{ marginBottom: '20px', paddingRight: '40px' }}>
                        <h2
                          style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: '1.375rem',
                            color: '#FFFFFF',
                            letterSpacing: '0.05em',
                            marginBottom: '6px',
                          }}
                        >
                          {currentSectionData.title}
                        </h2>
                        <p
                          style={{
                            fontSize: '0.8rem',
                            color: 'rgba(255, 255, 255, 0.7)',
                            marginBottom: '10px',
                          }}
                        >
                          Section {currentSection + 1} of {assessmentSections.length + 1}
                        </p>
                        {/* Progress Bar */}
                        <div
                          style={{
                            width: '100%',
                            height: '2px',
                            backgroundColor: 'rgba(83, 104, 120, 0.3)',
                            borderRadius: '1px',
                            overflow: 'hidden',
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.4 }}
                            style={{
                              height: '100%',
                              backgroundColor: '#EDDF00',
                            }}
                          />
                        </div>
                      </div>

                    {/* Questions */}
                    <div>
                      {currentSectionData.questions.map((question: any, index: number) => (
                        <div
                          key={question.id}
                          style={{
                            marginBottom: index < currentSectionData.questions.length - 1 ? '18px' : '0',
                          }}
                        >
                          <label
                            style={{
                              fontFamily: "'Bebas Neue', sans-serif",
                              fontSize: '0.95rem',
                              color: '#FFFFFF',
                              letterSpacing: '0.05em',
                              display: 'block',
                              marginBottom: '10px',
                            }}
                          >
                            {question.text}
                          </label>

                          {question.type === 'dropdown' && (
                            <select
                              value={responses[question.id] as string || ''}
                              onChange={(e) => handleResponseChange(question.id, e.target.value)}
                              style={{
                                width: '100%',
                                height: '44px',
                                backgroundColor: 'rgba(83, 104, 120, 0.4)',
                                border: '1px solid rgba(83, 104, 120, 0.5)',
                                borderRadius: '8px',
                                color: '#FFFFFF',
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: '0.9rem',
                                padding: '0 14px',
                                cursor: 'pointer',
                                outline: 'none',
                                appearance: 'none',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23EDDF00' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 14px center',
                                paddingRight: '38px',
                              }}
                              onFocus={(e) => {
                                e.target.style.border = '1px solid #EDDF00';
                                e.target.style.boxShadow = '0 0 0 3px rgba(237, 223, 0, 0.2)';
                              }}
                              onBlur={(e) => {
                                e.target.style.border = '1px solid rgba(83, 104, 120, 0.5)';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              <option value="" style={{ color: '#000' }}>
                                Select an option
                              </option>
                              {question.options?.map((option: string) => (
                                <option key={option} value={option} style={{ color: '#000' }}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}

                          {question.type === 'toggle' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                  onClick={() => {
                                    const currentValue = responses[question.id];
                                    handleResponseChange(question.id, currentValue === true ? false : true);
                                  }}
                                  style={{
                                    width: '60px',
                                    height: '32px',
                                    borderRadius: '16px',
                                    backgroundColor: (responses[question.id] === true)
                                      ? '#EDDF00'
                                      : 'rgba(83, 104, 120, 0.5)',
                                    position: 'relative',
                                    transition: 'background-color 0.3s ease',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <motion.div
                                    animate={{
                                      x: (responses[question.id] === true) ? 28 : 4,
                                    }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%',
                                      backgroundColor: '#FFFFFF',
                                      position: 'absolute',
                                      top: '4px',
                                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                    }}
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span
                                    onClick={() => handleResponseChange(question.id, true)}
                                    style={{
                                      fontFamily: "'Bebas Neue', sans-serif",
                                      fontSize: '0.9rem',
                                      color: (responses[question.id] === true) ? '#EDDF00' : 'rgba(255, 255, 255, 0.5)',
                                      letterSpacing: '0.05em',
                                      transition: 'color 0.3s ease',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    YES
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "'Bebas Neue', sans-serif",
                                      fontSize: '0.9rem',
                                      color: 'rgba(255, 255, 255, 0.5)',
                                      letterSpacing: '0.05em',
                                    }}
                                  >
                                    /
                                  </span>
                                  <span
                                    onClick={() => handleResponseChange(question.id, false)}
                                    style={{
                                      fontFamily: "'Bebas Neue', sans-serif",
                                      fontSize: '0.9rem',
                                      color: (responses[question.id] !== true) ? '#EDDF00' : 'rgba(255, 255, 255, 0.5)',
                                      letterSpacing: '0.05em',
                                      transition: 'color 0.3s ease',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    NO
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                      {/* Navigation Buttons */}
                    <div
                      className="flex flex-col sm:flex-row sm:justify-between gap-4"
                      style={{
                        marginTop: '24px',
                      }}
                    >
                      <button
                        onClick={handleBack}
                        className="w-full sm:w-auto"
                        style={{
                          backgroundColor: 'rgba(83, 104, 120, 0.3)',
                          color: '#FFFFFF',
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: '1.125rem',
                          padding: '12px 32px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(83, 104, 120, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(83, 104, 120, 0.3)';
                        }}
                      >
                        Back
                      </button>

                      <button
                        onClick={handleNext}
                        disabled={!validateSection(currentSection)}
                        className="w-full sm:w-auto sm:ml-auto"
                        style={{
                          backgroundColor: '#EDDF00',
                          color: '#000000',
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: '1.125rem',
                          padding: '12px 48px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: validateSection(currentSection) ? 'pointer' : 'not-allowed',
                          opacity: validateSection(currentSection) ? 1 : 0.5,
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (validateSection(currentSection)) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(237, 223, 0, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {currentSection === assessmentSections.length - 1 ? 'Next Step' : 'Next Section'}
                      </button>
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: '#EDDF00',
                          marginTop: '16px',
                          textAlign: 'center',
                        }}
                      >
                        {errorMessage}
                      </p>
                    )}
                  </motion.div>
                  ) : isEmailRevenueStep ? (
                    <motion.div
                      key="email-revenue"
                      custom={direction}
                      initial={{ opacity: 0, x: direction > 0 ? 300 : -300 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: direction > 0 ? -300 : 300 }}
                      transition={{ duration: 0.4, ease: [0.77, 0, 0.175, 1] }}
                    >
                      {/* Section Header */}
                      <div style={{ marginBottom: '20px', paddingRight: '40px' }}>
                        <h2
                          style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: '1.375rem',
                            color: '#FFFFFF',
                            letterSpacing: '0.05em',
                            marginBottom: '6px',
                          }}
                        >
                          ALMOST DONE
                        </h2>
                        <p
                          style={{
                            fontSize: '0.8rem',
                            color: 'rgba(255, 255, 255, 0.7)',
                            marginBottom: '10px',
                          }}
                        >
                          Just a few more details
                        </p>
                        {/* Progress Bar */}
                        <div
                          style={{
                            width: '100%',
                            height: '2px',
                            backgroundColor: 'rgba(83, 104, 120, 0.3)',
                            borderRadius: '1px',
                            overflow: 'hidden',
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.4 }}
                            style={{
                              height: '100%',
                              backgroundColor: '#EDDF00',
                            }}
                          />
                        </div>
                      </div>

                      {/* Name Input */}
                      <div style={{ marginBottom: '18px' }}>
                        <label
                          style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: '0.95rem',
                            color: '#FFFFFF',
                            letterSpacing: '0.05em',
                            display: 'block',
                            marginBottom: '10px',
                          }}
                        >
                          Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setErrorMessage('');
                          }}
                          placeholder="Your name"
                          style={{
                            width: '100%',
                            height: '44px',
                            backgroundColor: 'rgba(83, 104, 120, 0.4)',
                            border: '1px solid rgba(83, 104, 120, 0.5)',
                            borderRadius: '8px',
                            color: '#FFFFFF',
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: '0.9rem',
                            padding: '0 14px',
                            outline: 'none',
                          }}
                          onFocus={(e) => {
                            e.target.style.border = '1px solid #EDDF00';
                            e.target.style.boxShadow = '0 0 0 3px rgba(237, 223, 0, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.border = '1px solid rgba(83, 104, 120, 0.5)';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>

                      {/* Email Input */}
                      <div style={{ marginBottom: '18px' }}>
                        <label
                          style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: '0.95rem',
                            color: '#FFFFFF',
                            letterSpacing: '0.05em',
                            display: 'block',
                            marginBottom: '10px',
                          }}
                        >
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setErrorMessage('');
                          }}
                          placeholder="your@email.com"
                          style={{
                            width: '100%',
                            height: '44px',
                            backgroundColor: 'rgba(83, 104, 120, 0.4)',
                            border: '1px solid rgba(83, 104, 120, 0.5)',
                            borderRadius: '8px',
                            color: '#FFFFFF',
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: '0.9rem',
                            padding: '0 14px',
                            outline: 'none',
                          }}
                          onFocus={(e) => {
                            e.target.style.border = '1px solid #EDDF00';
                            e.target.style.boxShadow = '0 0 0 3px rgba(237, 223, 0, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.border = '1px solid rgba(83, 104, 120, 0.5)';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>

                      {/* Revenue Question */}
                      <div style={{ marginBottom: '18px' }}>
                        <label
                          style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: '0.95rem',
                            color: '#FFFFFF',
                            letterSpacing: '0.05em',
                            display: 'block',
                            marginBottom: '10px',
                          }}
                        >
                          Company Revenue Range
                        </label>
                        <select
                          value={responses.revenueRange as string || ''}
                          onChange={(e) => handleResponseChange('revenueRange', e.target.value)}
                          style={{
                            width: '100%',
                            height: '44px',
                            backgroundColor: 'rgba(83, 104, 120, 0.4)',
                            border: '1px solid rgba(83, 104, 120, 0.5)',
                            borderRadius: '8px',
                            color: '#FFFFFF',
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: '0.9rem',
                            padding: '0 14px',
                            cursor: 'pointer',
                            outline: 'none',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23EDDF00' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 14px center',
                            paddingRight: '38px',
                          }}
                          onFocus={(e) => {
                            e.target.style.border = '1px solid #EDDF00';
                            e.target.style.boxShadow = '0 0 0 3px rgba(237, 223, 0, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.border = '1px solid rgba(83, 104, 120, 0.5)';
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          <option value="" style={{ color: '#000' }}>
                            Select revenue range
                          </option>
                          <option value="$0-250k" style={{ color: '#000' }}>$0-250k</option>
                          <option value="$250k- $500k" style={{ color: '#000' }}>$250k- $500k</option>
                          <option value="$0 – $500000" style={{ color: '#000' }}>$0 – $500000</option>
                          <option value="$500000 – $1 million" style={{ color: '#000' }}>$500000 – $1 million</option>
                          <option value="$1 - $5 million" style={{ color: '#000' }}>$1 - $5 million</option>
                          <option value="Over $5 million" style={{ color: '#000' }}>Over $5 million</option>
                        </select>
                      </div>

                      {/* Navigation Buttons */}
                      <div
                        className="flex flex-col sm:flex-row sm:justify-between gap-4"
                        style={{
                          marginTop: '24px',
                        }}
                      >
                        <button
                          onClick={handleBack}
                          className="w-full sm:w-auto"
                          style={{
                            backgroundColor: 'rgba(83, 104, 120, 0.3)',
                            color: '#FFFFFF',
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: '1.125rem',
                            padding: '12px 32px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(83, 104, 120, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(83, 104, 120, 0.3)';
                          }}
                        >
                          Back
                        </button>

                        <button
                          onClick={handleSubmit}
                          disabled={!name || name.trim() === '' || !email || !email.includes('@') || !responses.revenueRange}
                          className="w-full sm:w-auto sm:ml-auto"
                          style={{
                            backgroundColor: '#EDDF00',
                            color: '#000000',
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: '1.125rem',
                            padding: '12px 48px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: (name && name.trim() !== '' && email && email.includes('@') && responses.revenueRange) ? 'pointer' : 'not-allowed',
                            opacity: (name && name.trim() !== '' && email && email.includes('@') && responses.revenueRange) ? 1 : 0.5,
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (name && name.trim() !== '' && email && email.includes('@') && responses.revenueRange) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(237, 223, 0, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          Submit Assessment
                        </button>
                      </div>

                      {/* Error Message */}
                      {errorMessage && (
                        <p
                          style={{
                            fontSize: '0.875rem',
                            color: '#EDDF00',
                            marginTop: '16px',
                            textAlign: 'center',
                          }}
                        >
                          {errorMessage}
                        </p>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {showAssessment && isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center"
            >
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '2.25rem',
                  color: '#FFFFFF',
                  marginBottom: '24px',
                  textAlign: 'center',
                }}
              >
                CALCULATING YOUR RESULTS...
              </motion.h2>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid rgba(237, 223, 0, 0.3)',
                  borderTopColor: '#EDDF00',
                  borderRadius: '50%',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
