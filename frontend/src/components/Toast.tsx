import { useToastStore } from '../stores/toastStore';

const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(34,197,94,0.1)', border: 'var(--color-success)', icon: '✓' },
  error: { bg: 'rgba(239,68,68,0.1)', border: 'var(--color-error)', icon: '✕' },
  warning: { bg: 'rgba(234,179,8,0.1)', border: 'var(--color-warning)', icon: '⚠' },
  info: { bg: 'rgba(59,130,246,0.1)', border: 'var(--color-info)', icon: 'ℹ' },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  return (
    <div style={{ position: 'fixed', top: 'var(--space-4)', right: 'var(--space-4)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {toasts.map((toast) => {
        const s = typeStyles[toast.type] || typeStyles.info;
        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              background: s.bg,
              borderLeft: `3px solid ${s.border}`,
              backdropFilter: 'blur(12px)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
              minWidth: '280px',
              maxWidth: '400px',
              animation: 'slideInRight 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <span style={{ fontSize: 'var(--text-base)' }}>{s.icon}</span>
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
