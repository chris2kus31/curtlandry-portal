"use client";

import { Box, Spinner, Text } from "@chakra-ui/react";
import { useAuthStore } from "@/store/auth-store";
import { FcGoogle } from "react-icons/fc";

interface HodGoogleLoginButtonProps {
  size?: "sm" | "md" | "lg";
}

export function HodGoogleLoginButton({ size = "lg" }: HodGoogleLoginButtonProps) {
  const { loginWithGoogleHod, isLoading } = useAuthStore();

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
      onClick={loginWithGoogleHod}
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={3}
      w="full"
      py={3}
      px={4}
      borderRadius="lg"
      border="1px solid"
      borderColor="purple.200"
      bg="white"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{ bg: "purple.50", borderColor: "purple.400" }}
      fontSize={size === "lg" ? "md" : size === "md" ? "sm" : "xs"}
    >
      <FcGoogle size={20} />
      <Text color="gray.700" fontWeight="medium">
        House of David Google
      </Text>
    </Box>
  );
}
