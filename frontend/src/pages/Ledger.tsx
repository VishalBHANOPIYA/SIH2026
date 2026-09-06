import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ledgerApi, type LedgerTransactionItem, type VerifyChainResult } from '../api/ledger';
import { useToastStore } from '../stores/toastStore';
import { SkeletonRow, EmptyState } from '../components/Skeleton';

const eventTypeStyles: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  document_uploaded: { label: 'DOCUMENT UPLOADED', bg: 'rgba(59,130,246,0.15)', color: '#60A5FA', icon: '📤' },
  version_uploaded: { label: 'VERSION REVISED', bg: 'rgba(249,115,22,0.15)', color: '#FB923C', icon: '🔄' },
  document_signed: { label: 'RSA SIGNED', bg: 'rgba(34,197,94,0.15)', color: '#4ADE80', icon: '✍️' },
  share_created: { label: 'PERMIT SHARED', bg: 'rgba(139,92,246,0.15)', color: '#A78BFA', icon: '🔑' },
  access_denied: { label: 'ACCESS DENIED', bg: 'rgba(239,68,68,0.15)', color: '#F87171', icon: '🛑' },
};

export function LedgerPage() {
  const { addToast } = useToastStore();
  const [verifyResult, setVerifyResult] = useState<VerifyChainResult | null>(null);

  // Fetch full ledger chain
  const { data: chain = [], isLoading, error } = useQuery({
    queryKey: ['ledgerChain'],
    queryFn: ledgerApi.getLedgerChain,
  });

  // Verify chain mutation
  const verifyMutation = useMutation({
    mutationFn: ledgerApi.verifyChain,
    onSuccess: (res) => {
      setVerifyResult(res);
      if (res.intact) {
        addToast('success', `Ledger verification clean! ${res.total_blocks} blocks verified.`);
      } else {
        addToast('error', `Cryptographic discrepancy at Block #${res.broken_index}!`);
      }
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Verification failed');
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast('info', `${label} copied to clipboard`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Explorer Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
            <h1 className="card-title" style={{ fontSize: 'var(--text-2xl)' }}>
              Cryptographic Ledger Explorer
            </h1>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'bold',
                color: 'var(--color-fin-orange)',
                backgroundColor: 'rgba(249,115,22,0.15)',
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-full)',
              }}
            >
              🔗 Permissioned Hash Chain
            </span>
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Immutable event hash chain providing tamper evidence & audit verification
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => verifyMutation.mutate()}
          disabled={verifyMutation.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <span>🛡️</span>
          <span>{verifyMutation.isPending ? 'Verifying Chain...' : 'Verify Chain Integrity'}</span>
        </button>
      </div>

      {/* Production Architecture Comment Banner */}
      <div
        style={{
          padding: 'var(--space-4) var(--space-6)',
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--radius-lg)',
          fontFamily: 'monospace',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-ink-muted)',
          lineHeight: 'var(--leading-relaxed)',
        }}
      >
        <span style={{ color: 'var(--color-fin-orange)', fontWeight: 'bold' }}>/* ARCHITECTURE NOTE:</span> In production, these hashes would be anchored on Hyperledger Fabric per the Problem Statement's recommended architecture — this table simulates that permissioned ledger's cryptographic guarantees for the prototype. <span style={{ color: 'var(--color-fin-orange)', fontWeight: 'bold' }}>*/</span>
      </div>

      {/* Verification Results Banner */}
      {verifyResult && (
        <div
          style={{
            padding: 'var(--space-5) var(--space-6)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: verifyResult.intact ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${verifyResult.intact ? '#22C55E' : '#EF4444'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'slideInRight 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: verifyResult.intact ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                color: verifyResult.intact ? '#22C55E' : '#EF4444',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {verifyResult.intact ? '✓' : '⚠️'}
            </div>

            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: verifyResult.intact ? '#22C55E' : '#EF4444' }}>
                {verifyResult.intact ? 'Ledger Chain Intact' : 'Tamper Detected in Ledger Chain!'}
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                {verifyResult.message || verifyResult.reason}
              </p>
            </div>
          </div>

          {verifyResult.intact && (
            <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--color-ink-subtle)' }}>
              Genesis: {verifyResult.genesis_hash?.slice(0, 10)}...
            </span>
          )}
        </div>
      )}

      {/* Blockchain Timeline View */}
      {isLoading ? (
        <SkeletonRow count={5} />
      ) : error ? (
        <div
          style={{
            padding: 'var(--space-6)',
            backgroundColor: 'rgba(239,68,68,0.1)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-error)',
          }}
        >
          Failed to load ledger chain.
        </div>
      ) : chain.length === 0 ? (
        <EmptyState
          icon="🔗"
          title="No Ledger Transactions Yet"
          description="Upload evidence documents or sign files to generate your first immutable block in the SHA-256 permissioned hash chain."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {chain.map((tx: LedgerTransactionItem, index: number) => {
            const style = eventTypeStyles[tx.event_type] || {
              label: tx.event_type.toUpperCase(),
              bg: 'rgba(113,113,122,0.15)',
              color: '#A1A1AA',
              icon: '⚡',
            };
            const isGenesis = index === 0;
            const truncChainHash = `${tx.chain_hash.slice(0, 12)}...${tx.chain_hash.slice(-12)}`;
            const truncDataHash = `${tx.data_hash.slice(0, 8)}...${tx.data_hash.slice(-8)}`;
            const truncPrevHash = tx.prev_hash ? `${tx.prev_hash.slice(0, 8)}...${tx.prev_hash.slice(-8)}` : 'GENESIS_ZERO';

            const isBroken =
              verifyResult && !verifyResult.intact && verifyResult.broken_index === index;

            return (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  gap: 'var(--space-6)',
                  position: 'relative',
                  paddingBottom: index < chain.length - 1 ? 'var(--space-6)' : '0',
                }}
              >
                {/* Vertical Connector Line */}
                {index < chain.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '20px',
                      top: '40px',
                      bottom: 0,
                      width: '2px',
                      backgroundColor: 'var(--color-hairline)',
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Block Node Icon */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isBroken ? 'rgba(239,68,68,0.2)' : isGenesis ? 'var(--color-fin-orange)' : 'var(--color-surface-2)',
                    border: `2px solid ${isBroken ? '#EF4444' : isGenesis ? 'var(--color-fin-orange)' : 'var(--color-hairline)'}`,
                    color: isGenesis ? 'white' : 'var(--color-ink)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    boxShadow: 'var(--elevation-1)',
                  }}
                >
                  #{index}
                </div>

                {/* Block Card */}
                <div
                  className="feature-card"
                  style={{
                    flex: 1,
                    backgroundColor: isBroken ? 'rgba(239,68,68,0.05)' : 'var(--color-surface-1)',
                    border: `1px solid ${isBroken ? '#EF4444' : 'var(--color-hairline)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                  }}
                >
                  {/* Block Header */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'bold',
                          color: style.color,
                          backgroundColor: style.bg,
                          padding: 'var(--space-1) var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--space-1)',
                        }}
                      >
                        <span>{style.icon}</span>
                        <span>{style.label}</span>
                      </span>

                      {isGenesis && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            backgroundColor: 'rgba(249,115,22,0.2)',
                            color: 'var(--color-fin-orange)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                          }}
                        >
                          GENESIS BLOCK
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>
                      {new Date(tx.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {/* Hashes Section (Monospace) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: 'var(--space-3)',
                      backgroundColor: 'var(--color-surface-2)',
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {/* Chain Hash */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '2px' }}>
                        CHAIN HASH (SHA-256)
                      </span>
                      <code
                        title={`Full Chain Hash:\n${tx.chain_hash}\nClick to copy`}
                        onClick={() => copyToClipboard(tx.chain_hash, 'Chain Hash')}
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontFamily: 'monospace',
                          color: 'var(--color-fin-orange)',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        {truncChainHash} 📋
                      </code>
                    </div>

                    {/* Prev Hash */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '2px' }}>
                        PREVIOUS BLOCK HASH
                      </span>
                      <code
                        title={`Previous Hash:\n${tx.prev_hash || 'GENESIS'}\nClick to copy`}
                        onClick={() => copyToClipboard(tx.prev_hash || '0', 'Previous Hash')}
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontFamily: 'monospace',
                          color: 'var(--color-ink-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        {truncPrevHash}
                      </code>
                    </div>

                    {/* Data Hash */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '2px' }}>
                        PAYLOAD DATA HASH
                      </span>
                      <code
                        title={`Payload Hash:\n${tx.data_hash}\nClick to copy`}
                        onClick={() => copyToClipboard(tx.data_hash, 'Payload Data Hash')}
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontFamily: 'monospace',
                          color: 'var(--color-ink-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        {truncDataHash}
                      </code>
                    </div>
                  </div>

                  {/* Block Footer: Actor Roster */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span>Recorded by</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-ink)' }}>{tx.actor.full_name}</span>
                      <span>({tx.actor.role.toUpperCase()} — {tx.actor.department || 'DMS'})</span>
                    </div>

                    <span>Doc Version ID: #{tx.document_version_id}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
