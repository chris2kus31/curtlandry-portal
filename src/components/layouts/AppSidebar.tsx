// src/components/layouts/AppSidebar.tsx
"use client";

import React, { useEffect, useState } from "react";
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
  LuChevronDown,
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
  children?: LinkItemProps[];
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
    // (onboarding.manage), and super admins — any one grants access. (software.manage
    // is bundled with onboarding.manage on the onboarding role, so it's covered.)
    requiresManager: true,
    requiredRoles: ["super_admin"],
    requiredPermissions: ["onboarding.manage", "offboarding.submit"],
  },
  {
    name: "Admin",
    icon: LuShieldCheck,
    href: "/admin",
    // Parent page is super_admin-only; admin users still see the group via
    // Woo Discounts (canAccessParent). Nested only admin-gated tools — not
    // Sites/Events, which have their own event_manager path below.
    requiredRoles: ["super_admin"],
    children: [
      {
        name: "Woo Discounts",
        icon: LuTag,
        href: "/woo-discounts",
        requiredRoles: ["super_admin", "admin"],
      },
    ],
  },
  {
    name: "Sites",
    icon: LuGlobe,
    href: "/sites",
    // event_manager is an additive role that grants Sites + Events access
    // without broader admin privileges. Kept in sync with the role
    // allowlist on the API side (routes/api.php — portal.role middleware).
    requiredRoles: ["super_admin", "admin", "event_manager"],
    children: [
      {
        name: "Events",
        icon: LuClipboardList,
        href: "/events/applications",
        requiredRoles: ["super_admin", "admin", "event_manager"],
        requiredPermissions: ["applications.review"],
      },
      {
        name: "Interest Signups",
        icon: LuMail,
        href: "/events/interest",
        requiredRoles: ["super_admin", "admin", "event_manager"],
        requiredPermissions: ["applications.review"],
      },
    ],
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Theme colors
  const bgSurface = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.800");
  const activeBg = useColorModeValue("brand.500", "brand.600");
  const childActiveBg = useColorModeValue("brand.50", "brand.900");
  const childActiveColor = useColorModeValue("brand.700", "brand.200");
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

  const canAccessParent = (link: LinkItemProps) => {
    if (canAccess(link)) return true;
    return (link.children ?? []).some(canAccess);
  };

  const visibleLinks = LinkItems.filter(canAccessParent).map((link) => ({
    ...link,
    children: link.children?.filter(canAccess),
  }));

  const isActive = (href: string) => {
    // Exact match for dashboard
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    // For /admin, only match exact /admin path, not nested admin tools
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

  const isGroupActive = (link: LinkItemProps) =>
    isActive(link.href) ||
    (link.children ?? []).some((child) => isActive(child.href));

  // Auto-open groups when the current route is inside them. Manual toggles
  // still win until the pathname changes again.
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const link of visibleLinks) {
        if (!link.children?.length) continue;
        if (isGroupActive(link)) {
          next[link.name] = true;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      const currentlyOpen =
        prev[name] !== undefined
          ? prev[name]
          : visibleLinks.some(
              (link) => link.name === name && isGroupActive(link),
            );
      return { ...prev, [name]: !currentlyOpen };
    });
  };

  const isGroupOpen = (link: LinkItemProps) => {
    if (openGroups[link.name] !== undefined) {
      return openGroups[link.name];
    }
    return isGroupActive(link);
  };

  const renderNavRow = ({
    link,
    active,
    indented = false,
    trailing,
  }: {
    link: LinkItemProps;
    active: boolean;
    indented?: boolean;
    trailing?: React.ReactNode;
  }) => {
    const IconComponent = link.icon;

    return (
      <Flex
        align="center"
        justify={collapsed ? "center" : "flex-start"}
        px={collapsed ? 0 : 3}
        py={indented ? 2 : 2.5}
        pl={collapsed ? undefined : indented ? 12 : 3}
        borderRadius="lg"
        cursor="pointer"
        bg={
          active
            ? indented
              ? childActiveBg
              : activeBg
            : "transparent"
        }
        color={
          active
            ? indented
              ? childActiveColor
              : "white"
            : textPrimary
        }
        fontWeight={active ? 600 : 500}
        position="relative"
        _hover={{
          bg: active
            ? indented
              ? childActiveBg
              : "brand.600"
            : hoverBg,
          transform: active || trailing ? "none" : "translateX(2px)",
        }}
        transition="all 0.2s"
      >
        {collapsed ? (
          <Flex w="40px" h="40px" align="center" justify="center">
            <IconComponent size={20} />
          </Flex>
        ) : (
          <Flex align="center" gap={3} flex={1} minW={0}>
            <Flex
              w={indented ? "28px" : "36px"}
              h={indented ? "28px" : "36px"}
              align="center"
              justify="center"
              flexShrink={0}
            >
              <IconComponent size={indented ? 16 : 20} />
            </Flex>
            <Text fontSize={indented ? "xs" : "sm"} whiteSpace="nowrap">
              {link.name}
            </Text>
          </Flex>
        )}

        {trailing}

        {active && !collapsed && !indented && (
          <Box
            position="absolute"
            left={0}
            top="50%"
            transform="translateY(-50%)"
            w="3px"
            h="60%"
            bg="white"
            borderRadius="full"
            pointerEvents="none"
          />
        )}
      </Flex>
    );
  };

  const expandChevron = (groupOpen: boolean, active: boolean) => (
    <Box
      as="span"
      display="inline-flex"
      color={active ? "white" : textSecondary}
      transform={groupOpen ? "rotate(0deg)" : "rotate(-90deg)"}
      transition="transform 0.15s ease"
      aria-hidden
    >
      <LuChevronDown size={16} />
    </Box>
  );

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
            const children = link.children ?? [];
            const hasChildren = children.length > 0;
            const canOpenParent = canAccess(link);
            const groupOpen = isGroupOpen(link);
            const parentPageActive = isActive(link.href);
            const groupActive = isGroupActive(link);

            if (!hasChildren) {
              return (
                <NextLink href={link.href} key={link.name}>
                  {renderNavRow({ link, active: isActive(link.href) })}
                </NextLink>
              );
            }

            // Collapsed: go to parent page when allowed, otherwise first child.
            if (collapsed) {
              const collapsedHref = canOpenParent
                ? link.href
                : (children[0]?.href ?? link.href);
              return (
                <NextLink href={collapsedHref} key={link.name}>
                  {renderNavRow({ link, active: groupActive })}
                </NextLink>
              );
            }

            // Parent row only expands/collapses — never nests a button inside
            // a link (that was causing the click glitches). Section pages stay
            // reachable from their child links / direct URLs.
            return (
              <Box key={link.name}>
                <Box
                  role="button"
                  tabIndex={0}
                  aria-expanded={groupOpen}
                  aria-label={
                    groupOpen ? `Collapse ${link.name}` : `Expand ${link.name}`
                  }
                  onClick={() => toggleGroup(link.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleGroup(link.name);
                    }
                  }}
                >
                  {renderNavRow({
                    link,
                    active: parentPageActive,
                    trailing: expandChevron(groupOpen, parentPageActive),
                  })}
                </Box>

                {groupOpen && (
                  <VStack align="stretch" gap={0.5} mt={1}>
                    {children.map((child) => (
                      <NextLink href={child.href} key={`${link.name}-${child.name}`}>
                        {renderNavRow({
                          link: child,
                          active: isActive(child.href),
                          indented: true,
                        })}
                      </NextLink>
                    ))}
                  </VStack>
                )}
              </Box>
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
          {collapsed ? "©" : "© 2026 Curt Landry Ministries"}
        </Text>
      </Box>
    </Box>
  );
}
