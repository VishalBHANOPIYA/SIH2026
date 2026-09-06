import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { casesApi } from '../api/cases';
import { TextInput } from '../components/TextInput';
import { useToastStore } from '../stores/toastStore';
import type { Case, CaseClassification, CaseStatus } from '../types';

const statusConfig: Record<CaseStatus, { label: string; bg: string; color: string; border: string }> = {
  open: { label: 'Open', bg: 'rgba(34,197,94,0.12)', color: '#22C55E', border: 'rgba(34,197,94,0.3)' },
  under_investigation: { label: 'In Progress', bg: 'rgba(249,115,22,0.12)', color: '#F97316', border: 'rgba(249,115,22,0.3)' },
  closed: { label: 'Closed', bg: 'rgba(113,113,122,0.12)', color: '#A1A1AA', border: 'rgba(113,113,122,0.3)' },
  archived: { label: 'Archived', bg: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: 'rgba(139,92,246,0.3)' },
};

const classificationConfig: Record<CaseClassification, { label: string; bg: string; color: string; icon: string }> = {
  confidential: { label: 'Confidential', bg: 'rgba(239,68,68,0.12)', color: '#F87171', icon: '🔒' },
  restricted: { label: 'Restricted', bg: 'rgba(234,179,8,0.12)', color: '#FACC15', icon: '⚠️' },
  internal: { label: 'Internal', bg: 'rgba(59,130,246,0.12)', color: '#60A5FA', icon: '📁' },
};

export function CasesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Cybercrime');
  const [newClassification, setNewClassification] = useState<CaseClassification>('confidential');
  const [newCaseNumber, setNewCaseNumber] = useState('');

  // Query cases
  const { data: cases = [], isLoading, error } = useQuery({
    queryKey: ['cases', statusFilter, classificationFilter, assignedToMe, search],
    queryFn: () =>
      casesApi.getCases({
        status: statusFilter || undefined,
        classification: classificationFilter || undefined,
        assigned_to_me: assignedToMe,
        search: search || undefined,
      }),
  });

  // Create case mutation
  const createMutation = useMutation({
    mutationFn: casesApi.createCase,
    onSuccess: (createdCase) => {
      addToast('success', `Case ${createdCase.case_number} created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setIsModalOpen(false);
      setNewTitle('');
      setNewCaseNumber('');
      navigate(`/cases/${createdCase.id}`);
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to create case');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      case_type: newType,
      classification: newClassification,
      case_number: newCaseNumber.trim() || undefined,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="card-title" style={{ fontSize: 'var(--text-2xl)' }}>
            Case Repository
          </h1>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            Secure digital investigation cases, assignments & document vaults
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <span>＋</span>
          <span>New Case</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div
        className="feature-card"
        style={{
          padding: 'var(--space-4)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          alignItems: 'center',
        }}
      >
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: '240px' }}>
          <TextInput
            placeholder="Search by case #, title or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-ink)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="under_investigation">In Progress</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>

        {/* Classification Filter */}
        <select
          value={classificationFilter}
          onChange={(e) => setClassificationFilter(e.target.value)}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-ink)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">All Classifications</option>
          <option value="confidential">Confidential</option>
          <option value="restricted">Restricted</option>
          <option value="internal">Internal</option>
        </select>

        {/* Assigned to Me Toggle */}
        <button
          className={assignedToMe ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setAssignedToMe(!assignedToMe)}
          style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-3) var(--space-4)' }}
        >
          {assignedToMe ? '✓ Assigned to Me' : 'Assigned to Me'}
        </button>
      </div>

      {/* Cases Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-ink-subtle)' }}>
          Loading case repository...
        </div>
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
          Failed to load cases. Please try again.
        </div>
      ) : cases.length === 0 ? (
        <div
          className="feature-card"
          style={{ textAlign: 'center', padding: 'var(--space-12)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}
        >
          <div style={{ fontSize: '3rem' }}>📂</div>
          <h3 className="card-title">No cases found</h3>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            {search || statusFilter || classificationFilter || assignedToMe
              ? 'No cases match your active filters. Try clearing filters.'
              : 'Create your first digital investigation case to get started.'}
          </p>
          {!search && !statusFilter && (
            <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ marginTop: 'var(--space-2)' }}>
              ＋ Create First Case
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {cases.map((c: Case) => {
            const statusStyle = statusConfig[c.status] || statusConfig.open;
            const classStyle = classificationConfig[c.classification] || classificationConfig.internal;

            return (
              <div
                key={c.id}
                className="feature-card"
                onClick={() => navigate(`/cases/${c.id}`)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontFamily: 'monospace',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-fin-orange)',
                      backgroundColor: 'rgba(249,115,22,0.1)',
                      padding: 'var(--space-1) var(--space-2)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {c.case_number}
                  </span>

                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: classStyle.color,
                      backgroundColor: classStyle.bg,
                      padding: 'var(--space-1) var(--space-2)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                    }}
                  >
                    <span>{classStyle.icon}</span>
                    <span>{classStyle.label}</span>
                  </span>
                </div>

                {/* Case Title & Type */}
                <div>
                  <h3
                    className="card-title"
                    style={{
                      fontSize: 'var(--text-lg)',
                      marginBottom: 'var(--space-2)',
                      lineHeight: 'var(--leading-tight)',
                    }}
                  >
                    {c.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-ink-muted)',
                        backgroundColor: 'var(--color-surface-2)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-hairline)',
                      }}
                    >
                      {c.case_type}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: statusStyle.color,
                        backgroundColor: statusStyle.bg,
                        border: `1px solid ${statusStyle.border}`,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      ● {statusStyle.label}
                    </span>
                  </div>
                </div>

                {/* Footer: Assigned Avatars & Stats */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingTop: 'var(--space-3)',
                    borderTop: '1px solid var(--color-hairline)',
                  }}
                >
                  {/* Officers Avatars */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {c.assignments && c.assignments.length > 0 ? (
                      c.assignments.slice(0, 4).map((a, idx) => {
                        const initials = a.user.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();
                        return (
                          <div
                            key={a.id}
                            title={`${a.user.full_name} (${a.assigned_role})`}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: idx % 2 === 0 ? 'var(--color-fin-orange)' : '#3B82F6',
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px solid var(--color-surface-1)',
                              marginLeft: idx > 0 ? '-8px' : '0',
                            }}
                          >
                            {initials}
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>
                        Unassigned
                      </span>
                    )}
                    {c.assignments && c.assignments.length > 4 && (
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--color-surface-2)',
                          color: 'var(--color-ink-muted)',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid var(--color-surface-1)',
                          marginLeft: '-8px',
                        }}
                      >
                        +{c.assignments.length - 4}
                      </div>
                    )}
                  </div>

                  {/* Document Count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                    <span>📄</span>
                    <span>{c.document_count} {c.document_count === 1 ? 'doc' : 'docs'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Case Form */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="feature-card"
            style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--color-surface-1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
              <div>
                <h2 className="card-title" style={{ fontSize: 'var(--text-xl)' }}>
                  Create Investigation Case
                </h2>
                <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                  Initialize a secure case container for evidence and legal documents
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-ink-muted)',
                  fontSize: 'var(--text-lg)',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <TextInput
                label="Case Title"
                placeholder="e.g. Operation Cyber Shield - Exfiltration Investigation"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                autoFocus
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
                    Case Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      backgroundColor: 'var(--color-surface-2)',
                      border: '1px solid var(--color-hairline)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-ink)',
                      fontSize: 'var(--text-sm)',
                      outline: 'none',
                    }}
                  >
                    <option value="Cybercrime">Cybercrime</option>
                    <option value="Financial Fraud">Financial Fraud</option>
                    <option value="Forensic Analysis">Forensic Analysis</option>
                    <option value="Homicide">Homicide</option>
                    <option value="Narcotics">Narcotics</option>
                    <option value="Corporate Espionage">Corporate Espionage</option>
                    <option value="General Investigation">General Investigation</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
                    Classification
                  </label>
                  <select
                    value={newClassification}
                    onChange={(e) => setNewClassification(e.target.value as CaseClassification)}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      backgroundColor: 'var(--color-surface-2)',
                      border: '1px solid var(--color-hairline)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-ink)',
                      fontSize: 'var(--text-sm)',
                      outline: 'none',
                    }}
                  >
                    <option value="confidential">🔒 Confidential</option>
                    <option value="restricted">⚠️ Restricted</option>
                    <option value="internal">📁 Internal</option>
                  </select>
                </div>
              </div>

              <TextInput
                label="Custom Case # (Optional)"
                placeholder="Leave blank to auto-generate (e.g. C-2026-84920)"
                value={newCaseNumber}
                onChange={(e) => setNewCaseNumber(e.target.value)}
                helperText="If omitted, system assigns a unique standard case identifier."
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createMutation.isPending || !newTitle.trim()}
                >
                  {createMutation.isPending ? 'Creating Case...' : 'Create & Open Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
