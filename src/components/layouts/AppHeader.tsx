// src/components/layouts/AppHeader.tsx
"use client";

import { Box, BoxProps, Flex, HStack, IconButton } from "@chakra-ui/react";
import { LuMenu, LuBell, LuMoon, LuSun } from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { toaster } from "@/components/ui/toaster";
import { useColorMode, useColorModeValue } from "@/components/ui/color-mode";
import { UserMenu } from "@/components/layouts/UserMenu";

interface AppHeaderProps extends BoxProps {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick, ...props }: AppHeaderProps) {
  const { colorMode, toggleColorMode } = useColorMode();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Theme colors
  const bgSurface = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const iconColor = useColorModeValue("gray.600", "gray.400");

  const handleLogout = async () => {
    try {
      await logout();
      toaster.create({
        title: "Logged out",
        description: "You have been successfully logged out",
        type: "success",
        duration: 3000,
      });
      router.push("/login");
    } catch {
      toaster.create({
        title: "Logout failed",
        description: "There was an error logging you out",
        type: "error",
        duration: 3000,
      });
    }
  };

  return (
    <Box
      as="header"
      h="64px"
      bg={bgSurface}
      px={{ base: 4, md: 6 }}
      position="sticky"
      top={0}
      zIndex={10}
      w="full"
      boxShadow="sm"
      borderBottom="1px solid"
      borderColor={borderColor}
      {...props}
    >
      <Flex h="full" align="center" justify="space-between">
        {/* Left Section - Mobile Menu */}
        <HStack gap={3}>
          <IconButton
            display={{ base: "flex", md: "none" }}
            onClick={onMenuClick}
            variant="ghost"
            aria-label="Open menu"
            color={iconColor}
          >
            <LuMenu size={20} />
          </IconButton>
        </HStack>

        {/* Right Section */}
        <HStack gap={2}>
          {/* Notifications */}
          <IconButton
            variant="ghost"
            aria-label="Notifications"
            color={iconColor}
            _hover={{ bg: useColorModeValue("gray.100", "gray.800") }}
          >
            <LuBell size={20} />
          </IconButton>

          {/* Theme toggle */}
          <IconButton
            variant="ghost"
            aria-label="Toggle color mode"
            color={iconColor}
            onClick={toggleColorMode}
            _hover={{ bg: useColorModeValue("gray.100", "gray.800") }}
          >
            {colorMode === "dark" ? <LuSun size={20} /> : <LuMoon size={20} />}
          </IconButton>

          {/* Profile Menu */}
          <UserMenu user={user} handleLogout={handleLogout} />
        </HStack>
      </Flex>
    </Box>
  );
}
