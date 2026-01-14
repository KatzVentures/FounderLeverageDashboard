'use client';

import { useState } from 'react';

export default function TestClaudePage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testClaude = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('/api/test-claude');
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
      <h1>Claude AI Integration Test</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        This page tests the Claude AI analyzer with sample email threads and calendar events.
      </p>
      
      <button
        onClick={testClaude}
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
        {loading ? 'Testing Claude...' : 'Test Claude Integration'}
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
          <div style={{ 
            marginTop: '15px', 
            padding: '15px', 
            backgroundColor: '#efe', 
            border: '1px solid #cfc', 
            borderRadius: '5px'
          }}>
            <p><strong>Status:</strong> {data.message}</p>
            
            {data.results && (
              <div style={{ marginTop: '20px' }}>
                <h3>Email Analysis</h3>
                <p>Input Threads: {data.results.emailAnalysis.inputThreads}</p>
                <p>Analyzed Threads: {data.results.emailAnalysis.analyzedThreads}</p>
                
                {data.results.emailAnalysis.results && data.results.emailAnalysis.results.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '5px' }}>
                    <h4>Results:</h4>
                    <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '300px' }}>
                      {JSON.stringify(data.results.emailAnalysis.results, null, 2)}
                    </pre>
                  </div>
                )}

                <h3 style={{ marginTop: '20px' }}>Calendar Analysis</h3>
                <p>Input Events: {data.results.calendarAnalysis.inputEvents}</p>
                <p>Analyzed Events: {data.results.calendarAnalysis.analyzedEvents}</p>
                
                {data.results.calendarAnalysis.results && data.results.calendarAnalysis.results.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '5px' }}>
                    <h4>Results:</h4>
                    <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '300px' }}>
                      {JSON.stringify(data.results.calendarAnalysis.results, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
