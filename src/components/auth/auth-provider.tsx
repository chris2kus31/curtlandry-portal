"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const { initializeAuth, isInitialized, _hasHydrated } = useAuthStore();

  // Ensure we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize auth after hydration
  useEffect(() => {
    if (isClient && _hasHydrated && !isInitialized) {
      initializeAuth();
    }
  }, [isClient, _hasHydrated, isInitialized, initializeAuth]);

  return <>{children}</>;
}
