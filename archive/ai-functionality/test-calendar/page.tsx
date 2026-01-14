'use client';

import { useState } from 'react';

export default function TestCalendarPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testCalendar = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('/api/data/calendar');
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
    <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Calendar API Test</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Tests <code>/api/data/calendar</code> endpoint with privacy-safe calendar events
      </p>
      
      <button
        onClick={testCalendar}
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
        {loading ? 'Loading...' : 'Test /api/data/calendar'}
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
            <p><strong>Total Events Fetched:</strong> {data.totalEvents}</p>
            <p><strong>Included Events:</strong> {data.includedEvents}</p>
            <p><strong>Excluded Events:</strong> {data.excludedEvents}</p>
            {data.claude && (
              <>
                <p><strong>Claude Batch Size:</strong> {data.claude.batchSize} events per batch</p>
                <p><strong>Number of Batches:</strong> {data.claude.batches?.length || 0}</p>
              </>
            )}
          </div>

          {data.events && data.events.length > 0 && (
            <>
              <h2>Events ({data.events.length})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                {data.events.slice(0, 20).map((event: any, idx: number) => (
                  <div
                    key={event.eventId}
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      padding: '15px',
                      backgroundColor: '#fff',
                    }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <strong>#{idx + 1} - {event.title || '(No title)'}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                      <div><strong>Event ID:</strong> {event.eventId.substring(0, 20)}...</div>
                      <div><strong>Duration:</strong> {event.durationMinutes} min {event.isAllDay && '(All Day)'}</div>
                      <div><strong>Start:</strong> {new Date(event.startIso).toLocaleString()}</div>
                      <div><strong>End:</strong> {new Date(event.endIso).toLocaleString()}</div>
                      <div><strong>Organizer:</strong> {event.organizerEmail || '(Self)'}</div>
                      <div><strong>Attendees:</strong> {event.attendeeCount}</div>
                      <div><strong>External Attendees:</strong> {event.hasExternalAttendees ? 'Yes' : 'No'}</div>
                      <div><strong>Recurring:</strong> {event.isRecurring ? 'Yes' : 'No'}</div>
                    </div>
                    {event.attendeeEmails && event.attendeeEmails.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px' }}>
                        <strong>Attendee Emails:</strong> {event.attendeeEmails.slice(0, 5).join(', ')}
                        {event.attendeeEmails.length > 5 && ` (+${event.attendeeEmails.length - 5} more)`}
                      </div>
                    )}
                    {event.description && (
                      <details style={{ marginTop: '10px' }}>
                        <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#666' }}>Description</summary>
                        <div style={{
                          marginTop: '5px',
                          padding: '10px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '3px',
                          fontSize: '12px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '150px',
                          overflow: 'auto',
                        }}>
                          {event.description}
                        </div>
                      </details>
                    )}
                    {event.recurrence && event.recurrence.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '10px' }}>
                        <strong>Recurrence Rules:</strong> {event.recurrence.join('; ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {data.events.length > 20 && (
                <p style={{ marginTop: '10px', color: '#666', fontStyle: 'italic' }}>
                  Showing first 20 of {data.events.length} events
                </p>
              )}
            </>
          )}

          {data.claude && data.claude.batches && data.claude.batches.length > 0 && (
            <details style={{ marginTop: '30px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>
                Claude Batches ({data.claude.batches.length})
              </summary>
              <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {data.claude.batches.map((batch: any, batchIdx: number) => (
                  <div
                    key={batch.batchId}
                    style={{
                      border: '2px solid #0070f3',
                      borderRadius: '5px',
                      padding: '15px',
                      backgroundColor: '#f0f7ff',
                    }}
                  >
                    <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '16px' }}>
                      {batch.batchId} ({batch.events.length} events)
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {batch.events.map((event: any, eventIdx: number) => (
                        <div
                          key={event.eventId}
                          style={{
                            padding: '10px',
                            backgroundColor: '#fff',
                            borderRadius: '3px',
                            border: '1px solid #ddd',
                          }}
                        >
                          <div style={{ marginBottom: '5px' }}>
                            <strong>{eventIdx + 1}. {event.title || '(No title)'}</strong>
                          </div>
                          <div style={{ fontSize: '11px', color: '#666', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                            <div>Duration: {event.durationMinutes} min</div>
                            <div>Attendees: {event.attendeeCount}</div>
                            <div>External: {event.hasExternalAttendees ? 'Yes' : 'No'}</div>
                            <div>Recurring: {event.isRecurring ? 'Yes' : 'No'}</div>
                            <div>Event ID: {event.eventId.substring(0, 15)}...</div>
                          </div>
                          {event.description && (
                            <details style={{ marginTop: '8px' }}>
                              <summary style={{ cursor: 'pointer', fontSize: '11px', color: '#666' }}>
                                Description ({event.description.length} chars)
                              </summary>
                              <div style={{
                                marginTop: '5px',
                                padding: '8px',
                                backgroundColor: '#f9f9f9',
                                borderRadius: '3px',
                                fontSize: '11px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: '100px',
                                overflow: 'auto',
                              }}>
                                {event.description}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          <details style={{ marginTop: '30px' }}>
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
