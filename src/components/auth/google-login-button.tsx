"use client";

import { Box, Spinner, Text } from "@chakra-ui/react";
import { useAuthStore } from "@/store/auth-store";
import { FcGoogle } from "react-icons/fc";

interface GoogleLoginButtonProps {
  variant?: "solid" | "outline";
  size?: "sm" | "md" | "lg";
}

export function GoogleLoginButton({
  size = "lg",
}: GoogleLoginButtonProps) {
  const { loginWithGoogle, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <Box
        as="button"
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap={3}
        w="full"
        py={3}
        px={4}
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.300"
        bg="white"
        cursor="wait"
        fontSize={size === "lg" ? "md" : size === "md" ? "sm" : "xs"}
      >
        <Spinner size="sm" />
        <Text color="gray.700" fontWeight="medium">
          Redirecting...
        </Text>
      </Box>
    );
  }

  return (
    <Box
      as="button"
      onClick={loginWithGoogle}
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={3}
      w="full"
      py={3}
      px={4}
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.300"
      bg="white"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{ bg: "gray.50", borderColor: "gray.400" }}
      fontSize={size === "lg" ? "md" : size === "md" ? "sm" : "xs"}
    >
      <FcGoogle size={20} />
      <Text color="gray.700" fontWeight="medium">
        Sign in with Google
      </Text>
    </Box>
  );
}
