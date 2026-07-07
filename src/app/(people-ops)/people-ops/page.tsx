"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Card, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { LuShieldAlert, LuUserPlus, LuUserMinus } from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { OffboardingPanel } from "@/components/offboarding/OffboardingPanel";
import { PeopleOpsStatsStrip } from "@/components/onboarding/PeopleOpsStatsStrip";

type TabKey = "onboarding" | "offboarding";

function PeopleOpsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasRole, hasPermission } = useAuthStore();

  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const segBg = useColorModeValue("gray.100", "gray.800");
  const segHoverBg = useColorModeValue("gray.200", "gray.700");

  const canManage = hasPermission("onboarding.manage") || hasRole("super_admin");
  const canOnboard =
    canManage || !!user?.is_manager || !!user?.has_direct_reports;
  const canOffboard = canManage || hasPermission("offboarding.submit");

  const tabs = useMemo(() => {
    const t: { key: TabKey; label: string; icon: typeof LuUserPlus }[] = [];
    if (canOnboard) t.push({ key: "onboarding", label: "Onboarding", icon: LuUserPlus });
    if (canOffboard) t.push({ key: "offboarding", label: "Offboarding", icon: LuUserMinus });
    return t;
  }, [canOnboard, canOffboard]);

  const requested = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey | null =
    requested && tabs.some((t) => t.key === requested)
      ? requested
      : (tabs[0]?.key ?? null);

  const setTab = (key: TabKey) => {
    router.replace(`/people-ops?tab=${key}`, { scroll: false });
  };

  // No access to either side (defensive — nav already hides this route).
  if (tabs.length === 0 || !activeTab) {
    return (
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="xl" color={textPrimary} fontWeight="bold">
          People Ops
        </Heading>
        <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <Card.Body>
            <VStack gap={3} py={10} textAlign="center">
              <Box color={textMuted}>
                <LuShieldAlert size={40} />
              </Box>
              <Text color={textPrimary} fontWeight="medium">
                You don&apos;t have access to People Ops
              </Text>
              <Text color={textSecondary} fontSize="sm">
                Onboarding and offboarding are available to managers and HR/IT.
                Reach out to an admin if you think this is a mistake.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading as="h1" size="xl" color={textPrimary} fontWeight="bold">
          People Ops
        </Heading>
        <Text color={textSecondary} mt={1}>
          New hire onboarding and resignation offboarding in one place.
        </Text>
      </Box>

      {canManage && <PeopleOpsStatsStrip />}

      {tabs.length > 1 && (
        <HStack gap={1} bg={segBg} p={1} borderRadius="lg" w="fit-content">
          {tabs.map((t) => {
            const active = activeTab === t.key;
            const Icon = t.icon;
            return (
              <Box
                key={t.key}
                as="button"
                px={4}
                py={2}
                borderRadius="md"
                fontSize="sm"
                fontWeight="medium"
                bg={active ? cardBg : "transparent"}
                color={active ? textPrimary : textSecondary}
                boxShadow={active ? "sm" : "none"}
                onClick={() => setTab(t.key)}
                display="flex"
                alignItems="center"
                gap={2}
                cursor="pointer"
                _hover={active ? undefined : { bg: segHoverBg, color: textPrimary }}
                transition="all 0.15s"
              >
                <Icon size={16} />
                {t.label}
              </Box>
            );
          })}
        </HStack>
      )}

      {activeTab === "onboarding" ? <OnboardingPanel /> : <OffboardingPanel />}
    </VStack>
  );
}

export default function PeopleOpsPage() {
  return (
    <Suspense fallback={null}>
      <PeopleOpsContent />
    </Suspense>
  );
}
