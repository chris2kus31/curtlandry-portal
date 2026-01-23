// src/components/layouts/UserMenu.tsx
"use client";

import { Menu, Portal } from "@chakra-ui/react";
import { Box, HStack, Text, Avatar } from "@chakra-ui/react";
import { LuUser, LuSettings, LuLogOut } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useRouter } from "next/navigation";

interface UserMenuProps {
  user: {
    name?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
    job_title?: string;
  } | null;
  handleLogout: () => void;
}

type UserMenuAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  onClick?: () => void;
  isDivider?: boolean;
  disabled?: boolean;
};

export function UserMenu({ user, handleLogout }: UserMenuProps) {
  const router = useRouter();

  // Theming helpers
  const menuBg = useColorModeValue("white", "gray.800");
  const menuShadow = useColorModeValue("lg", "dark-lg");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const itemHoverBg = useColorModeValue("gray.50", "gray.700");
  const logoutHoverBg = useColorModeValue("red.50", "red.900");
  const logoutHoverColor = useColorModeValue("red.600", "red.200");
  const avatarBg = useColorModeValue("brand.100", "brand.800");
  const avatarColor = useColorModeValue("brand.700", "brand.200");
  const primaryTextColor = useColorModeValue("gray.900", "gray.50");
  const secondaryTextColor = useColorModeValue("gray.500", "gray.400");

  const MENU_ITEMS: UserMenuAction[] = [
    {
      key: "profile",
      label: "Profile",
      icon: <LuUser size={18} />,
      onClick: () => router.push("/settings/profile"),
      disabled: false,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <LuSettings size={18} />,
      onClick: () => router.push("/settings"),
      disabled: false,
    },
    {
      key: "divider-1",
      label: "",
      icon: null,
      isDivider: true,
    },
    {
      key: "logout",
      label: "Logout",
      icon: <LuLogOut size={18} />,
      color: "red.500",
      onClick: handleLogout,
      disabled: false,
    },
  ];

  function getInitials(name?: string) {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) {
      return parts[0][0]?.toUpperCase() || "U";
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const displayName = user?.full_name || user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User";

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Box
          as="button"
          tabIndex={0}
          _focus={{ outline: "none", boxShadow: "none" }}
          _focusVisible={{ outline: "none", boxShadow: "none" }}
          cursor="pointer"
        >
          <HStack gap={3}>
            <Avatar.Root size="sm" bg={avatarBg} color={avatarColor}>
              <Avatar.Fallback>{getInitials(displayName)}</Avatar.Fallback>
              {user?.avatar_url && <Avatar.Image src={user.avatar_url} />}
            </Avatar.Root>
            <Box textAlign="left" display={{ base: "none", md: "block" }}>
              <Text fontSize="sm" fontWeight="medium" color={primaryTextColor}>
                {displayName}
              </Text>
              <Text fontSize="xs" color={secondaryTextColor}>
                {user?.job_title || user?.email}
              </Text>
            </Box>
          </HStack>
        </Box>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            bg={menuBg}
            boxShadow={menuShadow}
            borderRadius="xl"
            minW="180px"
            py={2}
            px={0}
            mt={2}
            border="1px solid"
            borderColor={borderColor}
            zIndex={1400}
          >
            {MENU_ITEMS.map((item) =>
              item.isDivider ? (
                <Menu.Separator key={item.key} />
              ) : (
                <Menu.Item
                  key={item.key}
                  value={item.key}
                  px={4}
                  py={2}
                  color={item.color}
                  _hover={
                    item.key === "logout"
                      ? { bg: logoutHoverBg, color: logoutHoverColor }
                      : { bg: itemHoverBg }
                  }
                  disabled={item.disabled}
                  cursor={item.disabled ? "not-allowed" : "pointer"}
                  opacity={item.disabled ? 0.5 : 1}
                  onSelect={() => {
                    if (!item.disabled && item.onClick) {
                      item.onClick();
                    }
                  }}
                >
                  <HStack gap={3}>
                    {item.icon}
                    <Text>{item.label}</Text>
                  </HStack>
                </Menu.Item>
              )
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
