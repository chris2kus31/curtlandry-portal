// src/components/layouts/AppSidebar.tsx
"use client";

import React from "react";
import NextLink from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Box,
  Flex,
  VStack,
  Text,
  CloseButton,
  Separator,
  IconButton,
} from "@chakra-ui/react";
import {
  LuHouse,
  LuCalendar,
  LuUsers,
  LuChevronLeft,
  LuChevronRight,
  LuShieldCheck,
  LuTag,
  LuGlobe,
  LuClipboardList,
  LuMail,
  LuUsersRound,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { useAuthStore } from "@/store/auth-store";
import { useColorModeValue } from "@/components/ui/color-mode";

interface LinkItemProps {
  name: string;
  icon: IconType;
  href: string;
  badge?: string;
  badgeColor?: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requiresDirectReports?: boolean; // Only show if user has direct reports
  requiresManager?: boolean; // Show if user is a manager (OR'd with roles/permissions)
}

const LinkItems: LinkItemProps[] = [
  { name: "Dashboard", icon: LuHouse, href: "/dashboard" },
  {
    name: "Time Off",
    icon: LuCalendar,
    href: "/time-off",
  },
  {
    name: "Team",
    icon: LuUsers,
    href: "/team",
    requiresDirectReports: true, // Only show if user has people reporting to them
  },
  {
    name: "People Ops",
    icon: LuUsersRound,
    href: "/people-ops",
    // Unified onboarding + offboarding section (tabs gate per-capability inside).
    // Visible to managers (onboarding intake), HR (offboarding.submit), HR/IT
    // (onboarding.manage), and super admins — any one grants access.
    requiresManager: true,
    requiredRoles: ["super_admin"],
    requiredPermissions: ["onboarding.manage", "offboarding.submit"],
  },
  {
    name: "Admin",
    icon: LuShieldCheck,
    href: "/admin",
    requiredRoles: ["super_admin"],
  },
  {
    name: "Woo Discounts",
    icon: LuTag,
    href: "/woo-discounts",
    requiredRoles: ["super_admin", "admin"],
  },
  {
    name: "Sites",
    icon: LuGlobe,
    href: "/sites",
    // event_manager is an additive role that grants Sites + Events access
    // without broader admin privileges. Kept in sync with the role
    // allowlist on the API side (routes/api.php — portal.role middleware).
    requiredRoles: ["super_admin", "admin", "event_manager"],
  },
  {
    name: "Events",
    icon: LuClipboardList,
    href: "/events/applications",
    requiredPermissions: ["applications.review"],
  },
  {
    name: "Interest Signups",
    icon: LuMail,
    href: "/events/interest",
    requiredPermissions: ["applications.review"],
  },
];

interface SidebarContentProps {
  onClose?: () => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export function SidebarContent({
  onClose,
  collapsed,
  setCollapsed,
}: SidebarContentProps) {
  const pathname = usePathname();
  const { user, roles, permissions } = useAuthStore();

  // Theme colors
  const bgSurface = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.800");
  const activeBg = useColorModeValue("brand.500", "brand.600");
  const logoSrc = useColorModeValue(
    "/curtlandrylogo.svg",
    "/curtlandrylogo-light.svg",
  );

  const canAccess = (link: LinkItemProps) => {
    // Hard gate: Team page requires the user to have direct reports.
    if (link.requiresDirectReports && !user?.has_direct_reports) {
      return false;
    }

    // OR-style gates: visible when ANY declared condition is met. Items
    // without any gate are visible to all authenticated users.
    const gates: boolean[] = [];
    if (link.requiresManager) {
      gates.push(!!user?.has_direct_reports || !!user?.is_manager);
    }
    if (link.requiredRoles?.length) {
      gates.push(roles.some((r) => link.requiredRoles!.includes(r)));
    }
    if (link.requiredPermissions?.length) {
      gates.push(permissions.some((p) => link.requiredPermissions!.includes(p)));
    }

    if (gates.length === 0) return true;
    return gates.some(Boolean);
  };

  const visibleLinks = LinkItems.filter(canAccess);
  const isActive = (href: string) => {
    // Exact match for dashboard
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    // For /admin, only match exact /admin path, not /admin/store
    if (href === "/admin") {
      return pathname === "/admin";
    }
    // The Events nav points to /events/applications and should also light
    // up for the applications detail/manage subtrees. We intentionally do
    // NOT match /events/interest here so the sibling "Interest Signups"
    // nav item gets the active state when the user is on that page.
    if (href === "/events/applications") {
      return (
        pathname === href ||
        pathname.startsWith("/events/applications/") ||
        pathname === "/events/manage" ||
        pathname.startsWith("/events/manage/")
      );
    }
    // For other routes, check exact match or starts with href/
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <Box
      as="nav"
      bg={bgSurface}
      w={collapsed ? "64px" : { base: "full", md: "220px" }}
      minW={collapsed ? "64px" : "unset"}
      h="100vh"
      pos="fixed"
      left={0}
      top={0}
      zIndex="sticky"
      display="flex"
      flexDirection="column"
      boxShadow="sm"
      transition="width 0.2s ease"
      borderRight="1px solid"
      borderColor={borderColor}
    >
      {/* Logo Only */}
      <Flex h="64px" align="center" position="relative" justify="center">
        <Box p={2}>
          <Image
            src={logoSrc}
            alt="Curt Landry Ministries"
            width={collapsed ? 40 : 140}
            height={collapsed ? 40 : 50}
            priority
            style={{ objectFit: "contain" }}
          />
        </Box>

        {/* Collapse/Expand Button */}
        <Box
          position="absolute"
          right="-14px"
          top="50%"
          transform="translateY(-50%)"
          zIndex={2}
          display={{ base: "none", md: "block" }}
        >
          <IconButton
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
            size="xs"
            variant="outline"
            bg={bgSurface}
            borderColor={borderColor}
            color={textSecondary}
            rounded="full"
            boxShadow="sm"
            _hover={{
              bg: "brand.500",
              color: "white",
              borderColor: "brand.500",
            }}
          >
            {collapsed ? (
              <LuChevronRight size={14} />
            ) : (
              <LuChevronLeft size={14} />
            )}
          </IconButton>
        </Box>

        <CloseButton
          display={{ base: "flex", md: "none" }}
          onClick={onClose}
          position="absolute"
          right={4}
        />
      </Flex>

      <Separator borderColor={borderColor} />

      {/* Main Navigation */}
      <Box flex={1} overflowY="auto" px={collapsed ? 2 : 3} py={4}>
        <VStack align="stretch" gap={1}>
          {visibleLinks.map((link) => {
            const active = isActive(link.href);
            const IconComponent = link.icon;

            return (
              <NextLink href={link.href} passHref key={link.name}>
                <Flex
                  align="center"
                  justify={collapsed ? "center" : "flex-start"}
                  px={collapsed ? 0 : 3}
                  py={2.5}
                  borderRadius="lg"
                  cursor="pointer"
                  bg={active ? activeBg : "transparent"}
                  color={active ? "white" : textPrimary}
                  fontWeight={active ? 600 : 500}
                  position="relative"
                  _hover={{
                    bg: active ? "brand.600" : hoverBg,
                    transform: active ? "none" : "translateX(2px)",
                  }}
                  transition="all 0.2s"
                >
                  {collapsed ? (
                    <Flex w="40px" h="40px" align="center" justify="center">
                      <IconComponent size={20} />
                    </Flex>
                  ) : (
                    <Flex align="center" gap={3} flex={1}>
                      <Flex
                        w="36px"
                        h="36px"
                        align="center"
                        justify="center"
                        flexShrink={0}
                      >
                        <IconComponent size={20} />
                      </Flex>
                      <Text fontSize="sm" whiteSpace="nowrap">
                        {link.name}
                      </Text>
                    </Flex>
                  )}

                  {/* Active Indicator */}
                  {active && !collapsed && (
                    <Box
                      position="absolute"
                      left={0}
                      top="50%"
                      transform="translateY(-50%)"
                      w="3px"
                      h="60%"
                      bg="white"
                      borderRadius="full"
                    />
                  )}
                </Flex>
              </NextLink>
            );
          })}
        </VStack>
      </Box>

      {/* Footer */}
      <Box
        px={collapsed ? 2 : 4}
        py={4}
        borderTop="1px solid"
        borderColor={borderColor}
      >
        <Text fontSize="xs" color={textSecondary} textAlign="center">
          {collapsed ? "©" : "© 2025 Curt Landry Ministries"}
        </Text>
      </Box>
    </Box>
  );
}
