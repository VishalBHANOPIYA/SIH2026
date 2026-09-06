import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, helperText, style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', ...style }}>
        {label && (
          <label
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-family)',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          style={{
            width: '100%',
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-surface-2)',
            border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-hairline)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-ink)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-family)',
            outline: 'none',
            transition: 'border-color var(--transition-fast)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--color-fin-orange)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? 'var(--color-error)' : 'var(--color-hairline)';
          }}
          {...props}
        />
        {helperText && !error && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-family)' }}>
            {helperText}
          </span>
        )}
        {error && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontFamily: 'var(--font-family)' }}>
            {error}
          </span>
        )}
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';
