import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  challengeToken: string | null;
  mfaSetupRequired: boolean;
  isAuthenticated: boolean;

  setChallenge: (token: string, setupRequired: boolean) => void;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  challengeToken: null,
  mfaSetupRequired: false,
  isAuthenticated: false,

  setChallenge: (token, setupRequired) =>
    set({ challengeToken: token, mfaSetupRequired: setupRequired }),

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken, isAuthenticated: true, challengeToken: null, mfaSetupRequired: false });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, isAuthenticated: false, challengeToken: null, mfaSetupRequired: false });
  },

  loadFromStorage: () => {
    const accessToken = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (accessToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, accessToken, isAuthenticated: true });
      } catch {
        set({ user: null, accessToken: null, isAuthenticated: false });
      }
    }
  },
}));
