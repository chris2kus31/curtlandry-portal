"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  HStack,
  Text,
  VStack,
  Flex,
  Input,
  Skeleton,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import {
  LuUserPlus,
  LuSearch,
  LuLaptop,
  LuChevronRight,
  LuInbox,
  LuClipboardList,
  LuPackage,
} from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { onboardingService } from "@/lib/api";
import type { OnboardingCase, OnboardingFormOptions } from "@/lib/api";
import { NewHireIntakeDrawer } from "@/components/onboarding/NewHireIntakeDrawer";
import { OnboardingStatusBadge } from "@/components/onboarding/OnboardingStatusBadge";

type QueueFilter = "active" | "completed" | "all";

function formatStartDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OnboardingPanel() {
  const router = useRouter();
  const { user, hasRole, hasPermission } = useAuthStore();

  const canManage = hasPermission("onboarding.manage") || hasRole("super_admin");
  const canSubmit =
    canManage || !!user?.is_manager || !!user?.has_direct_reports;
  const canManageSoftware =
    hasPermission("software.manage") || hasRole("super_admin");
  const canManageAssets =
    hasPermission("assets.manage") || hasRole("super_admin");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [options, setOptions] = useState<OnboardingFormOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [cases, setCases] = useState<OnboardingCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(canManage);
  const [filter, setFilter] = useState<QueueFilter>("active");
  const [search, setSearch] = useState("");

  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const rowHoverBg = useColorModeValue("gray.50", "gray.800");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const segBg = useColorModeValue("gray.100", "gray.800");
  const segHoverBg = useColorModeValue("gray.200", "gray.700");

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const data = await onboardingService.getOptions();
      setOptions(data);
    } catch {
      setOptions(null);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  const loadCases = useCallback(async () => {
    if (!canManage) return;
    setCasesLoading(true);
    try {
      const res = await onboardingService.list({
        active: filter === "active" || undefined,
        status: filter === "completed" ? "completed" : undefined,
        per_page: 50,
        sort_by: "start_date",
        sort_dir: "asc",
      });
      setCases(res.data ?? []);
    } catch {
      setCases([]);
    } finally {
      setCasesLoading(false);
    }
  }, [canManage, filter]);

  useEffect(() => {
    if (canSubmit) loadOptions();
  }, [canSubmit, loadOptions]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return cases;
    return cases.filter((c) => {
      const name = c.new_hire?.name?.toLowerCase() ?? "";
      const email = c.new_hire?.email?.toLowerCase() ?? "";
      const dept = c.department?.toLowerCase() ?? "";
      return name.includes(term) || email.includes(term) || dept.includes(term);
    });
  }, [cases, search]);

  const handleCreated = useCallback(() => {
    loadCases();
  }, [loadCases]);

  return (
    <VStack gap={8} align="stretch">
      {/* Sub-header + action */}
      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={4}
      >
        <Text color={textSecondary}>
          {canManage
            ? "Submit new hires and track their setup through HR & IT."
            : "Submit a new hire and HR & IT will take it from there."}
        </Text>
        <HStack gap={3} flexShrink={0}>
          {canManageAssets && (
            <Box
              as="button"
              onClick={() => router.push("/people-ops/assets")}
              px={4}
              py={2.5}
              borderRadius="lg"
              fontWeight="medium"
              border="1px solid"
              borderColor={borderColor}
              color={textPrimary}
              bg="transparent"
              display="flex"
              alignItems="center"
              gap={2}
              _hover={{ bg: rowHoverBg }}
              transition="all 0.15s"
            >
              <LuLaptop size={18} />
              Asset Inventory
            </Box>
          )}
          {canManageSoftware && (
            <Box
              as="button"
              onClick={() => router.push("/people-ops/software")}
              px={4}
              py={2.5}
              borderRadius="lg"
              fontWeight="medium"
              border="1px solid"
              borderColor={borderColor}
              color={textPrimary}
              bg="transparent"
              display="flex"
              alignItems="center"
              gap={2}
              _hover={{ bg: rowHoverBg }}
              transition="all 0.15s"
            >
              <LuPackage size={18} />
              Software Catalog
            </Box>
          )}
          <Box
            as="button"
            onClick={() => setDrawerOpen(true)}
            bg="brand.500"
            color="white"
            px={4}
            py={2.5}
            borderRadius="lg"
            fontWeight="medium"
            display="flex"
            alignItems="center"
            gap={2}
            _hover={{ bg: "brand.600" }}
            transition="all 0.15s"
          >
            <LuUserPlus size={18} />
            New Hire
          </Box>
        </HStack>
      </Flex>

      {/* Manager-only quick explainer */}
      {!canManage && (
        <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <Card.Body>
            <HStack gap={4} align="flex-start">
              <Box
                p={3}
                borderRadius="lg"
                bg="brand.500/10"
                color="brand.500"
                flexShrink={0}
              >
                <LuClipboardList size={22} />
              </Box>
              <Box>
                <Text fontWeight="semibold" color={textPrimary}>
                  How new hire intake works
                </Text>
                <Text color={textSecondary} fontSize="sm" mt={1}>
                  Submit the new hire&apos;s details and device needs. We create
                  their (inactive) account, set up PTO anchored to their start
                  date, and notify HR &amp; IT to finish provisioning. Their
                  account activates automatically on day one.
                </Text>
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Cases queue (HR/IT + super admin) */}
      {canManage && (
        <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <Card.Body>
            <Flex
              justify="space-between"
              align={{ base: "stretch", md: "center" }}
              direction={{ base: "column", md: "row" }}
              gap={3}
              mb={5}
            >
              <HStack gap={1} bg={segBg} p={1} borderRadius="lg" w="fit-content">
                {(["active", "completed", "all"] as QueueFilter[]).map((key) => {
                  const active = filter === key;
                  return (
                    <Box
                      key={key}
                      as="button"
                      px={4}
                      py={1.5}
                      borderRadius="md"
                      fontSize="sm"
                      fontWeight="medium"
                      textTransform="capitalize"
                      bg={active ? cardBg : "transparent"}
                      color={active ? textPrimary : textSecondary}
                      boxShadow={active ? "sm" : "none"}
                      onClick={() => setFilter(key)}
                      cursor="pointer"
                      _hover={active ? undefined : { bg: segHoverBg, color: textPrimary }}
                      transition="all 0.15s"
                    >
                      {key}
                    </Box>
                  );
                })}
              </HStack>

              <Box position="relative" maxW={{ base: "full", md: "280px" }} w="full">
                <Box
                  position="absolute"
                  left={3}
                  top="50%"
                  transform="translateY(-50%)"
                  color={textMuted}
                  pointerEvents="none"
                >
                  <LuSearch size={16} />
                </Box>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, dept…"
                  bg={inputBg}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="lg"
                  pl={9}
                  px={4}
                  _focus={{ borderColor: "brand.500" }}
                />
              </Box>
            </Flex>

            {casesLoading ? (
              <VStack gap={3} align="stretch">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height="64px" borderRadius="lg" />
                ))}
              </VStack>
            ) : filteredCases.length === 0 ? (
              <VStack gap={3} py={12} textAlign="center">
                <Box color={textMuted}>
                  <LuInbox size={40} />
                </Box>
                <Text color={textPrimary} fontWeight="medium">
                  No onboarding cases
                </Text>
                <Text color={textSecondary} fontSize="sm">
                  {filter === "active"
                    ? "There are no active cases right now."
                    : filter === "completed"
                      ? "No completed cases yet."
                      : "Submit a new hire to get started."}
                </Text>
              </VStack>
            ) : (
              <VStack gap={2} align="stretch">
                {filteredCases.map((c) => (
                  <Flex
                    key={c.id}
                    align="center"
                    gap={4}
                    px={4}
                    py={3}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={borderColor}
                    cursor="pointer"
                    onClick={() => router.push(`/people-ops/onboarding/${c.id}`)}
                    _hover={{ bg: rowHoverBg, borderColor: "brand.300" }}
                    transition="all 0.15s"
                  >
                    <Box flex={1} minW={0}>
                      <Text fontWeight="semibold" color={textPrimary} truncate>
                        {c.new_hire?.name ?? "New hire"}
                      </Text>
                      <Text fontSize="sm" color={textSecondary} truncate>
                        {c.new_hire?.email ?? ""}
                        {c.department ? ` · ${c.department}` : ""}
                      </Text>
                    </Box>

                    <Box
                      display={{ base: "none", sm: "block" }}
                      textAlign="right"
                      minW="110px"
                    >
                      <Text fontSize="xs" color={textMuted}>
                        Start date
                      </Text>
                      <Text fontSize="sm" color={textPrimary} fontWeight="medium">
                        {formatStartDate(c.start_date)}
                      </Text>
                    </Box>

                    {c.device_needed && (
                      <Box
                        display={{ base: "none", md: "flex" }}
                        color={textMuted}
                        title="Device requested"
                      >
                        <LuLaptop size={18} />
                      </Box>
                    )}

                    <OnboardingStatusBadge
                      label={c.status_label}
                      color={c.status_color}
                    />

                    <Box color={textMuted}>
                      <LuChevronRight size={18} />
                    </Box>
                  </Flex>
                ))}
              </VStack>
            )}
          </Card.Body>
        </Card.Root>
      )}

      <NewHireIntakeDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
        options={options}
        optionsLoading={optionsLoading}
      />
    </VStack>
  );
}
