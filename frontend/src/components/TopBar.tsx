import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { searchApi } from '../api/search';
import type { SearchResponse, SearchResultGroup, SearchHit } from '../types';

const docTypeIcons: Record<string, string> = {
  FIR: '📋',
  witness_statement: '🗣️',
  charge_sheet: '⚖️',
  forensic_report: '🔬',
  evidence_media: '📷',
  court_filing: '🏛️',
  legal_notice: '📜',
  judgment: '👨‍⚖️',
};

export function TopBar() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchApi.search(query.trim());
        setResults(data);
        setShowDropdown(true);
      } catch {
        setResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleHitClick = (hit: SearchHit) => {
    setShowDropdown(false);
    setQuery('');
    navigate(`/cases/${hit.case_id}`);
  };

  /**
   * Render a snippet with <<highlighted>> markers converted to styled spans.
   */
  const renderSnippet = (snippet: string) => {
    const parts = snippet.split(/<<|>>/);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <span
          key={i}
          style={{
            backgroundColor: 'rgba(249,115,22,0.25)',
            color: 'var(--color-fin-orange)',
            fontWeight: 'var(--font-weight-semibold)',
            borderRadius: '2px',
            padding: '0 2px',
          }}
        >
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: 'var(--color-surface-1)',
        borderBottom: '1px solid var(--color-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-6)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Global Search */}
      <div ref={dropdownRef} style={{ position: 'relative', flex: '0 1 480px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            backgroundColor: isFocused ? 'var(--color-surface-2)' : 'var(--color-canvas)',
            border: `1px solid ${isFocused ? 'var(--color-fin-orange)' : 'var(--color-hairline)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '0 var(--space-3)',
            transition: 'all var(--transition-fast)',
          }}
        >
          {/* Search Icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-ink-subtle)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search documents across all cases…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (results && results.total_hits > 0) setShowDropdown(true);
            }}
            onBlur={() => setIsFocused(false)}
            style={{
              flex: 1,
              padding: 'var(--space-2) 0',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-family)',
            }}
          />
          {isSearching && (
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: '2px solid var(--color-ink-subtle)',
                borderTopColor: 'var(--color-fin-orange)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && results && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxHeight: '420px',
              overflowY: 'auto',
              backgroundColor: 'var(--color-surface-1)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--elevation-3)',
              zIndex: 100,
            }}
          >
            {results.total_hits === 0 ? (
              <div
                style={{
                  padding: 'var(--space-6)',
                  textAlign: 'center',
                  color: 'var(--color-ink-subtle)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>🔍</div>
                No results found for "{query}"
              </div>
            ) : (
              <div style={{ padding: 'var(--space-2)' }}>
                <div
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-ink-subtle)',
                    fontWeight: 'var(--font-weight-medium)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {results.total_hits} result{results.total_hits !== 1 ? 's' : ''} across{' '}
                  {results.groups.length} case{results.groups.length !== 1 ? 's' : ''}
                </div>

                {results.groups.map((group: SearchResultGroup) => (
                  <div key={group.case_id} style={{ marginBottom: 'var(--space-2)' }}>
                    {/* Case Group Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-2) var(--space-3)',
                        backgroundColor: 'var(--color-surface-2)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '2px',
                      }}
                    >
                      <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--color-fin-orange)', fontWeight: 'var(--font-weight-bold)' }}>
                        {group.case_number}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                        {group.case_title}
                      </span>
                    </div>

                    {/* Hits */}
                    {group.hits.map((hit: SearchHit) => (
                      <div
                        key={`${hit.document_id}-${hit.version_id}`}
                        onClick={() => handleHitClick(hit)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-6)',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'background-color var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-2)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontSize: 'var(--text-sm)' }}>
                            {docTypeIcons[hit.doc_type] || '📄'}
                          </span>
                          <span
                            style={{
                              fontSize: 'var(--text-sm)',
                              fontWeight: 'var(--font-weight-medium)',
                              color: 'var(--color-ink)',
                            }}
                          >
                            {hit.document_title}
                          </span>
                          <span
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-ink-subtle)',
                              marginLeft: 'auto',
                            }}
                          >
                            v{hit.version_number}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-ink-muted)',
                            lineHeight: 'var(--leading-relaxed)',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {renderSnippet(hit.snippet)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User avatar menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
            {user?.full_name}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>
            {user?.department}
          </div>
        </div>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-fin-orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'white',
          }}
        >
          {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
