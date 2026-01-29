// src/components/layouts/AppLayout.tsx
"use client";

import { ReactNode, useState, useCallback } from "react";
import {
  Box,
  Drawer,
  Portal,
  useDisclosure,
  useBreakpointValue,
  HStack,
  Text,
} from "@chakra-ui/react";
import { SidebarContent } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useColorModeValue } from "@/components/ui/color-mode";
import { authService } from "@/lib/api";
import { LuUserCog, LuLogOut } from "react-icons/lu";

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 64;

export function AppLayout({ children }: { children: ReactNode }) {
  const { open, onOpen, onClose } = useDisclosure();
  const isDesktop = useBreakpointValue({ base: false, md: true });
  const [collapsed, setCollapsed] = useState(false);

  // Use lazy initialization to avoid useEffect setState anti-pattern
  const [impersonationInfo] = useState<{ id: number; name: string } | null>(
    () => {
      // Only run on client side
      if (typeof window === "undefined") return null;
      return authService.getImpersonationInfo();
    },
  );

  const bgSecondary = useColorModeValue("gray.50", "gray.950");
  const drawerBg = useColorModeValue("white", "gray.900");

  const handleEndImpersonation = useCallback(() => {
    authService.endImpersonation();
    window.location.href = "/login";
  }, []);

  return (
    <Box minH="100vh" bg={bgSecondary}>
      {/* Impersonation Banner */}
      {impersonationInfo && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          zIndex={2000}
          bg="purple.600"
          color="white"
          py={2}
          px={4}
        >
          <HStack justify="center" gap={3} fontSize="sm">
            <LuUserCog size={16} />
            <Text>
              You are viewing as another user. Originally logged in as{" "}
              <strong>{impersonationInfo.name}</strong>
            </Text>
            <Box
              as="button"
              onClick={handleEndImpersonation}
              display="flex"
              alignItems="center"
              gap={1}
              px={3}
              py={1}
              bg="white"
              color="purple.700"
              borderRadius="md"
              fontWeight="medium"
              fontSize="xs"
              _hover={{ bg: "purple.100" }}
            >
              <LuLogOut size={14} />
              End Session
            </Box>
          </HStack>
        </Box>
      )}
      {/* Desktop Sidebar */}
      {isDesktop ? (
        <Box mt={impersonationInfo ? "40px" : 0}>
          <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} />
        </Box>
      ) : (
        /* Mobile Drawer */
        <Drawer.Root
          open={open}
          onOpenChange={(e) => (e.open ? onOpen() : onClose())}
          placement="start"
        >
          <Portal>
            <Drawer.Backdrop />
            <Drawer.Positioner>
              <Drawer.Content p="0" bg={drawerBg} maxW="280px">
                <SidebarContent
                  onClose={onClose}
                  collapsed={false}
                  setCollapsed={() => {}}
                />
              </Drawer.Content>
            </Drawer.Positioner>
          </Portal>
        </Drawer.Root>
      )}

      {/* Main Content */}
      <Box
        ml={{
          base: 0,
          md: collapsed ? `${SIDEBAR_COLLAPSED}px` : `${SIDEBAR_WIDTH}px`,
        }}
        mt={impersonationInfo ? "40px" : 0}
        transition="margin 0.2s ease"
      >
        <AppHeader onMenuClick={onOpen} />
        <Box
          as="main"
          p={{ base: 4, md: 6, lg: 8 }}
          minH={
            impersonationInfo ? "calc(100vh - 104px)" : "calc(100vh - 64px)"
          }
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
