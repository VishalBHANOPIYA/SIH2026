import { useParams } from 'react-router-dom';

export function CaseDetailPage() {
  const { id } = useParams();
  return (
    <div className="feature-card">
      <h1 className="card-title">Case Detail: {id}</h1>
      <p className="text-muted" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
        Case information and documents. Business logic coming soon.
      </p>
    </div>
  );
}
