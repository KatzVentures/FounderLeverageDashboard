'use client';

import { useState } from 'react';

export default function TestGmailContentPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testGmailContent = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('/api/data/gmail-content');
      const json = await response.json();
      
      if (!response.ok || !json.ok) {
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
      <h1>Gmail Content API Test</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Tests <code>/api/data/gmail-content</code> endpoint with privacy-safe email snippets
      </p>
      
      <button
        onClick={testGmailContent}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
        }}
      >
        {loading ? 'Loading...' : 'Test /api/data/gmail-content'}
      </button>

      {error && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '5px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div style={{ marginTop: '20px' }}>
          <h2>Summary</h2>
          <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
            <p><strong>Window:</strong> Last {data.windowDays} days</p>
            <p><strong>Max Threads:</strong> {data.maxThreads}</p>
            <p><strong>Max Messages Per Thread:</strong> {data.maxMessagesPerThread}</p>
            <p><strong>Included Threads:</strong> {data.includedThreads?.length || 0}</p>
            <p><strong>Excluded Threads:</strong> {data.excludedThreads?.length || 0}</p>
            
            {data.excludedThreads && data.excludedThreads.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <strong>Exclusion Reasons:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {Object.entries(
                    data.excludedThreads.reduce((acc: any, t: any) => {
                      acc[t.reason] = (acc[t.reason] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([reason, count]: [string, any]) => (
                    <li key={reason}>{reason}: {count}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {data.includedThreads && data.includedThreads.length > 0 && (
            <>
              <h2>Included Threads ({data.includedThreads.length})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {data.includedThreads.slice(0, 10).map((thread: any, idx: number) => (
                  <div
                    key={thread.threadId}
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      padding: '15px',
                      backgroundColor: '#fff',
                    }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <strong>#{idx + 1} - {thread.subject}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                      <div>Thread ID: {thread.threadId}</div>
                      <div>Participants: {thread.participants.join(', ') || '(none)'}</div>
                      <div>Total Messages in Thread: {thread.messageCount}</div>
                      <div>Snippets: {thread.snippets.length}</div>
                    </div>
                    <div style={{ marginTop: '15px' }}>
                      <strong>Snippets:</strong>
                      {thread.snippets.map((snippet: any, sIdx: number) => (
                        <div
                          key={snippet.messageId}
                          style={{
                            marginTop: '10px',
                            padding: '10px',
                            backgroundColor: snippet.direction === 'OUTBOUND' ? '#e3f2fd' : '#f5f5f5',
                            borderRadius: '3px',
                            fontSize: '13px',
                          }}
                        >
                          <div style={{ marginBottom: '5px', fontSize: '11px', color: '#666' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              backgroundColor: snippet.direction === 'OUTBOUND' ? '#2196f3' : '#4caf50',
                              color: 'white',
                              marginRight: '10px',
                            }}>
                              {snippet.direction}
                            </span>
                            {new Date(snippet.timestampMs).toLocaleString()} | {snippet.text.length} chars
                          </div>
                          <div style={{ 
                            whiteSpace: 'pre-wrap', 
                            wordBreak: 'break-word',
                            maxHeight: '150px',
                            overflow: 'auto',
                          }}>
                            {snippet.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {data.includedThreads.length > 10 && (
                <p style={{ marginTop: '20px', color: '#666', fontStyle: 'italic' }}>
                  Showing first 10 of {data.includedThreads.length} included threads
                </p>
              )}
            </>
          )}

          {data.excludedThreads && data.excludedThreads.length > 0 && (
            <details style={{ marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>
                Excluded Threads ({data.excludedThreads.length})
              </summary>
              <div style={{ marginTop: '10px', maxHeight: '400px', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Thread ID</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.excludedThreads.slice(0, 50).map((thread: any) => (
                      <tr key={thread.threadId}>
                        <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace', fontSize: '11px' }}>
                          {thread.threadId}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {thread.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.excludedThreads.length > 50 && (
                  <p style={{ marginTop: '10px', color: '#666', fontStyle: 'italic' }}>
                    Showing first 50 of {data.excludedThreads.length} excluded threads
                  </p>
                )}
              </div>
            </details>
          )}

          <details style={{ marginTop: '20px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Full JSON Response</summary>
            <pre style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', overflow: 'auto', maxHeight: '600px', border: '1px solid #ddd', borderRadius: '5px' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
