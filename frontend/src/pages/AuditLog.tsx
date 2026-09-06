import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/audit';
import type { AuditFilterParams } from '../api/audit';
import { casesApi } from '../api/cases';
import { SkeletonRow, EmptyState } from '../components/Skeleton';
import type { AuditEventItem } from '../types';

const ACTION_ICONS: Record<string, string> = {
  login: '🔑',
  'login-failed': '⚠️',
  'mfa-verify': '🛡️',
  CREATE_CASE: '📁',
  UPDATE_CASE_STATUS: '🔄',
  ASSIGN_USER: '👤',
  REMOVE_USER: '🚫',
  UPLOAD_DOCUMENT: '📄',
  UPLOAD_DOCUMENT_VERSION: '⬆️',
  DOWNLOAD_DOCUMENT_VERSION: '📥',
  SIGN_DOCUMENT_VERSION: '✍️',
  VERIFY_DOCUMENT_VERSION: '🔍',
  SHARE_DOCUMENT: '🔗',
  REVOKE_SHARE: '🔒',
};

export function AuditLogPage() {
  const [filters, setFilters] = useState<AuditFilterParams>({
    page: 1,
    limit: 20,
    action: '',
    outcome: '',
    case_id: undefined,
    user_id: undefined,
    from: '',
    to: '',
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => auditApi.getLogs(filters),
  });

  // Fetch assignable users for filter dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['assignableUsers'],
    queryFn: casesApi.getAssignableUsers,
  });

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleExportCsv = () => {
    const url = auditApi.exportCsvUrl(filters);
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header & Export Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-ink)' }}>
            System Audit Log
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-subtle)', marginTop: 'var(--space-1)' }}>
            Immutable, tamper-evident security audit trail for all system activities and document access.
          </p>
        </div>

        <button onClick={handleExportCsv} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          📊 Export CSV Report
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-4)',
          alignItems: 'end',
        }}
      >
        {/* Action Search */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>
            Action
          </label>
          <input
            type="text"
            placeholder="Search action..."
            value={filters.action || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value, page: 1 }))}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
            }}
          />
        </div>

        {/* User Filter */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>
            Actor User
          </label>
          <select
            value={filters.user_id || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, user_id: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
            }}
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* Outcome Filter */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>
            Outcome
          </label>
          <select
            value={filters.outcome || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, outcome: e.target.value, page: 1 }))}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
            }}
          >
            <option value="">All Outcomes</option>
            <option value="success">Success</option>
            <option value="denied">Denied</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>
            From Date
          </label>
          <input
            type="date"
            value={filters.from || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value, page: 1 }))}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
            }}
          />
        </div>

        {/* Date To */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>
            To Date
          </label>
          <input
            type="date"
            value={filters.to || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value, page: 1 }))}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Dense Audit Table */}
      <div
        style={{
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <SkeletonRow count={6} />
          </div>
        ) : isError ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-error)' }}>
            Failed to load audit logs. Please try again.
          </div>
        ) : !data || data.items.length === 0 ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <EmptyState
              icon="🛡️"
              title="No Audit Logs Found"
              description="No security audit events match your selected filters. Try clearing your search parameters."
            />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--color-hairline)',
                  backgroundColor: 'var(--color-surface-2)',
                  color: 'var(--color-ink-muted)',
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Timestamp</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Actor</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Action</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Resource</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Outcome</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((ev) => (
                <AuditTableRow key={ev.id} ev={ev} />
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Bar */}
        {data && data.pages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-3) var(--space-4)',
              borderTop: '1px solid var(--color-hairline)',
              backgroundColor: 'var(--color-surface-2)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-ink-muted)',
            }}
          >
            <span>
              Page {data.page} of {data.pages} ({data.total} total logs)
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                className="btn-secondary"
                disabled={data.page <= 1}
                onClick={() => handlePageChange(data.page - 1)}
                style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}
              >
                Previous
              </button>
              <button
                className="btn-secondary"
                disabled={data.page >= data.pages}
                onClick={() => handlePageChange(data.page + 1)}
                style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AuditTableRow({ ev }: { ev: AuditEventItem }) {
  const icon = ACTION_ICONS[ev.action] || '⚡';
  const formattedTime = new Date(ev.timestamp).toLocaleString();
  const isSuccess = ev.outcome === 'success';

  return (
    <tr
      style={{
        borderBottom: '1px solid var(--color-hairline)',
        transition: 'background-color var(--transition-fast)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {/* Timestamp */}
      <td style={{ padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap', color: 'var(--color-ink-muted)', fontFamily: 'monospace' }}>
        {formattedTime}
      </td>

      {/* Actor */}
      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
        {ev.actor ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-fin-orange)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
              }}
            >
              {ev.actor.full_name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>{ev.actor.full_name}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>{ev.actor.email}</div>
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--color-ink-subtle)', fontStyle: 'italic' }}>System / User #{ev.actor_id}</span>
        )}
      </td>

      {/* Action */}
      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span>{icon}</span>
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>{ev.action}</span>
        </div>
      </td>

      {/* Resource */}
      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-ink-muted)' }}>
        <span style={{ textTransform: 'capitalize' }}>{ev.resource_type}</span> #{ev.resource_id}
      </td>

      {/* Outcome */}
      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-medium)',
            backgroundColor: isSuccess ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: isSuccess ? 'var(--color-success)' : 'var(--color-error)',
            border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {isSuccess ? '✓ Success' : '✕ Denied'}
        </span>
      </td>

      {/* IP Address */}
      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-ink-subtle)', fontFamily: 'monospace' }}>
        {ev.ip_address || '—'}
      </td>
    </tr>
  );
}
