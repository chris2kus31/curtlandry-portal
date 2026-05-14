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
  const { user, _hasHydrated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;

    if (user) {
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.replace(redirect);
    }
  }, [user, _hasHydrated, isInitialized, router, searchParams]);

  if (!_hasHydrated || (user && isInitialized)) {
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
