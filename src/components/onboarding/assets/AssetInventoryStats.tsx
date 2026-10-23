"use client";

import { Box, HStack, SimpleGrid, Skeleton, Text } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import type { IconType } from "react-icons";
import { LuCircleCheck, LuPackage, LuUser } from "react-icons/lu";
import type { AssetInventoryCounts } from "@/lib/api";

interface AssetInventoryStatsProps {
  /** Inventory counters from /portal/onboarding/assets/stats (or people-ops stats). */
  stats: AssetInventoryCounts | null;
  loading: boolean;
}

export function AssetInventoryStats({
  stats,
  loading,
}: AssetInventoryStatsProps) {
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const statBg = useColorModeValue("gray.50", "gray.800");

  if (loading) {
    return (
      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height="76px" borderRadius="xl" />
        ))}
      </SimpleGrid>
    );
  }

  if (!stats) return null;

  const cards: {
    key: string;
    label: string;
    value: number;
    icon: IconType;
    color: string;
  }[] = [
    {
      key: "total",
      label: "Total assets",
      value: stats.total,
      icon: LuPackage,
      color: textMuted,
    },
    {
      key: "assignable",
      label: "Ready for new hires",
      value: stats.assignable,
      icon: LuCircleCheck,
      color: "green.500",
    },
    {
      key: "assigned",
      label: "Currently with staff",
      value: stats.by_status?.assigned ?? 0,
      icon: LuUser,
      color: "blue.500",
    },
  ];

  return (
    <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <HStack
            key={card.key}
            p={4}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            bg={statBg}
            gap={3}
          >
            <Box color={card.color}>
              <Icon size={20} />
            </Box>
            <Box>
              <Text fontSize="xs" color={textSecondary}>
                {card.label}
              </Text>
              <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
                {card.value}
              </Text>
            </Box>
          </HStack>
        );
      })}
    </SimpleGrid>
  );
}
