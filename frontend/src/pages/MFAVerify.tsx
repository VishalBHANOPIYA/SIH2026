import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput } from '../components/TextInput';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { api } from '../api/client';
import type { TokenResponse } from '../types';

export function MFAVerifyPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { challengeToken, setAuth } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  if (!challengeToken) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<TokenResponse>('/auth/mfa/verify', {
        challenge_token: challengeToken,
        code,
      });
      setAuth(data.user, data.access_token, data.refresh_token);
      addToast('success', `Welcome back, ${data.user.full_name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid MFA code');
    } finally {
      setLoading(false);
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
      <div className="feature-card" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-surface-2)',
              border: '2px solid var(--color-fin-orange)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-xl)',
              marginBottom: 'var(--space-4)',
            }}
          >
            🔐
          </div>
          <h1 className="card-title">Two-Factor Authentication</h1>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <TextInput
            type="text"
            inputMode="numeric"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            error={error}
            autoFocus
          />

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || code.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
