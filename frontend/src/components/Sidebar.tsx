import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { NavItem } from '../types';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Cases', path: '/cases', icon: '📁' },
  { label: 'Documents', path: '/documents', icon: '📄' },
  { label: 'Ledger', path: '/ledger', icon: '🔗' },
  { label: 'Audit Log', path: '/audit', icon: '🛡️' },
  { label: 'Admin', path: '/admin', icon: '⚙️', roles: ['admin'] },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      style={{
        width: '240px',
        minHeight: '100vh',
        backgroundColor: 'var(--color-surface-1)',
        borderRight: '1px solid var(--color-hairline)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-6) 0',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '0 var(--space-6)',
          marginBottom: 'var(--space-8)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-fin-orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'white',
          }}
        >
          SC
        </div>
        <span
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-ink)',
          }}
        >
          SecureCase
        </span>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', padding: '0 var(--space-3)' }}>
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: 'var(--text-sm)',
              fontWeight: isActive ? 'var(--font-weight-medium)' : 'var(--font-weight-regular)',
              color: isActive ? 'var(--color-ink)' : 'var(--color-ink-muted)',
              backgroundColor: isActive ? 'var(--color-surface-2)' : 'transparent',
              transition: 'all var(--transition-fast)',
              fontFamily: 'var(--font-family)',
            })}
          >
            <span style={{ fontSize: 'var(--text-base)' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div
        style={{
          padding: 'var(--space-4) var(--space-6)',
          borderTop: '1px solid var(--color-hairline)',
          marginTop: 'auto',
        }}
      >
        {user && (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-ink)' }}>
              {user.full_name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="btn-secondary"
          style={{ width: '100%', fontSize: 'var(--text-xs)' }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
