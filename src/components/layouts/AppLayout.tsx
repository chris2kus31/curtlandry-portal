// src/components/layouts/AppLayout.tsx
"use client";

import { ReactNode, useState } from "react";
import {
  Box,
  Drawer,
  Portal,
  useDisclosure,
  useBreakpointValue,
} from "@chakra-ui/react";
import { SidebarContent } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useColorModeValue } from "@/components/ui/color-mode";

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 64;

export function AppLayout({ children }: { children: ReactNode }) {
  const { open, onOpen, onClose } = useDisclosure();
  const isDesktop = useBreakpointValue({ base: false, md: true });
  const [collapsed, setCollapsed] = useState(false);

  const bgSecondary = useColorModeValue("gray.50", "gray.950");
  const drawerBg = useColorModeValue("white", "gray.900");

  return (
    <Box minH="100vh" bg={bgSecondary}>
      {/* Desktop Sidebar */}
      {isDesktop ? (
        <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} />
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
        transition="margin 0.2s ease"
      >
        <AppHeader onMenuClick={onOpen} />
        <Box
          as="main"
          p={{ base: 4, md: 6, lg: 8 }}
          minH="calc(100vh - 64px)"
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
