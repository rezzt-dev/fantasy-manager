import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        set({ isLoading: false, error: data.error || 'Error de inicio de sesión' });
        return false;
      }

      set({ isAuthenticated: true, isLoading: false, error: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de red';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    set({ isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
