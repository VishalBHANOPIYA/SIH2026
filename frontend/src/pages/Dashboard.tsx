import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';

import { dashboardApi } from '../api/dashboard';
import type { SecurityAlert } from '../api/dashboard';
import { sharesApi } from '../api/shares';
import { useAuthStore } from '../stores/authStore';
import { SkeletonCard, SkeletonChart, EmptyState } from '../components/Skeleton';
import type { SharedDocumentItem } from '../types';
import { documentsApi } from '../api/documents';

// DESIGN.md Report Color Palette
const REPORT_COLORS = ['#3B82F6', '#8B5CF6', '#14B8A6', '#EC4899', '#F97316', '#EAB308', '#22C55E'];

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Fetch Dashboard Stats (Charts, Totals, Alerts)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardApi.getStats,
  });

  // Fetch Shared with Me documents
  const { data: sharedItems = [], isLoading: sharedLoading } = useQuery({
    queryKey: ['mySharedDocuments'],
    queryFn: sharesApi.getMySharedDocuments,
  });

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
          boxShadow: 'var(--elevation-1)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xl)' }}>🛡️</span>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-ink)' }}>
              Command Center Overview
            </h1>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-subtle)', marginTop: 'var(--space-1)' }}>
            Welcome, <strong>{user?.full_name}</strong> ({user?.role.toUpperCase()}) — {user?.department || 'General Investigation Division'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button onClick={() => navigate('/cases')} className="btn-primary">
            📁 Open Cases Vault
          </button>
          <button onClick={() => navigate('/audit')} className="btn-secondary">
            🛡️ System Audit Log
          </button>
        </div>
      </div>

      {/* Stat Card Row (feature-card styling) */}
      {statsLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <SkeletonCard height="100px" />
          <SkeletonCard height="100px" />
          <SkeletonCard height="100px" />
          <SkeletonCard height="100px" />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <MetricStatCard icon="📁" label="Total Cases" value={stats?.totals.cases ?? 0} subtext="Active investigations" color="var(--color-info)" />
          <MetricStatCard icon="📄" label="Total Documents" value={stats?.totals.documents ?? 0} subtext="Encrypted & hashed" color="var(--color-report-purple)" />
          <MetricStatCard icon="✍️" label="RSA Signatures" value={stats?.totals.signatures ?? 0} subtext="Digitally verified" color="var(--color-report-teal)" />
          <MetricStatCard icon="🔗" label="Ledger Entries" value={stats?.totals.audit_events ?? 0} subtext="SHA-256 Hash chain" color="var(--color-fin-orange)" />
        </div>
      )}

      {/* Recharts Analytics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        {/* Document Distribution Bar Chart */}
        <div className="feature-card" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h3 className="card-title" style={{ fontSize: 'var(--text-lg)' }}>
              Document Vault Distribution
            </h3>
            <p className="text-subtle" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
              Breakdown of uploaded evidence files by document classification.
            </p>
          </div>

          {statsLoading ? (
            <SkeletonChart height="240px" />
          ) : !stats || stats.documents_by_type.every((d) => d.count === 0) ? (
            <EmptyState icon="📊" title="No Document Data" description="Upload your first evidence document to view vault distribution charts." />
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.documents_by_type} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
                  <XAxis dataKey="label" stroke="var(--color-ink-subtle)" fontSize={11} interval={0} angle={-20} textAnchor="end" />
                  <YAxis stroke="var(--color-ink-subtle)" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-2)',
                      borderColor: 'var(--color-hairline)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-ink)',
                      fontSize: 'var(--text-xs)',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.documents_by_type.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={REPORT_COLORS[index % REPORT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 7-Day Audit Activity Trend Line Chart */}
        <div className="feature-card" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h3 className="card-title" style={{ fontSize: 'var(--text-lg)' }}>
              7-Day Audit Log Activity Trend
            </h3>
            <p className="text-subtle" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
              Daily Security Events: Authorized Actions vs Security Denials.
            </p>
          </div>

          {statsLoading ? (
            <SkeletonChart height="240px" />
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.audit_activity_7d || []} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
                  <XAxis dataKey="display_date" stroke="var(--color-ink-subtle)" fontSize={11} />
                  <YAxis stroke="var(--color-ink-subtle)" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-2)',
                      borderColor: 'var(--color-hairline)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-ink)',
                      fontSize: 'var(--text-xs)',
                    }}
                  />
                  <Line type="monotone" dataKey="success" name="Successful Events" stroke="var(--color-success)" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="denied" name="Denied Events" stroke="var(--color-error)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Security Alerts Panel ({colors.semantic-error} palette) */}
      <div
        className="feature-card"
        style={{
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-xl)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          backgroundColor: 'var(--color-surface-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--color-error)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                fontWeight: 'bold',
              }}
            >
              ⚠️
            </div>
            <div>
              <h2 className="card-title" style={{ fontSize: 'var(--text-lg)', color: 'var(--color-ink)' }}>
                Security & Anomaly Alerts
              </h2>
              <p className="text-subtle" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
                Automated security monitors tracking failed logins, policy blocks, and unauthorized download attempts.
              </p>
            </div>
          </div>

          <button onClick={() => navigate('/audit?outcome=denied')} className="btn-secondary" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
            🔍 Audit Security Policy Blocks
          </button>
        </div>

        {statsLoading ? (
          <SkeletonCard height="140px" />
        ) : !stats || stats.security_alerts.length === 0 ? (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)', fontStyle: 'italic' }}>
            No security alerts recorded.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {stats.security_alerts.map((alert) => (
              <SecurityAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* Shared With Me Section */}
      <div className="feature-card" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: 'var(--text-lg)' }}>
              📥 Shared With Me
            </h2>
            <p className="text-subtle" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
              Granular time-bound resources shared with your account or department.
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
            {sharedItems.length} Active Resources
          </span>
        </div>

        {sharedLoading ? (
          <SkeletonCard height="120px" />
        ) : sharedItems.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No Shared Documents Yet"
            description={`When other case managers or officers share documents with you or ${user?.department || 'your department'}, they will appear here.`}
          />
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

function MetricStatCard({ icon, label, value, subtext, color }: { icon: string; label: string; value: number; subtext: string; color: string }) {
  return (
    <div
      className="feature-card"
      style={{
        padding: 'var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface-2)',
          color,
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
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginTop: '2px' }}>{subtext}</div>
      </div>
    </div>
  );
}

function SecurityAlertCard({ alert }: { alert: SecurityAlert }) {
  const isHigh = alert.severity === 'high';
  const isMedium = alert.severity === 'medium';

  const badgeBg = isHigh ? 'rgba(239, 68, 68, 0.15)' : isMedium ? 'rgba(234, 179, 8, 0.15)' : 'rgba(59, 130, 246, 0.15)';
  const badgeColor = isHigh ? 'var(--color-error)' : isMedium ? 'var(--color-warning)' : 'var(--color-info)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: 'var(--space-4)',
        backgroundColor: 'var(--color-surface-2)',
        borderLeft: `4px solid ${badgeColor}`,
        borderRadius: 'var(--radius-md)',
        gap: 'var(--space-4)',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)' }}>
            {alert.title}
          </h4>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: badgeBg,
              color: badgeColor,
              textTransform: 'uppercase',
            }}
          >
            {alert.severity}
          </span>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginTop: 'var(--space-1)' }}>
          {alert.description}
        </p>
      </div>

      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        {new Date(alert.timestamp).toLocaleTimeString()}
      </span>
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
