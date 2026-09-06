import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { casesApi } from '../api/cases';
import { documentsApi } from '../api/documents';
import { SkeletonCard, EmptyState } from '../components/Skeleton';
import type { Case, DocumentItem } from '../types';

const docTypeIcons: Record<string, { icon: string; label: string }> = {
  FIR: { icon: '📋', label: 'FIR' },
  witness_statement: { icon: '🗣️', label: 'Witness Statement' },
  charge_sheet: { icon: '⚖️', label: 'Charge Sheet' },
  forensic_report: { icon: '🔬', label: 'Forensic Report' },
  evidence_media: { icon: '📷', label: 'Evidence Media' },
  court_filing: { icon: '🏛️', label: 'Court Filing' },
  legal_notice: { icon: '📜', label: 'Legal Notice' },
  judgment: { icon: '👨‍⚖️', label: 'Judgment' },
};

export function DocumentsPage() {
  const navigate = useNavigate();
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Fetch Cases list for dropdown
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => casesApi.getCases(),
  });

  // Fetch documents if case selected
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['caseDocuments', selectedCaseId],
    queryFn: () => documentsApi.getCaseDocuments(selectedCaseId),
    enabled: !!selectedCaseId,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="card-title" style={{ fontSize: 'var(--text-2xl)' }}>
            Central Evidence Vault
          </h1>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            AES-256 Fernet encrypted evidence repository & RSA signed version roster
          </p>
        </div>

        {/* Case Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink-muted)' }}>
            Select Case Vault:
          </label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              minWidth: '240px',
            }}
          >
            <option value="">-- Select Case to View Vault --</option>
            {cases.map((c: Case) => (
              <option key={c.id} value={c.id}>
                Case #{c.case_number} — {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedCaseId ? (
        <EmptyState
          icon="📄"
          title="Select a Case Vault to Access Documents"
          description="Choose an active investigation case from the dropdown above to inspect encrypted evidence files, re-upload revisions, or execute RSA digital signatures."
          actionLabel="📁 Browse All Cases"
          onAction={() => navigate('/cases')}
        />
      ) : docsLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          <SkeletonCard height="160px" />
          <SkeletonCard height="160px" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon="📂"
          title="No Documents Uploaded to this Case"
          description="No evidence files have been stored in this case vault yet. Open the case workspace to upload FIR reports or forensic files."
          actionLabel="📁 Open Case Workspace"
          onAction={() => navigate(`/cases/${selectedCaseId}`)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {documents.map((doc: DocumentItem) => {
            const iconConfig = docTypeIcons[doc.doc_type] || { icon: '📄', label: doc.doc_type };
            const latestVer = doc.latest_version;

            return (
              <div
                key={doc.id}
                className="feature-card"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontSize: '1.4rem' }}>{iconConfig.icon}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(34,197,94,0.15)',
                        color: 'var(--color-success)',
                        fontWeight: 'bold',
                      }}
                    >
                      v{latestVer?.version_number || 1}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)' }}>
                    {doc.title}
                  </h3>

                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>Type: {iconConfig.label}</span>
                    <span>Uploaded by: {doc.creator.full_name}</span>
                    <span>Date: {new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', borderTop: '1px solid var(--color-hairline)', paddingTop: 'var(--space-3)' }}>
                  <button
                    className="btn-primary"
                    onClick={() => navigate(`/cases/${selectedCaseId}`)}
                    style={{ flex: 1, fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
                  >
                    📁 Case Workspace
                  </button>

                  {latestVer && (
                    <button
                      className="btn-secondary"
                      onClick={() => documentsApi.downloadVersion(doc.id, latestVer.id, `${doc.title}_v${latestVer.version_number}`)}
                      style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
                    >
                      ⬇️ Download
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
