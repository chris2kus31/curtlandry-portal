"use client";

import { Box, HStack, SimpleGrid, Skeleton, Text } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { LuCircleCheck, LuPackage, LuUser } from "react-icons/lu";
import type { AssetInventoryCounts, AssetOptions } from "@/lib/api";

interface AssetInventoryStatsProps {
  /** Inventory counters from /portal/onboarding/assets/stats (or people-ops stats). */
  stats: AssetInventoryCounts | null;
  loading: boolean;
  /** When present, the assignable chip label comes from API status_filters. */
  options?: AssetOptions | null;
}

export function AssetInventoryStats({
  stats,
  loading,
  options,
}: AssetInventoryStatsProps) {
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

  const assignableLabel =
    options?.status_filters?.find((f) => f.assignable)?.label ??
    "Ready for new hires";

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
      color: "fg.muted",
    },
    {
      key: "assignable",
      label: assignableLabel,
      value: stats.assignable,
      icon: LuCircleCheck,
      color: "green.500",
    },
    {
      key: "assigned",
      label: options?.statuses?.assigned
        ? `Currently ${options.statuses.assigned.toLowerCase()}`
        : "Currently with staff",
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
            borderColor="border.primary"
            bg="bg.secondary"
            gap={3}
          >
            <Box color={card.color}>
              <Icon size={20} />
            </Box>
            <Box>
              <Text fontSize="xs" color="fg.muted">
                {card.label}
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="fg">
                {card.value}
              </Text>
            </Box>
          </HStack>
        );
      })}
    </SimpleGrid>
  );
}
