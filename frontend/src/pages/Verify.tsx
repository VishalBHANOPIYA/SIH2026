import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { publicApi } from '../api/public';
import type { PublicVerificationResult } from '../types';

export function VerifyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicVerificationResult | null>(null);

  const performVerification = async (verifyCode: string) => {
    if (!verifyCode.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await publicApi.verifyCode(verifyCode);
      setResult(res);
    } catch {
      setResult({
        verified: false,
        message: 'Failed to communicate with verification server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialCode = searchParams.get('code');
    if (initialCode) {
      setCode(initialCode);
      performVerification(initialCode);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSearchParams({ code: code.trim() });
    performVerification(code);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-canvas)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Top Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)', maxWidth: '560px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--color-ink)',
            color: 'white',
            fontSize: '1.75rem',
            marginBottom: 'var(--space-4)',
            boxShadow: 'var(--elevation-2)',
          }}
        >
          🛡️
        </div>
        <h1
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-ink)',
            letterSpacing: '-0.8px',
            marginBottom: 'var(--space-2)',
          }}
        >
          SecureCase DMS
        </h1>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-muted)' }}>
          Public Tamper-Evident Ledger Verification Portal
        </p>
      </div>

      {/* Centered Product Mockup Card */}
      <div
        className="feature-card"
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--color-surface-1)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-hairline)',
          padding: 'var(--space-8)',
          boxShadow: 'var(--elevation-3)',
        }}
      >
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h2
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-ink)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Verify Document Authenticity
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-subtle)' }}>
            Enter a verification code (e.g. <code style={{ color: 'var(--color-fin-orange)', background: 'var(--color-surface-2)', padding: '2px 6px', borderRadius: '4px' }}>VER-8A3F9D2B</code>) or SHA-256 hash to verify chain of custody integrity.
          </p>
        </div>

        {/* Verification Code Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Paste verification code or SHA-256 hash..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-hairline)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-ink)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'monospace',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-fin-orange)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-hairline)')}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="btn-primary"
            style={{
              padding: '0 var(--space-6)',
              height: '44px',
              backgroundColor: 'var(--color-ink)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              fontWeight: 'var(--font-weight-medium)',
              fontSize: 'var(--text-sm)',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Verifying...' : 'Verify Ledger'}
          </button>
        </form>

        {/* Verification Result Display */}
        {result && (
          <div>
            {result.verified ? (
              /* Verified State (Green) */
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-6)',
                  marginBottom: 'var(--space-6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-success)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)', margin: 0 }}>
                      Verified — Integrity Intact
                    </h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', margin: 0 }}>
                      Document digest matches the immutable permissioned ledger block.
                    </p>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 'var(--space-3)',
                    backgroundColor: 'var(--color-surface-1)',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-4)',
                    marginTop: 'var(--space-4)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>Case Number</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)' }}>
                      {result.case_number || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>Document Type</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)', textTransform: 'capitalize' }}>
                      {result.doc_type ? result.doc_type.replace('_', ' ') : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>Version & Status</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)' }}>
                      v{result.version_number} ({result.status})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>Ledger Position</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-fin-orange)' }}>
                      {result.ledger_block_count ? `${result.ledger_block_count} Block(s) Linked` : 'Verified Record'}
                    </div>
                  </div>
                </div>

                {/* SHA-256 Hash Box */}
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)', marginBottom: '4px' }}>SHA-256 File Digest</div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: 'var(--color-ink)',
                      backgroundColor: 'var(--color-surface-2)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      wordBreak: 'break-all',
                      border: '1px solid var(--color-hairline)',
                    }}
                  >
                    {result.file_hash}
                  </div>
                </div>

                {/* Redacted Event Timeline */}
                {result.timeline && result.timeline.length > 0 && (
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-3)' }}>
                      Redacted Chain of Custody Timeline ({result.timeline.length} Events)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {result.timeline.map((evt, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: 'var(--color-surface-1)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-hairline)',
                            fontSize: 'var(--text-xs)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span style={{ color: 'var(--color-fin-orange)', fontWeight: 'bold' }}>#{idx + 1}</span>
                            <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)', textTransform: 'capitalize' }}>
                              {evt.event_type.replace('_', ' ')}
                            </span>
                          </div>
                          <div style={{ color: 'var(--color-ink-subtle)', fontFamily: 'monospace' }}>
                            {new Date(evt.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-ink-tertiary)', marginTop: 'var(--space-2)', fontStyle: 'italic' }}>
                      * Note: Public verification displays immutable ledger metadata only. Personal information and file contents remain restricted.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Mismatch State (Red) */
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-6)',
                  marginBottom: 'var(--space-6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-error)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                    }}
                  >
                    ✕
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-error)', margin: 0 }}>
                      Mismatch Detected — Unverified / Tampered
                    </h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                      {result.message || 'No matching document record was found in the permissioned ledger.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        <div style={{ textAlign: 'center', borderTop: '1px solid var(--color-hairline)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Link
            to="/login"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-ink-muted)',
              textDecoration: 'none',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            ← Back to Officer Portal Login
          </Link>
        </div>
      </div>
    </div>
  );
}
