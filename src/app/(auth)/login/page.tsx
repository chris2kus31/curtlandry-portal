// src/app/(auth)/login/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Box, Spinner } from "@chakra-ui/react";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuthStore } from "@/store/auth-store";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, _hasHydrated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated || !isInitialized) return;

    // Only redirect when we have a real session (user + token).
    // Stale persisted user without a token used to bounce login ↔ app.
    if (user && token) {
      const redirect = searchParams.get("redirect") || "/time-off";
      router.replace(redirect);
    }
  }, [user, token, _hasHydrated, isInitialized, router, searchParams]);

  // Wait for store hydration/init before painting the form
  if (!_hasHydrated || !isInitialized) {
    return (
      <Box
        minH="100vh"
        bg="gray.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  // Brief spinner while navigating away after a successful session
  if (user && token) {
    return (
      <Box
        minH="100vh"
        bg="gray.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box
          minH="100vh"
          bg="gray.50"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner size="xl" color="brand.500" />
        </Box>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
