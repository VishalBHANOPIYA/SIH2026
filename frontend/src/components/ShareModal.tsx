import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sharesApi } from '../api/shares';
import { casesApi } from '../api/cases';
import { TextInput } from './TextInput';
import { useToastStore } from '../stores/toastStore';
import type { DocumentItem, SharePermission, ShareItem } from '../types';

interface ShareModalProps {
  caseId: number;
  document: DocumentItem;
  isOpen: boolean;
  onClose: () => void;
}

const DEPARTMENTS = [
  'Cyber Crime Cell',
  'Forensics Lab',
  'Legal Division',
  'IT Administration',
  'Special Investigation Unit',
  'Homicide Bureau',
];

export function ShareModal({ caseId, document, isOpen, onClose }: ShareModalProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [shareType, setShareType] = useState<'user' | 'department'>('user');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(DEPARTMENTS[0]);
  const [permissionLevel, setPermissionLevel] = useState<SharePermission>('view_only');
  const [expiresAt, setExpiresAt] = useState('');

  // Fetch assignable users
  const { data: users = [] } = useQuery({
    queryKey: ['assignableUsers'],
    queryFn: casesApi.getAssignableUsers,
    enabled: isOpen,
  });

  // Fetch active shares for this document
  const { data: activeShares = [], isLoading: sharesLoading } = useQuery({
    queryKey: ['documentShares', document.id],
    queryFn: () => sharesApi.getDocumentShares(document.id),
    enabled: isOpen,
  });

  const createShareMutation = useMutation({
    mutationFn: () => {
      const payload = {
        document_id: document.id,
        recipient_id: shareType === 'user' ? (selectedUserId as number) : undefined,
        recipient_department: shareType === 'department' ? selectedDepartment : undefined,
        permission_level: permissionLevel,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      };
      return sharesApi.createShare(caseId, payload);
    },
    onSuccess: () => {
      addToast('success', 'Document shared successfully!');
      queryClient.invalidateQueries({ queryKey: ['documentShares', document.id] });
      queryClient.invalidateQueries({ queryKey: ['mySharedDocuments'] });
      setSelectedUserId('');
      setExpiresAt('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to share document');
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: (shareId: number) => sharesApi.revokeShare(shareId),
    onSuccess: () => {
      addToast('info', 'Share access revoked');
      queryClient.invalidateQueries({ queryKey: ['documentShares', document.id] });
      queryClient.invalidateQueries({ queryKey: ['mySharedDocuments'] });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to revoke share');
    },
  });

  const handleShareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shareType === 'user' && !selectedUserId) {
      addToast('warning', 'Please select a recipient user');
      return;
    }
    createShareMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
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
          maxWidth: '560px',
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          boxShadow: 'var(--elevation-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)' }}>
              Share Document
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)', marginTop: '2px' }}>
              {document.title}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-ink-muted)',
              cursor: 'pointer',
              fontSize: 'var(--text-xl)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Share Form */}
        <form onSubmit={handleShareSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Share Target Type Toggle */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>
              Share With
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className={shareType === 'user' ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1, padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-xs)' }}
                onClick={() => setShareType('user')}
              >
                👤 Specific Officer / User
              </button>
              <button
                type="button"
                className={shareType === 'department' ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1, padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-xs)' }}
                onClick={() => setShareType('department')}
              >
                🏢 Whole Department
              </button>
            </div>
          </div>

          {/* Recipient Selection */}
          {shareType === 'user' ? (
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Select User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                style={{
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-ink)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              >
                <option value="">-- Choose Officer --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role.toUpperCase()} — {u.department || 'General'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Select Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-ink)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Permission Level */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>
              Permission Granted
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  backgroundColor: permissionLevel === 'view_only' ? 'rgba(59,130,246,0.12)' : 'var(--color-surface-2)',
                  border: `1px solid ${permissionLevel === 'view_only' ? 'var(--color-info)' : 'var(--color-hairline)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-ink)',
                }}
              >
                <input
                  type="radio"
                  name="perm"
                  checked={permissionLevel === 'view_only'}
                  onChange={() => setPermissionLevel('view_only')}
                />
                👁️ View Only
              </label>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  backgroundColor: permissionLevel === 'download' ? 'rgba(34,197,94,0.12)' : 'var(--color-surface-2)',
                  border: `1px solid ${permissionLevel === 'download' ? 'var(--color-success)' : 'var(--color-hairline)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-ink)',
                }}
              >
                <input
                  type="radio"
                  name="perm"
                  checked={permissionLevel === 'download'}
                  onChange={() => setPermissionLevel('download')}
                />
                📥 View & Download
              </label>
            </div>
          </div>

          {/* Expiry Date */}
          <TextInput
            label="Optional Expiry Date & Time"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            helperText="Leave empty for permanent share access until manually revoked"
          />

          <button
            type="submit"
            className="btn-primary"
            disabled={createShareMutation.isPending}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {createShareMutation.isPending ? 'Granting Access...' : '🔒 Share Document'}
          </button>
        </form>

        {/* Active Shares List with Countdown Timers */}
        <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 'var(--space-4)' }}>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)', marginBottom: 'var(--space-3)' }}>
            Active Access Shares
          </h4>

          {sharesLoading ? (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>Loading active shares...</div>
          ) : activeShares.length === 0 ? (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)', fontStyle: 'italic' }}>
              No external shares created for this document yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {activeShares.map((s) => (
                <ShareRow key={s.id} share={s} onRevoke={() => revokeShareMutation.mutate(s.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareRow({ share, onRevoke }: { share: ShareItem; onRevoke: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!share.expires_at) {
      setTimeLeft('Never expires');
      return;
    }

    const updateTimer = () => {
      const target = new Date(share.expires_at!).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        if (hours > 24) {
          const days = Math.floor(hours / 24);
          setTimeLeft(`Expires in ${days}d ${hours % 24}h`);
        } else {
          setTimeLeft(`Expires in ${hours}h ${mins}m ${secs}s`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [share.expires_at]);

  const recipientLabel = share.recipient
    ? share.recipient.full_name
    : share.recipient_department
    ? `🏢 ${share.recipient_department}`
    : 'Unknown';

  const isExpired = timeLeft === 'Expired' || share.status === 'expired';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3)',
        backgroundColor: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-hairline)',
        opacity: isExpired ? 0.6 : 1,
      }}
    >
      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
          {recipientLabel}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginTop: '2px' }}>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: share.permission_level === 'download' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
              color: share.permission_level === 'download' ? 'var(--color-success)' : 'var(--color-info)',
            }}
          >
            {share.permission_level === 'download' ? 'View & Download' : 'View Only'}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: isExpired ? 'var(--color-error)' : 'var(--color-ink-subtle)' }}>
            ⏳ {timeLeft}
          </span>
        </div>
      </div>
      {!isExpired && (
        <button
          onClick={onRevoke}
          className="btn-secondary"
          style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}
        >
          Revoke
        </button>
      )}
    </div>
  );
}
