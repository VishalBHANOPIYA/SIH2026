import { useState } from 'react';
import { publicApi } from '../api/public';
import { useToastStore } from '../stores/toastStore';
import type { DocumentVersion } from '../types';

interface QrCodeModalProps {
  version: DocumentVersion;
  documentTitle: string;
  onClose: () => void;
}

export function QrCodeModal({ version, documentTitle, onClose }: QrCodeModalProps) {
  const { addToast } = useToastStore();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const code = version.verification_code || `VER-${version.id.toString().padStart(4, '0')}-${version.file_hash.slice(0, 8).toUpperCase()}`;
  const qrImageUrl = version.qr_url ? `/api${version.qr_url}` : publicApi.getQrImageUrl(code);
  const publicVerifyUrl = `${window.location.origin}/verify?code=${code}`;

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      addToast('info', 'Verification code copied to clipboard!');
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      addToast('info', 'Public verification URL copied to clipboard!');
    }
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `QR_Verify_${code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'QR Code PNG download started');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          boxShadow: 'var(--elevation-4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '1.25rem' }}>📱</span>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)' }}>
              Public Verification QR Code
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-ink-subtle)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Document Metadata Summary */}
        <div style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
            {documentTitle} (v{version.version_number})
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
            Scan to verify chain of custody integrity without logging in
          </div>
        </div>

        {/* Rendered QR Code */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'white',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-hairline)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <img
            src={qrImageUrl}
            alt={`Verification QR Code for ${code}`}
            style={{ width: '200px', height: '200px', objectFit: 'contain' }}
          />
        </div>

        {/* Verification Code Box */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)', marginBottom: '4px' }}>Verification Code</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
            }}
          >
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 'var(--text-sm)', color: 'var(--color-fin-orange)' }}>
              {code}
            </span>
            <button
              onClick={() => copyToClipboard(code, 'code')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-ink)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              {copiedCode ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <button onClick={handleDownloadQr} className="btn-primary" style={{ width: '100%', backgroundColor: 'var(--color-ink)' }}>
            📥 Download QR Code PNG
          </button>
          <button
            onClick={() => copyToClipboard(publicVerifyUrl, 'link')}
            className="btn-secondary"
            style={{ width: '100%' }}
          >
            🔗 {copiedLink ? 'Link Copied!' : 'Copy Public Verify Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
