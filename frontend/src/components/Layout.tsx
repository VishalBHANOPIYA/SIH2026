import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <main
          style={{
            flex: 1,
            padding: 'var(--space-6)',
            backgroundColor: 'var(--color-canvas)',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
