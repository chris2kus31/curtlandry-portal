"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, SimpleGrid, HStack, Text, Skeleton } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import type { IconType } from "react-icons";
import { LuUserPlus, LuUserMinus, LuLaptop, LuPackage } from "react-icons/lu";
import { onboardingService } from "@/lib/api";
import type { PeopleOpsStats } from "@/lib/api";

interface StatDef {
  key: string;
  label: string;
  value: number;
  hint: string;
  icon: IconType;
  accent: string;
  href?: string;
}

export function PeopleOpsStatsStrip() {
  const router = useRouter();
  const [stats, setStats] = useState<PeopleOpsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.800");

  useEffect(() => {
    let active = true;
    onboardingService
      .getStats()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(() => {
        if (active) setStats(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height="88px" borderRadius="xl" />
        ))}
      </SimpleGrid>
    );
  }

  if (!stats) return null;

  const cards: StatDef[] = [
    {
      key: "onboarding",
      label: "Active onboarding",
      value: stats.onboarding.active,
      hint:
        stats.onboarding.overdue > 0
          ? `${stats.onboarding.overdue} overdue`
          : `${stats.onboarding.starting_soon} starting soon`,
      icon: LuUserPlus,
      accent: stats.onboarding.overdue > 0 ? "red" : "blue",
    },
    {
      key: "offboarding",
      label: "Active offboarding",
      value: stats.offboarding.active,
      hint:
        stats.offboarding.pending_device_recovery > 0
          ? `${stats.offboarding.pending_device_recovery} devices to recover`
          : "all devices recovered",
      icon: LuUserMinus,
      accent: stats.offboarding.overdue > 0 ? "red" : "orange",
    },
    {
      key: "assets",
      label: "Assignable devices",
      value: stats.assets.assignable,
      hint: `${stats.assets.total} total`,
      icon: LuLaptop,
      accent: "teal",
      href: "/people-ops/assets",
    },
    {
      key: "software",
      label: "Software catalog",
      value: stats.software.active,
      hint: `${stats.software.requires_approval} need approval`,
      icon: LuPackage,
      accent: "purple",
      href: "/people-ops/software",
    },
  ];

  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
      {cards.map((c) => {
        const Icon = c.icon;
        const clickable = Boolean(c.href);
        return (
          <Box
            key={c.key}
            bg={cardBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="xl"
            p={4}
            cursor={clickable ? "pointer" : "default"}
            onClick={clickable ? () => router.push(c.href!) : undefined}
            _hover={
              clickable
                ? {
                    bg: hoverBg,
                    borderColor: "brand.300",
                    boxShadow: "sm",
                    transform: "translateY(-1px)",
                  }
                : undefined
            }
            transition="all 0.15s"
          >
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" color={textSecondary} fontWeight="medium">
                {c.label}
              </Text>
              <Box color={`${c.accent}.500`}>
                <Icon size={16} />
              </Box>
            </HStack>
            <Text fontSize="2xl" fontWeight="bold" color={textPrimary} lineHeight="1">
              {c.value}
            </Text>
            <Text fontSize="xs" color={textSecondary} mt={1.5}>
              {c.hint}
            </Text>
          </Box>
        );
      })}
    </SimpleGrid>
  );
}
