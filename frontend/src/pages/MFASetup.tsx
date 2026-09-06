import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput } from '../components/TextInput';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { api } from '../api/client';
import type { MFASetupResponse, TokenResponse } from '../types';

export function MFASetupPage() {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const { challengeToken, setAuth } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!challengeToken) {
      navigate('/login');
      return;
    }
    setupMFA();
  }, []);

  const setupMFA = async () => {
    setLoading(true);
    try {
      const data = await api.post<MFASetupResponse>('/auth/mfa/setup', {
        challenge_token: challengeToken,
      });
      setQrCode(data.qr_code_base64);
      setSecret(data.secret);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to set up MFA');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const data = await api.post<TokenResponse>('/auth/mfa/verify', {
        challenge_token: challengeToken,
        code,
      });
      setAuth(data.user, data.access_token, data.refresh_token);
      addToast('success', 'MFA configured successfully. Welcome!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-canvas)',
        padding: 'var(--space-4)',
      }}
    >
      <div className="feature-card" style={{ width: '100%', maxWidth: '460px' }}>
        <h1 className="card-title" style={{ marginBottom: 'var(--space-1)' }}>Set Up Two-Factor Authentication</h1>
        <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
          Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-ink-subtle)' }}>
            Generating QR code...
          </div>
        ) : (
          <>
            {/* QR Code */}
            {qrCode && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-6)',
                  padding: 'var(--space-4)',
                  backgroundColor: 'white',
                  borderRadius: 'var(--radius-lg)',
                  width: 'fit-content',
                  margin: '0 auto var(--space-6)',
                }}
              >
                <img
                  src={`data:image/png;base64,${qrCode}`}
                  alt="MFA QR Code"
                  style={{ width: '200px', height: '200px' }}
                />
              </div>
            )}

            {/* Manual entry secret */}
            {secret && (
              <div
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-6)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginBottom: 'var(--space-1)' }}>
                  Or enter this key manually:
                </div>
                <code
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-fin-orange)',
                    letterSpacing: '2px',
                  }}
                >
                  {secret}
                </code>
              </div>
            )}

            {/* Verification form */}
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <TextInput
                label="Verification Code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                error={error}
                helperText="Enter the 6-digit code from your authenticator app"
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: 'var(--text-2xl)' }}
              />

              <button
                type="submit"
                className="btn-primary"
                disabled={verifying || code.length !== 6}
              >
                {verifying ? 'Verifying...' : 'Verify & Complete Setup'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
