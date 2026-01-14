'use client';

import { useState } from 'react';

export default function TestGmailPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testGmail = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('/api/data/gmail');
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
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>Gmail API Test</h1>
      <button
        onClick={testGmail}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Loading...' : 'Test /api/data/gmail'}
      </button>

      {error && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '5px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div style={{ marginTop: '20px' }}>
          <h2>Results:</h2>
          <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
            <p><strong>Total Threads:</strong> {data.totalThreads}</p>
            <p><strong>Total Messages:</strong> {data.totalMessages}</p>
            <p><strong>Sent:</strong> {data.totalSentMessages}</p>
            <p><strong>Received:</strong> {data.totalReceivedMessages}</p>
            <p><strong>Avg Thread Length:</strong> {data.avgThreadLength?.toFixed(2)}</p>
            <p><strong>Threads Awaiting Response:</strong> {data.threadsAwaitingUserResponse}</p>
            <p><strong>Over 24h:</strong> {data.awaitingUserResponseOver24h}</p>
            <p><strong>Estimated Time (minutes):</strong> {data.estimatedTimeSpentMinutes}</p>
            
            <details style={{ marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Full JSON Response</summary>
              <pre style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', overflow: 'auto', maxHeight: '400px' }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>

            {data.threads && data.threads.length > 0 && (
              <details style={{ marginTop: '20px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Sample Threads (first 5)</summary>
                <pre style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', overflow: 'auto', maxHeight: '400px' }}>
                  {JSON.stringify(data.threads.slice(0, 5), null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
