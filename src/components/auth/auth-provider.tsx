"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { useAuthStore } from "@/store/auth-store";

// Hydration-safe client detection
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  const { initializeAuth, isInitialized, _hasHydrated } = useAuthStore();

  // Initialize auth after hydration
  useEffect(() => {
    if (isClient && _hasHydrated && !isInitialized) {
      initializeAuth();
    }
  }, [isClient, _hasHydrated, isInitialized, initializeAuth]);

  return <>{children}</>;
}
