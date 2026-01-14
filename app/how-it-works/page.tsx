'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { tokens } from '../../lib/design-tokens';
import { scoringComponents, scoreRanges, methodologyHero, privacyContent, dataWeCollect } from '../../lib/methodology-content';


export default function HowItWorksPage() {
  const componentsRef = useRef<HTMLDivElement>(null);
  const rangesRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);
  
  const componentsInView = useInView(componentsRef, { once: true, amount: 0.1 });
  const rangesInView = useInView(rangesRef, { once: true, amount: 0.1 });
  const dataInView = useInView(dataRef, { once: true, amount: 0.1 });
  const privacyInView = useInView(privacyRef, { once: true, amount: 0.3 });

  // Safety check - ensure data is loaded
  if (!scoringComponents || scoringComponents.length === 0) {
    return (
      <main style={{ padding: '20px', color: 'white', backgroundColor: '#000000', minHeight: '100vh', paddingTop: '77px' }}>
        <p>Loading methodology content...</p>
      </main>
    );
  }

  // Circular progress component
  const CircularProgress = ({ percentage }: { percentage: number }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(83, 104, 120, 0.3)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={tokens.colors.primary}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={componentsInView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.5rem',
            color: tokens.colors.primary,
            fontWeight: 'bold',
          }}
        >
          {percentage}%
        </div>
      </div>
    );
  };

  return (
    <main 
      className="min-h-screen" 
      style={{ 
        backgroundColor: '#000000', 
        color: '#FFFFFF',
        paddingTop: '77px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* HERO SECTION */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              letterSpacing: '0.05em',
              marginBottom: '24px',
              color: '#FFFFFF',
              lineHeight: 1.2,
            }}
          >
            {methodologyHero.headlinePart1 || 'HOW WE CALCULATE YOUR EFFICIENCY'}
            <br />
            {methodologyHero.headlinePart2 || 'INDEX'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontFamily: tokens.typography.fontFamily,
              fontSize: '1.125rem',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: 1.6,
              maxWidth: '700px',
              margin: '0 auto',
            }}
          >
            {methodologyHero.subheadline}
          </motion.p>
        </div>
      </section>

      {/* OUR SCORING SYSTEM */}
      <section className="py-16 px-4" ref={componentsRef}>
        <div className="max-w-6xl mx-auto">
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              letterSpacing: '0.05em',
              marginBottom: '48px',
              textAlign: 'center',
              color: tokens.colors.white,
            }}
          >
            OUR SCORING SYSTEM
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scoringComponents.map((component: any, index: number) => (
              <motion.div
                key={component.name}
                initial={{ opacity: 0, y: 50 }}
                animate={componentsInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: tokens.animations.durations.fast,
                  delay: index * 0.1,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{
                  backgroundColor: 'rgba(83, 104, 120, 0.2)',
                  border: `2px solid ${tokens.colors.secondary}`,
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '20px' }}>
                  <CircularProgress percentage={component.weight} />
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '1.5rem',
                        letterSpacing: '0.05em',
                        marginBottom: '8px',
                        color: tokens.colors.white,
                      }}
                    >
                      {component.name}
                    </h3>
                  </div>
                </div>
                
                <p
                  style={{
                    fontFamily: tokens.typography.fontFamily,
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: 1.6,
                    marginBottom: '20px',
                  }}
                >
                  {component.description}
                </p>
                
                <div>
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
                    Data Sources
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {component.dataSources.map((source: string, idx: number) => (
                      <li
                        key={idx}
                        style={{
                          fontFamily: tokens.typography.fontFamily,
                          fontSize: '0.875rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginBottom: '8px',
                          paddingLeft: '20px',
                          position: 'relative',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            color: tokens.colors.primary,
                          }}
                        >
                          •
                        </span>
                        {source}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SCORE RANGES */}
      <section className="py-16 px-4" ref={rangesRef}>
        <div className="max-w-6xl mx-auto">
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              letterSpacing: '0.05em',
              marginBottom: '48px',
              textAlign: 'center',
              color: tokens.colors.white,
            }}
          >
            SCORE RANGES
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {scoreRanges.map((range: any, index: number) => (
              <motion.div
                key={range.name}
                initial={{ opacity: 0, y: 50 }}
                animate={rangesInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: tokens.animations.durations.fast,
                  delay: index * 0.1,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{
                  backgroundColor: 'rgba(83, 104, 120, 0.2)',
                  border: `2px solid ${range.color}`,
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.25rem',
                    letterSpacing: '0.05em',
                    marginBottom: '16px',
                    color: range.color,
                  }}
                >
                  {range.min}-{range.max}
                </div>
                
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '2rem',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    color: tokens.colors.white,
                  }}
                >
                  {range.emoji} {range.name}
                </div>
                
                <p
                  style={{
                    fontFamily: tokens.typography.fontFamily,
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: 1.6,
                    flex: 1,
                  }}
                >
                  {range.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT DATA WE ACCESS */}
      <section className="py-16 px-4" ref={dataRef}>
        <div className="max-w-6xl mx-auto">
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              letterSpacing: '0.05em',
              marginBottom: '48px',
              textAlign: 'center',
              color: tokens.colors.white,
            }}
          >
            {dataWeCollect.title}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {dataWeCollect.items.map((item: any, index: number) => (
              <motion.div
                key={item.source}
                initial={{ opacity: 0, y: 30 }}
                animate={dataInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: tokens.animations.durations.fast,
                  delay: index * 0.1,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{
                  backgroundColor: 'rgba(83, 104, 120, 0.2)',
                  border: `2px solid ${tokens.colors.secondary}`,
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.5rem',
                    letterSpacing: '0.05em',
                    marginBottom: '16px',
                    color: tokens.colors.primary,
                  }}
                >
                  {item.source}
                </h3>
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '0.875rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '8px',
                    }}
                  >
                    What We Access
                  </div>
                  <p
                    style={{
                      fontFamily: tokens.typography.fontFamily,
                      fontSize: '0.875rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      lineHeight: 1.6,
                      marginBottom: '16px',
                    }}
                  >
                    {item.what}
                  </p>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '0.875rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '8px',
                    }}
                  >
                    Why We Need It
                  </div>
                  <p
                    style={{
                      fontFamily: tokens.typography.fontFamily,
                      fontSize: '0.875rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      lineHeight: 1.6,
                    }}
                  >
                    {item.why}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACY FIRST */}
      <section className="py-16 px-4" ref={privacyRef}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={privacyInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: tokens.animations.durations.fast,
              ease: [0.4, 0, 0.2, 1],
            }}
            style={{
              backgroundColor: 'rgba(83, 104, 120, 0.3)',
              border: `2px solid ${tokens.colors.secondary}`,
              padding: '48px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <h3
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '2rem',
                letterSpacing: '0.05em',
                marginBottom: '20px',
                color: tokens.colors.primary,
              }}
            >
              {privacyContent.title}
            </h3>
            <p
              style={{
                fontFamily: tokens.typography.fontFamily,
                fontSize: '1.125rem',
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.6,
                maxWidth: '700px',
                margin: '0 auto',
              }}
            >
              {privacyContent.description}
            </p>
          </motion.div>
        </div>
      </section>

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
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              letterSpacing: '0.05em',
              marginBottom: '32px',
              color: tokens.colors.white,
            }}
          >
            READY TO SEE YOUR SCORE?
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  backgroundColor: tokens.colors.primary,
                  color: tokens.colors.accent,
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '1.25rem',
                  letterSpacing: '0.05em',
                  padding: '16px 48px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(237, 223, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                START ASSESSMENT
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
