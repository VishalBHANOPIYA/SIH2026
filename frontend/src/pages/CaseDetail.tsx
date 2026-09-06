import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '../api/cases';
import { documentsApi } from '../api/documents';
import { ledgerApi } from '../api/ledger';
import { TextInput } from '../components/TextInput';
import { useToastStore } from '../stores/toastStore';
import type { CaseClassification, CaseStatus, DocType, DocumentItem, DocumentVersion, User } from '../types';

const statusConfig: Record<CaseStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  under_investigation: { label: 'Under Investigation', color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  closed: { label: 'Closed', color: '#A1A1AA', bg: 'rgba(113,113,122,0.12)' },
  archived: { label: 'Archived', color: '#A78BFA', bg: 'rgba(139,92,246,0.12)' },
};

const classificationConfig: Record<CaseClassification, { label: string; color: string; bg: string; icon: string }> = {
  confidential: { label: 'Confidential', color: '#F87171', bg: 'rgba(239,68,68,0.12)', icon: '🔒' },
  restricted: { label: 'Restricted', color: '#FACC15', bg: 'rgba(234,179,8,0.12)', icon: '⚠️' },
  internal: { label: 'Internal', color: '#60A5FA', bg: 'rgba(59,130,246,0.12)', icon: '📁' },
};

const docTypeIcons: Record<DocType, { icon: string; label: string; bg: string; color: string }> = {
  FIR: { icon: '📋', label: 'FIR', bg: 'rgba(239,68,68,0.12)', color: '#F87171' },
  witness_statement: { icon: '🗣️', label: 'Witness Statement', bg: 'rgba(59,130,246,0.12)', color: '#60A5FA' },
  charge_sheet: { icon: '⚖️', label: 'Charge Sheet', bg: 'rgba(234,179,8,0.12)', color: '#FACC15' },
  forensic_report: { icon: '🔬', label: 'Forensic Report', bg: 'rgba(139,92,246,0.12)', color: '#A78BFA' },
  evidence_media: { icon: '📷', label: 'Evidence Media', bg: 'rgba(20,184,166,0.12)', color: '#2DD4BF' },
  court_filing: { icon: '🏛️', label: 'Court Filing', bg: 'rgba(249,115,22,0.12)', color: '#FB923C' },
  legal_notice: { icon: '📜', label: 'Legal Notice', bg: 'rgba(236,72,153,0.12)', color: '#F472B6' },
  judgment: { icon: '👨‍⚖️', label: 'Judgment', bg: 'rgba(34,197,94,0.12)', color: '#4ADE80' },
};

type ActiveTab = 'documents' | 'timeline' | 'access' | 'audit';

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('documents');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [assignedRole, setAssignedRole] = useState('Investigator');

  // Document Upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<DocType>('forensic_report');
  const [sensitivity, setSensitivity] = useState('confidential');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Version re-upload modal state
  const [versionDocModal, setVersionDocModal] = useState<DocumentItem | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionSensitivity, setVersionSensitivity] = useState('confidential');
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  // Expanded version histories (docId -> boolean)
  const [expandedDocs, setExpandedDocs] = useState<Record<number, boolean>>({});

  // Fetch Case details
  const { data: c, isLoading, error } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.getCaseById(id!),
    enabled: !!id,
  });

  // Fetch Case Documents
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['caseDocuments', id],
    queryFn: () => documentsApi.getCaseDocuments(id!),
    enabled: !!id,
  });

  // Fetch assignable users for modal
  const { data: assignableUsers = [] } = useQuery({
    queryKey: ['assignableUsers'],
    queryFn: casesApi.getAssignableUsers,
    enabled: isAssignModalOpen,
  });

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => casesApi.updateCaseStatus(id!, newStatus),
    onSuccess: (updatedCase) => {
      addToast('success', `Case status updated to "${updatedCase.status}"`);
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to update status');
    },
  });

  // Assign officer mutation
  const assignMutation = useMutation({
    mutationFn: () => casesApi.assignUser(id!, selectedUserId as number, assignedRole),
    onSuccess: () => {
      addToast('success', 'Officer assigned to case successfully!');
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setIsAssignModalOpen(false);
      setSelectedUserId('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to assign officer');
    },
  });

  // Remove officer mutation
  const removeMutation = useMutation({
    mutationFn: (userId: number) => casesApi.removeUser(id!, userId),
    onSuccess: () => {
      addToast('info', 'Officer removed from case');
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to remove officer');
    },
  });

  // Document Upload mutation
  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error('Please select a file to upload');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', docTitle.trim() || uploadFile.name);
      formData.append('doc_type', docType);
      formData.append('sensitivity', sensitivity);
      return documentsApi.uploadDocument(id!, formData);
    },
    onSuccess: (newDoc) => {
      addToast('success', `Document "${newDoc.title}" encrypted & uploaded successfully!`);
      queryClient.invalidateQueries({ queryKey: ['caseDocuments', id] });
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setUploadFile(null);
      setDocTitle('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Document upload failed');
    },
  });

  // Version Re-upload mutation
  const uploadVersionMutation = useMutation({
    mutationFn: async () => {
      if (!versionDocModal || !versionFile) throw new Error('Please select a new version file');
      const formData = new FormData();
      formData.append('file', versionFile);
      formData.append('sensitivity', versionSensitivity);
      return documentsApi.uploadDocumentVersion(versionDocModal.id, formData);
    },
    onSuccess: (updatedDoc) => {
      addToast('success', `Version v${updatedDoc.latest_version?.version_number} uploaded for "${updatedDoc.title}"!`);
      queryClient.invalidateQueries({ queryKey: ['caseDocuments', id] });
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setVersionDocModal(null);
      setVersionFile(null);
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Version upload failed');
    },
  });

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadFile(file);
      if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const toggleExpandDoc = (docId: number) => {
    setExpandedDocs((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const copyHashToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
    addToast('info', 'SHA-256 hash copied to clipboard');
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-ink-subtle)' }}>
        Loading Case Workspace...
      </div>
    );
  }

  if (error || !c) {
    return (
      <div className="feature-card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <h2 className="card-title" style={{ color: 'var(--color-error)' }}>Case Not Found</h2>
        <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
          The requested case ID standard does not exist or access has been denied.
        </p>
        <button className="btn-secondary" onClick={() => navigate('/cases')} style={{ marginTop: 'var(--space-4)' }}>
          ← Back to Cases Repository
        </button>
      </div>
    );
  }

  const statusStyle = statusConfig[c.status] || statusConfig.open;
  const classStyle = classificationConfig[c.classification] || classificationConfig.internal;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)' }}>
        <span style={{ cursor: 'pointer', color: 'var(--color-ink-subtle)' }} onClick={() => navigate('/cases')}>
          Cases
        </span>
        <span>/</span>
        <span style={{ color: 'var(--color-fin-orange)', fontFamily: 'monospace', fontWeight: 'bold' }}>
          {c.case_number}
        </span>
      </div>

      {/* Hero Workspace Header (Emotional Center) */}
      <div
        className="feature-card"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface-1) 0%, rgba(26,26,31,0.85) 100%)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        {/* Top Info Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: 'var(--color-fin-orange)',
                  backgroundColor: 'rgba(249,115,22,0.15)',
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  letterSpacing: '1px',
                }}
              >
                {c.case_number}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: classStyle.color,
                  backgroundColor: classStyle.bg,
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                }}
              >
                <span>{classStyle.icon}</span>
                <span>{classStyle.label.toUpperCase()}</span>
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-ink-muted)',
                  backgroundColor: 'var(--color-surface-2)',
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-hairline)',
                }}
              >
                {c.case_type}
              </span>
            </div>

            <h1
              className="card-title"
              style={{
                fontSize: 'var(--text-3xl)',
                fontWeight: 'var(--font-weight-bold)',
                letterSpacing: '-0.5px',
                lineHeight: 'var(--leading-tight)',
              }}
            >
              {c.title}
            </h1>
          </div>

          {/* Quick Status Control Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)', marginBottom: '4px' }}>
                CASE STATUS
              </div>
              <select
                value={c.status}
                onChange={(e) => statusMutation.mutate(e.target.value)}
                disabled={statusMutation.isPending}
                style={{
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.color,
                  border: `1px solid ${statusStyle.color}40`,
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="open" style={{ backgroundColor: 'var(--color-surface-1)', color: 'var(--color-ink)' }}>● Open</option>
                <option value="under_investigation" style={{ backgroundColor: 'var(--color-surface-1)', color: 'var(--color-ink)' }}>● Under Investigation</option>
                <option value="closed" style={{ backgroundColor: 'var(--color-surface-1)', color: 'var(--color-ink)' }}>● Closed</option>
                <option value="archived" style={{ backgroundColor: 'var(--color-surface-1)', color: 'var(--color-ink)' }}>● Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Details & Team Roster Row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-6)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-hairline)',
          }}
        >
          {/* Metadata items */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
            <div>
              <span className="text-subtle" style={{ fontSize: 'var(--text-xs)', display: 'block' }}>Lead Creator</span>
              <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
                {c.creator.full_name} ({c.creator.department || 'DMS'})
              </span>
            </div>
            <div>
              <span className="text-subtle" style={{ fontSize: 'var(--text-xs)', display: 'block' }}>Initiated On</span>
              <span style={{ color: 'var(--color-ink-muted)' }}>
                {new Date(c.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </span>
            </div>
            <div>
              <span className="text-subtle" style={{ fontSize: 'var(--text-xs)', display: 'block' }}>Evidence Items</span>
              <span style={{ color: 'var(--color-ink-muted)', fontWeight: 'var(--font-weight-medium)' }}>
                📁 {documents.length} Encrypted Files
              </span>
            </div>
          </div>

          {/* Assigned Team Roster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>Assigned Team:</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {c.assignments.map((a, idx) => {
                  const initials = a.user.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div key={a.id} style={{ position: 'relative', display: 'inline-block' }}>
                      <div
                        title={`${a.user.full_name} — ${a.assigned_role}`}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: idx % 2 === 0 ? 'var(--color-fin-orange)' : '#3B82F6',
                          color: 'white',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid var(--color-surface-1)',
                          marginLeft: idx > 0 ? '-10px' : '0',
                          cursor: 'pointer',
                        }}
                      >
                        {initials}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="btn-secondary"
              onClick={() => setIsAssignModalOpen(true)}
              style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
            >
              ＋ Assign Officer
            </button>
          </div>
        </div>
      </div>

      {/* Tab Strip Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--color-hairline)',
          paddingBottom: '2px',
        }}
      >
        <button
          onClick={() => setActiveTab('documents')}
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'documents' ? '2px solid var(--color-fin-orange)' : '2px solid transparent',
            color: activeTab === 'documents' ? 'var(--color-ink)' : 'var(--color-ink-muted)',
            fontWeight: activeTab === 'documents' ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span>📄</span>
          <span>Documents Vault</span>
          <span
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-ink-muted)',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {documents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'timeline' ? '2px solid var(--color-fin-orange)' : '2px solid transparent',
            color: activeTab === 'timeline' ? 'var(--color-ink)' : 'var(--color-ink-muted)',
            fontWeight: activeTab === 'timeline' ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span>⏱️</span>
          <span>Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('access')}
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'access' ? '2px solid var(--color-fin-orange)' : '2px solid transparent',
            color: activeTab === 'access' ? 'var(--color-ink)' : 'var(--color-ink-muted)',
            fontWeight: activeTab === 'access' ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span>🔑</span>
          <span>Access Control</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid var(--color-fin-orange)' : '2px solid transparent',
            color: activeTab === 'audit' ? 'var(--color-ink)' : 'var(--color-ink-muted)',
            fontWeight: activeTab === 'audit' ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span>🛡️</span>
          <span>Audit Log</span>
        </button>
      </div>

      {/* Tab Content Areas */}
      <div>
        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Upload Zone Component (Product-mockup-card style: 16px rounded, white/surface on cream) */}
            <div
              className="feature-card"
              style={{
                borderRadius: 'var(--radius-xl)',
                backgroundColor: 'var(--color-surface-1)',
                border: '1px solid var(--color-hairline)',
                padding: 'var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 className="card-title" style={{ fontSize: 'var(--text-lg)' }}>
                    Upload New Evidence Document
                  </h3>
                  <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                    Files are automatically Fernet AES encrypted before disk write with SHA-256 tamper hashing.
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-fin-orange)',
                    backgroundColor: 'rgba(249,115,22,0.1)',
                    padding: 'var(--space-1) var(--space-3)',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 'bold',
                  }}
                >
                  🔒 AES-Fernet 256-bit
                </span>
              </div>

              {/* Drag & Drop Box */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--color-fin-orange)' : 'var(--color-hairline)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-8)',
                  backgroundColor: dragActive ? 'rgba(249,115,22,0.05)' : 'var(--color-surface-2)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {uploadFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)' }}>
                    <div style={{ fontSize: '2rem' }}>📄</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--color-ink)', fontSize: 'var(--text-sm)' }}>
                        {uploadFile.name}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                        {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • {uploadFile.type || 'Document'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-error)',
                        cursor: 'pointer',
                        marginLeft: 'var(--space-4)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{ fontSize: '2.5rem' }}>📤</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
                      Drag and drop file here, or <span style={{ color: 'var(--color-fin-orange)', textDecoration: 'underline' }}>browse</span>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>
                      Supports PDF, PNG, JPG, DOCX (Max 25MB)
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                <TextInput
                  label="Document Title"
                  placeholder="e.g. Memory Dump Forensic Analysis"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocType)}
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
                    <option value="FIR">📋 FIR</option>
                    <option value="witness_statement">🗣️ Witness Statement</option>
                    <option value="charge_sheet">⚖️ Charge Sheet</option>
                    <option value="forensic_report">🔬 Forensic Report</option>
                    <option value="evidence_media">📷 Evidence Media</option>
                    <option value="court_filing">🏛️ Court Filing</option>
                    <option value="legal_notice">📜 Legal Notice</option>
                    <option value="judgment">👨‍⚖️ Judgment</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
                    Sensitivity Clearance
                  </label>
                  <select
                    value={sensitivity}
                    onChange={(e) => setSensitivity(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <button
                  className="btn-primary"
                  disabled={!uploadFile || uploadDocMutation.isPending}
                  onClick={() => uploadDocMutation.mutate()}
                >
                  {uploadDocMutation.isPending ? 'Encrypting & Uploading...' : 'Upload & Encrypt Document'}
                </button>
              </div>
            </div>

            {/* Document List Table / Card View */}
            <div className="feature-card" style={{ padding: 'var(--space-6)' }}>
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
                Attached Document Vault ({documents.length})
              </h3>

              {docsLoading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-ink-subtle)' }}>
                  Loading encrypted document repository...
                </div>
              ) : documents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-ink-subtle)' }}>
                  No documents uploaded yet. Use the upload zone above to attach files.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {documents.map((doc: DocumentItem) => {
                    const typeConfig = docTypeIcons[doc.doc_type] || docTypeIcons.forensic_report;
                    const latestVer = doc.latest_version;
                    const isExpanded = !!expandedDocs[doc.id];

                    return (
                      <div
                        key={doc.id}
                        style={{
                          backgroundColor: 'var(--color-surface-2)',
                          border: '1px solid var(--color-hairline)',
                          borderRadius: 'var(--radius-lg)',
                          padding: 'var(--space-4)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-3)',
                        }}
                      >
                        {/* Primary Document Row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: '280px' }}>
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: typeConfig.bg,
                                color: typeConfig.color,
                                fontSize: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {typeConfig.icon}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)' }}>
                                  {doc.title}
                                </h4>
                                {latestVer && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      backgroundColor: 'rgba(34,197,94,0.15)',
                                      color: '#22C55E',
                                      padding: '2px 8px',
                                      borderRadius: 'var(--radius-full)',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    v{latestVer.version_number} (Current)
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginTop: '2px', display: 'flex', gap: 'var(--space-2)' }}>
                                <span>{typeConfig.label}</span>
                                <span>•</span>
                                <span>Uploaded by {doc.creator.full_name}</span>
                                <span>•</span>
                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            {latestVer && (
                              <>
                                <button
                                  className="btn-primary"
                                  style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
                                  onClick={() => documentsApi.downloadVersion(doc.id, latestVer.id, `${doc.title}_v${latestVer.version_number}`)}
                                >
                                  ⬇️ Download
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)', color: '#4ADE80', borderColor: 'rgba(74,222,128,0.3)' }}
                                  onClick={async () => {
                                    try {
                                      await ledgerApi.signVersion(latestVer.id);
                                      addToast('success', `Version v${latestVer.version_number} digitally signed with RSA-2048 key!`);
                                      queryClient.invalidateQueries({ queryKey: ['caseDocuments', id] });
                                    } catch (err: any) {
                                      addToast('error', err.message || 'Signing failed');
                                    }
                                  }}
                                >
                                  ✍️ Sign v{latestVer.version_number}
                                </button>
                              </>
                            )}

                            <button
                              className="btn-secondary"
                              style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
                              onClick={() => {
                                setVersionDocModal(doc);
                                setVersionSensitivity(doc.sensitivity || 'confidential');
                              }}
                            >
                              🔄 New Version
                            </button>

                            <button
                              className="btn-secondary"
                              style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
                              onClick={() => toggleExpandDoc(doc.id)}
                            >
                              📜 {isExpanded ? 'Hide Versions' : `Versions (${doc.versions.length})`}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Version History Accordion */}
                        {isExpanded && (
                          <div
                            style={{
                              marginTop: 'var(--space-2)',
                              paddingTop: 'var(--space-3)',
                              borderTop: '1px solid var(--color-hairline)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 'var(--space-2)',
                            }}
                          >
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-ink-muted)', marginBottom: 'var(--space-1)' }}>
                              DOCUMENT VERSION AUDIT & RSA SIGNATURE ROSTER
                            </div>

                            {doc.versions.map((ver: DocumentVersion) => {
                              const isSuperseded = ver.status === 'superseded';
                              const truncHash = ver.file_hash ? `${ver.file_hash.slice(0, 8)}...${ver.file_hash.slice(-8)}` : '';

                              return (
                                <div
                                  key={ver.id}
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 'var(--space-3)',
                                    backgroundColor: 'var(--color-surface-1)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-hairline)',
                                    fontSize: 'var(--text-xs)',
                                    gap: 'var(--space-2)',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <span
                                      style={{
                                        fontWeight: 'bold',
                                        color: isSuperseded ? 'var(--color-ink-subtle)' : 'var(--color-fin-orange)',
                                        fontFamily: 'monospace',
                                      }}
                                    >
                                      v{ver.version_number}
                                    </span>

                                    <span
                                      style={{
                                        padding: '1px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        backgroundColor: isSuperseded ? 'rgba(113,113,122,0.15)' : 'rgba(34,197,94,0.15)',
                                        color: isSuperseded ? '#A1A1AA' : '#22C55E',
                                      }}
                                    >
                                      {ver.status.toUpperCase()}
                                    </span>

                                    {/* Verification Badge */}
                                    <span
                                      style={{
                                        padding: '1px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        backgroundColor: 'rgba(34,197,94,0.15)',
                                        color: '#4ADE80',
                                        border: '1px solid rgba(74,222,128,0.3)',
                                      }}
                                    >
                                      ✓ Verified (AES-Fernet + SHA-256)
                                    </span>

                                    {/* SHA-256 Monospace Hash with Click to Copy */}
                                    <code
                                      title={`SHA-256 Original File Hash: ${ver.file_hash}\nClick to copy`}
                                      onClick={() => copyHashToClipboard(ver.file_hash)}
                                      style={{
                                        fontFamily: 'monospace',
                                        color: 'var(--color-ink-muted)',
                                        backgroundColor: 'var(--color-canvas)',
                                        padding: '2px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        border: '1px dashed var(--color-hairline)',
                                      }}
                                    >
                                      SHA-256: {truncHash} 📋
                                    </code>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <span style={{ color: 'var(--color-ink-subtle)' }}>
                                      {(ver.size_bytes / (1024 * 1024)).toFixed(2)} MB • {ver.uploader.full_name}
                                    </span>

                                    <button
                                      className="btn-secondary"
                                      style={{ fontSize: '11px', padding: '2px 8px', color: '#4ADE80', borderColor: 'rgba(74,222,128,0.3)' }}
                                      onClick={async () => {
                                        try {
                                          await ledgerApi.signVersion(ver.id);
                                          addToast('success', `Version v${ver.version_number} signed with RSA key!`);
                                          queryClient.invalidateQueries({ queryKey: ['caseDocuments', id] });
                                        } catch (err: any) {
                                          addToast('error', err.message || 'Signing failed');
                                        }
                                      }}
                                    >
                                      ✍️ Sign
                                    </button>

                                    <button
                                      className="btn-secondary"
                                      style={{ fontSize: '11px', padding: '2px 8px' }}
                                      onClick={() => documentsApi.downloadVersion(doc.id, ver.id, `${doc.title}_v${ver.version_number}`)}
                                    >
                                      ⬇️ Download
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="feature-card" style={{ padding: 'var(--space-6)' }}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Investigation Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-4)', borderLeft: '2px solid var(--color-fin-orange)', paddingLeft: 'var(--space-4)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-ink)' }}>Case Initiated</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                    Created by {c.creator.full_name} on {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              {c.assignments.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 'var(--space-4)', borderLeft: '2px solid var(--color-hairline)', paddingLeft: 'var(--space-4)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'medium', color: 'var(--color-ink)' }}>
                      Officer Assigned: {a.user.full_name} ({a.assigned_role})
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                      Assigned on {new Date(a.assigned_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'access' && (
          <div className="feature-card" style={{ padding: 'var(--space-6)' }}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Access Control & Permissions</h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              Granular ABAC & RBAC permission matrix for this case resource.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {c.assignments.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ fontSize: 'var(--text-lg)' }}>👤</span>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-ink)' }}>
                        {a.user.full_name}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                        {a.user.email} • {a.assigned_role}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-secondary"
                    onClick={() => removeMutation.mutate(a.user_id)}
                    style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', borderColor: 'rgba(239,68,68,0.3)' }}
                  >
                    Remove Access
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="feature-card" style={{ padding: 'var(--space-6)' }}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Case Audit Log</h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              Immutable audit events recorded for Case #{c.case_number}.
            </p>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
              Full audit trail integration active in system audit module.
            </div>
          </div>
        )}
      </div>

      {/* Assign Officer Modal */}
      {isAssignModalOpen && (
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
          onClick={() => setIsAssignModalOpen(false)}
        >
          <div
            className="feature-card"
            style={{ width: '100%', maxWidth: '440px', backgroundColor: 'var(--color-surface-1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="card-title" style={{ marginBottom: 'var(--space-1)' }}>Assign Officer to Case</h2>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-6)' }}>
              Grant investigation access to authorized department personnel
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'medium', color: 'var(--color-ink)' }}>Select Officer</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
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
                  <option value="">Select Personnel...</option>
                  {assignableUsers.map((u: User) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role.toUpperCase()} — {u.department || 'DMS'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'medium', color: 'var(--color-ink)' }}>Assigned Role</label>
                <select
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value)}
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
                  <option value="Lead Investigator">Lead Investigator</option>
                  <option value="Investigator">Investigator</option>
                  <option value="Forensic Expert">Forensic Expert</option>
                  <option value="Legal Advisor">Legal Advisor</option>
                  <option value="Reviewer">Reviewer</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button className="btn-secondary" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  disabled={!selectedUserId || assignMutation.isPending}
                  onClick={() => assignMutation.mutate()}
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign Officer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload New Version Modal */}
      {versionDocModal && (
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
          onClick={() => setVersionDocModal(null)}
        >
          <div
            className="feature-card"
            style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--color-surface-1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="card-title" style={{ marginBottom: 'var(--space-1)' }}>
              Upload New Version of "{versionDocModal.title}"
            </h2>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-6)' }}>
              Increments document version number and marks previous version as superseded.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div
                onClick={() => versionFileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--color-hairline)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-6)',
                  backgroundColor: 'var(--color-surface-2)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <input
                  ref={versionFileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setVersionFile(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />

                {versionFile ? (
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-ink)' }}>
                    📄 {versionFile.name} ({(versionFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                ) : (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                    Click to select new version file (PDF, PNG, JPG, DOCX - Max 25MB)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button className="btn-secondary" onClick={() => setVersionDocModal(null)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  disabled={!versionFile || uploadVersionMutation.isPending}
                  onClick={() => uploadVersionMutation.mutate()}
                >
                  {uploadVersionMutation.isPending ? 'Uploading Version...' : 'Upload & Supersede Previous'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
