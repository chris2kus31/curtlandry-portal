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
  HStack,
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
    requiredRoles: ["manager", "admin", "super_admin"],
  },
  {
    name: "Admin",
    icon: LuShieldCheck,
    href: "/admin",
    requiredRoles: ["super_admin"],
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
  const { roles, permissions } = useAuthStore();

  // Theme colors
  const bgSurface = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.800");
  const activeBg = useColorModeValue("brand.500", "brand.600");

  const canAccess = (link: LinkItemProps) => {
    if (!link.requiredRoles && !link.requiredPermissions) return true;
    if (
      link.requiredRoles?.length &&
      roles.some((r) => link.requiredRoles!.includes(r))
    )
      return true;
    return !!(
      link.requiredPermissions?.length &&
      permissions.some((p) => link.requiredPermissions!.includes(p))
    );
  };

  const visibleLinks = LinkItems.filter(canAccess);
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

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
      {/* Logo and Collapse Button */}
      <Flex
        h="72px"
        align="center"
        position="relative"
        px={collapsed ? 0 : 4}
        justify={collapsed ? "center" : "flex-start"}
      >
        <HStack gap={3}>
          {collapsed ? (
            <Box p={1}>
              <Image
                src="/curtlandrylogo.svg"
                alt="CLM"
                width={40}
                height={40}
                priority
              />
            </Box>
          ) : (
            <HStack gap={3} pl={2}>
              <Image
                src="/curtlandrylogo.svg"
                alt="Curt Landry Ministries"
                width={40}
                height={40}
                priority
              />
              <Box>
                <Text
                  fontWeight={700}
                  fontSize="md"
                  color={textPrimary}
                  letterSpacing="tight"
                  lineHeight={1.2}
                >
                  CLM Portal
                </Text>
                <Text
                  fontSize="xs"
                  color={textSecondary}
                  fontWeight={500}
                >
                  Staff Access
                </Text>
              </Box>
            </HStack>
          )}
        </HStack>

        {/* Collapse/Expand Button */}
        <Box
          position="absolute"
          right={collapsed ? "-14px" : "-14px"}
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
            {collapsed ? <LuChevronRight size={14} /> : <LuChevronLeft size={14} />}
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
      <Box px={collapsed ? 2 : 4} py={4} borderTop="1px solid" borderColor={borderColor}>
        <Text fontSize="xs" color={textSecondary} textAlign="center">
          {collapsed ? "©" : "© 2026 Curt Landry Ministries"}
        </Text>
      </Box>
    </Box>
  );
}
