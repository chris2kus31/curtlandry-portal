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
  LuUserMinus,
  LuSearch,
  LuChevronRight,
  LuInbox,
  LuClipboardList,
  LuLaptop,
} from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { offboardingService } from "@/lib/api";
import type { OffboardingCase, OffboardingFormOptions } from "@/lib/api";
import { ResignationDrawer } from "@/components/offboarding/ResignationDrawer";
import { OnboardingStatusBadge } from "@/components/onboarding/OnboardingStatusBadge";

type QueueFilter = "active" | "completed" | "all";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OffboardingPanel() {
  const router = useRouter();
  const { hasRole, hasPermission } = useAuthStore();

  const canManage = hasPermission("onboarding.manage") || hasRole("super_admin");
  const canSubmit = canManage || hasPermission("offboarding.submit");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [options, setOptions] = useState<OffboardingFormOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [cases, setCases] = useState<OffboardingCase[]>([]);
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

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const data = await offboardingService.getOptions();
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
      const res = await offboardingService.list({
        active: filter === "active" || undefined,
        status: filter === "completed" ? "completed" : undefined,
        per_page: 50,
        sort_by: "last_day",
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
      const dept = c.new_hire?.department?.toLowerCase() ?? "";
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
            ? "Submit resignations and work device recovery & account deactivation."
            : "Submit a resignation and IT & HR will take it from there."}
        </Text>
        <Box
          as="button"
          onClick={() => setDrawerOpen(true)}
          bg="red.500"
          color="white"
          px={4}
          py={2.5}
          borderRadius="lg"
          fontWeight="medium"
          display="flex"
          alignItems="center"
          gap={2}
          flexShrink={0}
          _hover={{ bg: "red.600" }}
          transition="all 0.15s"
        >
          <LuUserMinus size={18} />
          Submit Resignation
        </Box>
      </Flex>

      {/* HR-only explainer */}
      {!canManage && (
        <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <Card.Body>
            <HStack gap={4} align="flex-start">
              <Box
                p={3}
                borderRadius="lg"
                bg="red.500/10"
                color="red.500"
                flexShrink={0}
              >
                <LuClipboardList size={22} />
              </Box>
              <Box>
                <Text fontWeight="semibold" color={textPrimary}>
                  How resignations work
                </Text>
                <Text color={textSecondary} fontSize="sm" mt={1}>
                  Submit the departing employee and their last day. IT is
                  notified to recover any company devices and deactivate the
                  account. As a safety net, the account is automatically
                  deactivated on or after the last day.
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
                  No offboarding cases
                </Text>
                <Text color={textSecondary} fontSize="sm">
                  {filter === "active"
                    ? "There are no active cases right now."
                    : filter === "completed"
                      ? "No completed cases yet."
                      : "Submit a resignation to get started."}
                </Text>
              </VStack>
            ) : (
              <VStack gap={2} align="stretch">
                {filteredCases.map((c) => {
                  const outstanding = c.assigned_devices?.length ?? 0;
                  return (
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
                      onClick={() => router.push(`/people-ops/offboarding/${c.id}`)}
                      _hover={{ bg: rowHoverBg, borderColor: "brand.300" }}
                      transition="all 0.15s"
                    >
                      <Box flex={1} minW={0}>
                        <Text fontWeight="semibold" color={textPrimary} truncate>
                          {c.new_hire?.name ?? "Employee"}
                        </Text>
                        <Text fontSize="sm" color={textSecondary} truncate>
                          {c.new_hire?.email ?? ""}
                          {c.new_hire?.department
                            ? ` · ${c.new_hire.department}`
                            : ""}
                        </Text>
                      </Box>

                      <Box
                        display={{ base: "none", sm: "block" }}
                        textAlign="right"
                        minW="110px"
                      >
                        <Text fontSize="xs" color={textMuted}>
                          Last day
                        </Text>
                        <Text fontSize="sm" color={textPrimary} fontWeight="medium">
                          {formatDate(c.last_day)}
                        </Text>
                      </Box>

                      {outstanding > 0 && (
                        <HStack
                          display={{ base: "none", md: "flex" }}
                          gap={1}
                          color="orange.500"
                          title={`${outstanding} device(s) to recover`}
                        >
                          <LuLaptop size={16} />
                          <Text fontSize="xs" fontWeight="medium">
                            {outstanding}
                          </Text>
                        </HStack>
                      )}

                      <OnboardingStatusBadge
                        label={c.status_label}
                        color={c.status_color}
                      />

                      <Box color={textMuted}>
                        <LuChevronRight size={18} />
                      </Box>
                    </Flex>
                  );
                })}
              </VStack>
            )}
          </Card.Body>
        </Card.Root>
      )}

      <ResignationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
        options={options}
        optionsLoading={optionsLoading}
      />
    </VStack>
  );
}
