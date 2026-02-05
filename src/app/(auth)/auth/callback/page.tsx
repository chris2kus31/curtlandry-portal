// src/app/(auth)/auth/callback/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, VStack, Spinner, Text } from "@chakra-ui/react";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/lib/api/auth-service";
import { toaster } from "@/components/ui/toaster";
import type { User } from "@/types/auth";

// Static colors for this transient page (avoids hydration mismatch)
const bgPrimary = "gray.50";
const textPrimary = "gray.900";
const textSecondary = "gray.600";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    const handleError = (message: string) => {
      console.error("Google OAuth callback error:", message);
      setStatus("error");

      // Clear any stored tokens
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");

      // Clear Zustand persisted state
      localStorage.removeItem("clm-auth");

      // Show error message
      toaster.create({
        title: "Sign in failed",
        description: message,
        type: "error",
        duration: 5000,
      });

      // Redirect to login after delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    };

    const handleCallback = async () => {
      // Get token from URL params
      const token = searchParams.get("token");
      const error = searchParams.get("error");

      if (error) {
        handleError(error);
        return;
      }

      if (!token) {
        handleError("No authentication token received");
        return;
      }

      setStatus("loading");

      // Store the token in localStorage first (for http-client to use)
      localStorage.setItem("auth_token", token);

      try {
        // Fetch user profile with the token
        const resp = await authService.getProfile();

        // Response structure: { success: true, data: { ...userFields, roles, permissions } }
        // Cast to a workable type
        type ProfileData = User & { roles?: string[]; permissions?: string[] };
        const profileData = (resp.data ?? resp) as ProfileData;

        // Extract roles and permissions from the response
        const userRoles = profileData.roles ?? [];
        const userPermissions = profileData.permissions ?? [];

        // Build user object (exclude roles/permissions which are stored separately)
        const user: User = {
          id: profileData.id,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          email: profileData.email,
          is_active: profileData.is_active ?? true,
          name: profileData.name,
          full_name: profileData.full_name,
          google_id: profileData.google_id,
          avatar_url: profileData.avatar_url,
          department: profileData.department,
          job_title: profileData.job_title,
          hire_date: profileData.hire_date,
          is_manager: profileData.is_manager,
        };

        // Update auth store - setToken will also sync to localStorage
        setToken(token);
        setUser(user);
        useAuthStore.setState({
          roles: userRoles,
          permissions: userPermissions,
          isInitialized: true,
        });

        setStatus("success");

        // Show success message
        toaster.create({
          title: "Welcome!",
          description: "Successfully signed in to CLM Portal",
          type: "success",
          duration: 3000,
        });

        // Small delay to ensure state is persisted
        setTimeout(() => {
          router.push("/dashboard");
        }, 100);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Google authentication failed";
        handleError(message);
      }
    };

    handleCallback();
  }, [searchParams, router, setUser, setToken]);

  return (
    <Box
      minH="100vh"
      bg={bgPrimary}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <VStack gap={6} textAlign="center" p={8}>
        {status === "loading" && (
          <>
            <Spinner size="xl" color="brand.500" />
            <VStack gap={2}>
              <Text fontSize="lg" fontWeight="medium" color={textPrimary}>
                Completing sign in...
              </Text>
              <Text fontSize="sm" color={textSecondary}>
                Please wait while we log you in with Google
              </Text>
            </VStack>
          </>
        )}

        {status === "error" && (
          <>
            <Box
              w="16"
              h="16"
              bg="red.100"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="2xl" color="red.500">
                ✕
              </Text>
            </Box>
            <VStack gap={2}>
              <Text fontSize="lg" fontWeight="medium" color={textPrimary}>
                Sign in failed
              </Text>
              <Text fontSize="sm" color={textSecondary}>
                Redirecting you back to login...
              </Text>
            </VStack>
          </>
        )}

        {status === "success" && (
          <>
            <Box
              w="16"
              h="16"
              bg="green.100"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="2xl" color="green.500">
                ✓
              </Text>
            </Box>
            <VStack gap={2}>
              <Text fontSize="lg" fontWeight="medium" color={textPrimary}>
                Welcome to CLM Portal!
              </Text>
              <Text fontSize="sm" color={textSecondary}>
                Taking you to your dashboard...
              </Text>
            </VStack>
          </>
        )}
      </VStack>
    </Box>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <Box
          minH="100vh"
          bg="gray.100"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner size="xl" color="brand.500" />
        </Box>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
