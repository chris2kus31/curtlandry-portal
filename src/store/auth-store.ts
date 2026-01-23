// store/auth-store.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authService } from "@/lib/api/auth-service";
import type { User } from "@/types/auth";

interface AuthState {
  user: User | null;
  roles: string[];
  permissions: string[];
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  _hasHydrated: boolean;

  // Actions
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  initializeAuth: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  clearError: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      roles: [],
      permissions: [],
      token: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      loginWithGoogle: () => {
        set({ isLoading: true, error: null });
        authService.initiateGoogleLogin();
      },

      logout: async () => {
        try {
          await authService.logout();
        } finally {
          // Clear localStorage token
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("refresh_token");
          }
          set({
            user: null,
            roles: [],
            permissions: [],
            token: null,
            error: null,
            isLoading: false,
          });
        }
      },

      setUser: (user: User) => set({ user, isLoading: false, error: null }),

      setToken: (token: string) => {
        // Also store in localStorage for http-client to access
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", token);
        }
        set({ token });
      },

      initializeAuth: async () => {
        const state = get();
        
        // Skip if already initialized
        if (state.isInitialized) return;

        set({ isLoading: true });

        try {
          // Check for token in store (from persist) or localStorage
          const storedToken = state.token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null);

          if (storedToken) {
            // Ensure token is in localStorage for http-client
            if (typeof window !== "undefined") {
              localStorage.setItem("auth_token", storedToken);
            }

            // Fetch fresh user data from API
            const response = await authService.getProfile();
            
            // Response structure: { success: true, data: { ...userFields, roles, permissions } }
            const userData = response.data || response;
            const { roles = [], permissions = [], ...user } = userData;

            set({
              user: user as User,
              roles,
              permissions,
              token: storedToken,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({
              user: null,
              roles: [],
              permissions: [],
              token: null,
              isLoading: false,
              isInitialized: true,
            });
          }
        } catch (error) {
          console.error("Auth initialization failed:", error);
          
          // Clear invalid tokens
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("refresh_token");
          }
          
          set({
            user: null,
            roles: [],
            permissions: [],
            token: null,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
        }
      },

      hasPermission: (permission: string) => {
        const { permissions } = get();
        return permissions.includes(permission);
      },

      hasRole: (role: string) => {
        const { roles } = get();
        return roles.includes(role);
      },

      hasAnyRole: (rolesToCheck: string[]) => {
        const { roles } = get();
        return rolesToCheck.some((role) => roles.includes(role));
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "clm-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        roles: state.roles,
        permissions: state.permissions,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
