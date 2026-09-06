import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { casesApi } from '../api/cases';
import { sharesApi } from '../api/shares';
import { documentsApi } from '../api/documents';
import { useAuthStore } from '../stores/authStore';
import type { SharedDocumentItem } from '../types';

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Fetch Cases list for statistics
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => casesApi.getCases(),
  });

  // Fetch Shared with Me documents
  const { data: sharedItems = [], isLoading: sharedLoading } = useQuery({
    queryKey: ['mySharedDocuments'],
    queryFn: sharesApi.getMySharedDocuments,
  });

  const activeInvestigations = cases.filter((c) => c.status === 'under_investigation' || c.status === 'open').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Welcome Banner */}
      <div
        style={{
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-ink)' }}>
            Welcome back, {user?.full_name}
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-subtle)', marginTop: 'var(--space-1)' }}>
            {user?.role.toUpperCase()} — {user?.department || 'General Investigation Division'}
          </p>
        </div>

        <button onClick={() => navigate('/cases')} className="btn-primary">
          📁 Open Case Registry
        </button>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <MetricCard icon="📁" label="Total Active Cases" value={cases.length} subtext={`${activeInvestigations} under investigation`} />
        <MetricCard icon="🔗" label="Shared With Me" value={sharedItems.length} subtext="Time-bound access granted" />
        <MetricCard icon="🛡️" label="Role Clearance" value={user?.role.toUpperCase() || 'OFFICER'} subtext="ABAC & RBAC protected" />
        <MetricCard icon="🔒" label="Trust Layer" value="ACTIVE" subtext="RSA-2048 SHA-256 Ledger" />
      </div>

      {/* Shared With Me Section */}
      <div className="feature-card" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: 'var(--text-lg)' }}>
              📥 Shared With Me
            </h2>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
              Documents and evidence shared specifically with you or your department ({user?.department || 'General'}).
            </p>
          </div>

          <span
            style={{
              fontSize: 'var(--text-xs)',
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(59,130,246,0.12)',
              color: 'var(--color-info)',
              fontWeight: 'bold',
            }}
          >
            {sharedItems.length} Shared Resources
          </span>
        </div>

        {sharedLoading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-ink-subtle)', fontSize: 'var(--text-sm)' }}>
            Loading shared documents...
          </div>
        ) : sharedItems.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-8)',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--color-hairline)',
            }}
          >
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: 'var(--space-2)' }}>📭</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
              No Shared Documents
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)', marginTop: 'var(--space-1)' }}>
              When officers or case managers share documents with you or {user?.department}, they will appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {sharedItems.map((item) => (
              <SharedDocumentCard key={item.share.id} item={item} onNavigateCase={() => navigate(`/cases/${item.document.case_id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, subtext }: { icon: string; label: string; value: string | number; subtext: string }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-1)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-ink)', marginTop: '2px' }}>
          {value}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>{subtext}</div>
      </div>
    </div>
  );
}

function SharedDocumentCard({ item, onNavigateCase }: { item: SharedDocumentItem; onNavigateCase: () => void }) {
  const { share, document } = item;
  const latestVer = document.latest_version;
  const canDownload = share.permission_level === 'download';

  const expiresText = share.expires_at ? `Expires: ${new Date(share.expires_at).toLocaleDateString()}` : 'Permanent Access';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        padding: 'var(--space-4)',
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 'var(--radius-lg)',
        gap: 'var(--space-4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(59,130,246,0.12)',
            color: 'var(--color-info)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
          }}
        >
          📄
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)' }}>
              {document.title}
            </h4>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: canDownload ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                color: canDownload ? 'var(--color-success)' : 'var(--color-info)',
                fontWeight: 'bold',
              }}
            >
              {canDownload ? '📥 View & Download' : '👁️ View Only'}
            </span>
          </div>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginTop: '2px', display: 'flex', gap: 'var(--space-2)' }}>
            <span>Shared by {share.sender.full_name}</span>
            <span>•</span>
            <span>{expiresText}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <button className="btn-secondary" onClick={onNavigateCase} style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}>
          📁 View Case
        </button>

        {canDownload && latestVer && (
          <button
            className="btn-primary"
            onClick={() => documentsApi.downloadVersion(document.id, latestVer.id, `${document.title}_v${latestVer.version_number}`)}
            style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
          >
            ⬇️ Download File
          </button>
        )}
      </div>
    </div>
  );
}
