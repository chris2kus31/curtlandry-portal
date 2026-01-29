"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Spinner, VStack } from "@chakra-ui/react";
import { useAuthStore } from "@/store/auth-store";
import { useColorModeValue } from "@/components/ui/color-mode";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requiresDirectReports?: boolean; // Only allow if user has direct reports
}

export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermissions,
  requiresDirectReports,
}: ProtectedRouteProps) {
  const router = useRouter();
  const {
    user,
    isLoading,
    isInitialized,
    _hasHydrated,
    hasPermission,
    hasAnyRole,
  } = useAuthStore();

  const bgColor = useColorModeValue("gray.50", "gray.950");

  useEffect(() => {
    // Wait for hydration and initialization
    if (!_hasHydrated || !isInitialized || isLoading) {
      return;
    }

    // Not authenticated
    if (!user) {
      router.push("/login");
      return;
    }

    // Check if requires direct reports (for Team page)
    if (requiresDirectReports && !user.has_direct_reports) {
      router.push("/dashboard");
      return;
    }

    // Check roles
    if (requiredRoles && requiredRoles.length > 0) {
      if (!hasAnyRole(requiredRoles)) {
        router.push("/forbidden");
        return;
      }
    }

    // Check permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((perm) =>
        hasPermission(perm),
      );
      if (!hasAllPermissions) {
        router.push("/forbidden");
        return;
      }
    }
  }, [
    user,
    isLoading,
    isInitialized,
    _hasHydrated,
    requiredRoles,
    requiredPermissions,
    requiresDirectReports,
    hasPermission,
    hasAnyRole,
    router,
  ]);

  // Show loading while hydrating or initializing
  if (!_hasHydrated || !isInitialized || isLoading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={bgColor}
      >
        <VStack gap={4}>
          <Spinner size="xl" color="brand.500" />
        </VStack>
      </Box>
    );
  }

  // Not authenticated - will redirect in useEffect
  if (!user) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={bgColor}
      >
        <VStack gap={4}>
          <Spinner size="xl" color="brand.500" />
        </VStack>
      </Box>
    );
  }

  return <>{children}</>;
}
