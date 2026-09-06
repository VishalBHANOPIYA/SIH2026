export function SkeletonCard({ height = '120px' }: { height?: string }) {
  return (
    <div
      style={{
        height,
        width: '100%',
        backgroundColor: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-hairline)',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="skeleton-shimmer"
    />
  );
}

export function SkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '48px',
            width: '100%',
            backgroundColor: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-hairline)',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="skeleton-shimmer"
        />
      ))}
    </div>
  );
}

export function SkeletonChart({ height = '260px' }: { height?: string }) {
  return (
    <div
      style={{
        height,
        width: '100%',
        backgroundColor: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-hairline)',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="skeleton-shimmer"
    />
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '📭', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: 'var(--space-8) var(--space-6)',
        textAlign: 'center',
        backgroundColor: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-xl)',
        border: '1px dashed var(--color-hairline)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}
    >
      <span style={{ fontSize: '2.5rem' }}>{icon}</span>
      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)' }}>
        {title}
      </h3>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)', maxWidth: '380px' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary" style={{ marginTop: 'var(--space-2)' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
