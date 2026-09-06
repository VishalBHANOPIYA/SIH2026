import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes to match JWT expiry

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuthStore();
  const { addToast } = useToastStore();
  const location = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isAuthenticated) {
      // Clear previous timer
      if (timerRef.current) clearTimeout(timerRef.current);

      // Warn 2 minutes before expiry
      const warnAt = SESSION_DURATION_MS - 2 * 60 * 1000;
      timerRef.current = setTimeout(() => {
        addToast('warning', 'Your session will expire in 2 minutes. Please save your work.');

        // Auto-logout at expiry
        setTimeout(() => {
          addToast('error', 'Session expired. Please log in again.');
          logout();
        }, 2 * 60 * 1000);
      }, warnAt);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
