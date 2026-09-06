import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput } from '../components/TextInput';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { api } from '../api/client';
import type { LoginResponse } from '../types';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setChallenge } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password });
      setChallenge(data.challenge_token, data.mfa_setup_required);

      if (data.mfa_setup_required) {
        navigate('/mfa-setup');
      } else {
        navigate('/mfa-verify');
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      setError(msg);
      addToast('error', msg);
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
      <div
        className="feature-card"
        style={{ width: '100%', maxWidth: '420px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-fin-orange)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'white',
              marginBottom: 'var(--space-4)',
            }}
          >
            SC
          </div>
          <h1 className="card-title" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}>
            SecureCase DMS
          </h1>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Secure Digital Document Management System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <TextInput
            label="Email"
            type="email"
            placeholder="name@securecase.gov.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            helperText="Use your registered government email"
          />
          <TextInput
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div
              style={{
                padding: 'var(--space-3)',
                backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-error)',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p
          style={{
            marginTop: 'var(--space-6)',
            textAlign: 'center',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-ink-tertiary)',
          }}
        >
          SIH 2026 • PS 26190 • Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}
