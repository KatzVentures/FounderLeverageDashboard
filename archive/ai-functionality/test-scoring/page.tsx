'use client';

import { useState } from 'react';

export default function TestScoringPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testScoring = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('/api/test-scoring-engine');
      const json = await response.json();
      
      if (!response.ok) {
        setError(json.error || 'Request failed');
      } else {
        setData(json);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Scoring Engine Test</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        This page tests the scoring engine with sample data in both ANSWERS_ONLY and DEEP_ANALYSIS modes.
      </p>
      
      <button
        onClick={testScoring}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
        }}
      >
        {loading ? 'Testing...' : 'Test Scoring Engine'}
      </button>

      {error && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '5px',
          color: '#c00'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div style={{ marginTop: '20px' }}>
          <h2 style={{ color: '#0a0' }}>✓ Test Results</h2>
          
          {data.tests && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ 
                marginBottom: '30px',
                padding: '15px', 
                backgroundColor: '#efe', 
                border: '1px solid #cfc', 
                borderRadius: '5px'
              }}>
                <h3>ANSWERS_ONLY Mode</h3>
                <p><strong>Score:</strong> {data.tests.answersOnly.score}</p>
                <p><strong>Stage:</strong> {data.tests.answersOnly.stage}</p>
                <p><strong>Component Scores:</strong></p>
                <pre style={{ fontSize: '12px', backgroundColor: '#fff', padding: '10px', borderRadius: '5px', overflow: 'auto' }}>
                  {JSON.stringify(data.tests.answersOnly.componentScores, null, 2)}
                </pre>
                <p><strong>Has Email Data:</strong> {data.tests.answersOnly.hasEmailData ? 'Yes (should be false)' : 'No ✓'}</p>
                <p><strong>Has Calendar Data:</strong> {data.tests.answersOnly.hasCalendarData ? 'Yes (should be false)' : 'No ✓'}</p>
                <p><strong>AI Opportunities:</strong> {data.tests.answersOnly.aiOpportunitiesCount}</p>
              </div>

              <div style={{ 
                padding: '15px', 
                backgroundColor: '#efe', 
                border: '1px solid #cfc', 
                borderRadius: '5px'
              }}>
                <h3>DEEP_ANALYSIS Mode</h3>
                <p><strong>Score:</strong> {data.tests.deepAnalysis.score}</p>
                <p><strong>Stage:</strong> {data.tests.deepAnalysis.stage}</p>
                <p><strong>Email Load:</strong></p>
                <pre style={{ fontSize: '12px', backgroundColor: '#fff', padding: '10px', borderRadius: '5px', overflow: 'auto' }}>
                  {JSON.stringify(data.tests.deepAnalysis.emailLoad, null, 2)}
                </pre>
                <p><strong>Meeting Cost:</strong></p>
                <pre style={{ fontSize: '12px', backgroundColor: '#fff', padding: '10px', borderRadius: '5px', overflow: 'auto' }}>
                  {JSON.stringify(data.tests.deepAnalysis.meetingCost, null, 2)}
                </pre>
                {data.tests.deepAnalysis.automationMetrics && (
                  <>
                    <p><strong>Automation Metrics:</strong></p>
                    <pre style={{ fontSize: '12px', backgroundColor: '#fff', padding: '10px', borderRadius: '5px', overflow: 'auto' }}>
                      {JSON.stringify(data.tests.deepAnalysis.automationMetrics, null, 2)}
                    </pre>
                  </>
                )}
                <p><strong>AI Opportunities:</strong> {data.tests.deepAnalysis.aiOpportunitiesCount}</p>
                {data.tests.deepAnalysis.aiOpportunities && data.tests.deepAnalysis.aiOpportunities.length > 0 && (
                  <>
                    <p><strong>AI Opportunities:</strong></p>
                    <ul style={{ fontSize: '14px' }}>
                      {data.tests.deepAnalysis.aiOpportunities.map((opp: any, i: number) => (
                        <li key={i} style={{ marginBottom: '10px' }}>
                          <strong>{opp.title}</strong> - {opp.timeSaved} ({opp.priority} priority)
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
