"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Card,
  Heading,
  HStack,
  Text,
  VStack,
  Flex,
  Spinner,
  Skeleton,
  SimpleGrid,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuArrowLeft,
  LuMail,
  LuBriefcase,
  LuBuilding,
  LuCalendar,
  LuLaptop,
  LuShieldAlert,
  LuBan,
  LuUser,
  LuUserX,
  LuPackageCheck,
  LuCheck,
} from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { offboardingService } from "@/lib/api";
import type { OffboardingCase } from "@/lib/api";
import { OnboardingStatusBadge } from "@/components/onboarding/OnboardingStatusBadge";

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

function formatTimestamp(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OffboardingCaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = Number(params?.id);

  const { hasRole, hasPermission } = useAuthStore();
  const canManage = hasPermission("onboarding.manage") || hasRole("super_admin");

  const [data, setData] = useState<OffboardingCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [recovering, setRecovering] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const subtleBg = useColorModeValue("gray.50", "gray.800");
  const iconColor = useColorModeValue("gray.400", "gray.500");
  const successColor = useColorModeValue("green.500", "green.400");

  const load = useCallback(
    async (silent = false) => {
      if (!canManage || !caseId) return;
      if (!silent) setLoading(true);
      try {
        const result = await offboardingService.get(caseId);
        setData(result);
      } catch {
        if (!silent) setNotFound(true);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [canManage, caseId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleRecover = async () => {
    if (!data) return;
    const outstanding = data.assigned_devices?.length ?? 0;
    if (
      !window.confirm(
        outstanding > 0
          ? `Recover ${outstanding} device(s) from ${data.new_hire?.name ?? "this employee"}? They'll move into the backup → wipe → reassignment pipeline.`
          : "Mark device recovery as done? There are no outstanding devices on record.",
      )
    ) {
      return;
    }
    setRecovering(true);
    try {
      const updated = await offboardingService.recoverDevices(data.id);
      setData(updated);
      toaster.create({ title: "Devices recovered", type: "success" });
    } catch (error) {
      toaster.create({
        title: "Failed to recover devices",
        description: error instanceof Error ? error.message : "Try again",
        type: "error",
      });
    } finally {
      setRecovering(false);
    }
  };

  const handleDeactivate = async () => {
    if (!data) return;
    if (
      !window.confirm(
        `Deactivate ${data.new_hire?.name ?? "this employee"}'s account? They will no longer be able to sign in.`,
      )
    ) {
      return;
    }
    setDeactivating(true);
    try {
      const updated = await offboardingService.deactivate(data.id);
      setData(updated);
      toaster.create({ title: "Account deactivated", type: "success" });
    } catch (error) {
      toaster.create({
        title: "Failed to deactivate",
        description: error instanceof Error ? error.message : "Try again",
        type: "error",
      });
    } finally {
      setDeactivating(false);
    }
  };

  const handleCancel = async () => {
    if (!data) return;
    if (
      !window.confirm(
        "Cancel this offboarding case? This stops the workflow (the account is not reactivated automatically).",
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      const updated = await offboardingService.cancel(data.id);
      setData(updated);
      toaster.create({ title: "Offboarding cancelled", type: "success" });
    } catch (error) {
      toaster.create({
        title: "Failed to cancel",
        description: error instanceof Error ? error.message : "Try again",
        type: "error",
      });
    } finally {
      setCancelling(false);
    }
  };

  const InfoRow = ({
    icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
  }) => (
    <HStack gap={3} align="flex-start">
      <Box color={iconColor} mt={0.5}>
        {icon}
      </Box>
      <Box>
        <Text fontSize="xs" color={textMuted}>
          {label}
        </Text>
        <Text fontSize="sm" color={textPrimary} fontWeight="medium">
          {value || "—"}
        </Text>
      </Box>
    </HStack>
  );

  if (!canManage) {
    return (
      <VStack gap={6} align="stretch">
        <BackButton onClick={() => router.push("/people-ops?tab=offboarding")} />
        <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <Card.Body>
            <VStack gap={3} py={10} textAlign="center">
              <Box color={textMuted}>
                <LuShieldAlert size={40} />
              </Box>
              <Text color={textPrimary} fontWeight="medium">
                You don&apos;t have access to this case
              </Text>
              <Text color={textSecondary} fontSize="sm">
                Only HR/IT and admins can view offboarding case details.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    );
  }

  if (loading) {
    return (
      <VStack gap={6} align="stretch">
        <BackButton onClick={() => router.push("/people-ops?tab=offboarding")} />
        <Skeleton height="120px" borderRadius="xl" />
        <Skeleton height="200px" borderRadius="xl" />
      </VStack>
    );
  }

  if (notFound || !data) {
    return (
      <VStack gap={6} align="stretch">
        <BackButton onClick={() => router.push("/people-ops?tab=offboarding")} />
        <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <Card.Body>
            <VStack gap={2} py={10} textAlign="center">
              <Text color={textPrimary} fontWeight="medium">
                Case not found
              </Text>
              <Text color={textSecondary} fontSize="sm">
                It may have been removed or you don&apos;t have access.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    );
  }

  const isActive = data.status !== "completed" && data.status !== "cancelled";
  const outstanding = data.assigned_devices ?? [];
  const recovered = data.recovered_devices ?? [];
  const deviceDone = !!data.device_recovered_at;
  const accountDone = !!data.account_deactivated_at;

  return (
    <VStack gap={6} align="stretch">
      <BackButton onClick={() => router.push("/people-ops?tab=offboarding")} />

      {/* Header */}
      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={4}
      >
        <Box>
          <HStack gap={3} align="center" flexWrap="wrap">
            <Heading as="h1" size="lg" color={textPrimary} fontWeight="bold">
              {data.new_hire?.name ?? "Employee"}
            </Heading>
            <OnboardingStatusBadge
              label={data.status_label}
              color={data.status_color}
              size="md"
            />
            {data.new_hire && !data.new_hire.is_active && (
              <OnboardingStatusBadge label="Account inactive" color="gray" />
            )}
          </HStack>
          {data.new_hire?.job_title && (
            <Text color={textSecondary} mt={1}>
              {data.new_hire.job_title}
            </Text>
          )}
        </Box>
        {isActive && (
          <Box
            as="button"
            onClick={cancelling ? undefined : handleCancel}
            aria-disabled={cancelling}
            px={4}
            py={2.5}
            borderRadius="lg"
            fontWeight="medium"
            border="1px solid"
            borderColor="red.300"
            color="red.500"
            bg="transparent"
            display="flex"
            alignItems="center"
            gap={2}
            opacity={cancelling ? 0.7 : 1}
            cursor={cancelling ? "not-allowed" : "pointer"}
            _hover={{ bg: "red.500/10" }}
            transition="all 0.15s"
          >
            {cancelling ? <Spinner size="sm" /> : <LuBan size={16} />}
            Cancel
          </Box>
        )}
      </Flex>

      {/* Workflow steps + actions */}
      <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <Card.Body>
          <Text fontWeight="semibold" color={textPrimary} mb={4}>
            Offboarding Steps
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {/* Device recovery */}
            <Box
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={deviceDone ? successColor : borderColor}
              bg={subtleBg}
            >
              <HStack justify="space-between" mb={2}>
                <HStack gap={2}>
                  <Box color={deviceDone ? successColor : iconColor}>
                    {deviceDone ? <LuPackageCheck size={18} /> : <LuLaptop size={18} />}
                  </Box>
                  <Text fontWeight="medium" color={textPrimary}>
                    Device Recovery
                  </Text>
                </HStack>
                {deviceDone && (
                  <HStack gap={1} color={successColor}>
                    <LuCheck size={14} />
                    <Text fontSize="xs" fontWeight="medium">
                      Done
                    </Text>
                  </HStack>
                )}
              </HStack>
              <Text fontSize="sm" color={textSecondary} mb={3}>
                {deviceDone
                  ? `Recovered ${formatTimestamp(data.device_recovered_at)}`
                  : outstanding.length > 0
                    ? `${outstanding.length} device(s) still assigned.`
                    : "No devices on record."}
              </Text>
              {isActive && (
                <ActionButton
                  onClick={handleRecover}
                  loading={recovering}
                  label={deviceDone ? "Recover again" : "Recover devices"}
                  icon={<LuPackageCheck size={15} />}
                />
              )}
            </Box>

            {/* Account deactivation */}
            <Box
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={accountDone ? successColor : borderColor}
              bg={subtleBg}
            >
              <HStack justify="space-between" mb={2}>
                <HStack gap={2}>
                  <Box color={accountDone ? successColor : iconColor}>
                    <LuUserX size={18} />
                  </Box>
                  <Text fontWeight="medium" color={textPrimary}>
                    Account Deactivation
                  </Text>
                </HStack>
                {accountDone && (
                  <HStack gap={1} color={successColor}>
                    <LuCheck size={14} />
                    <Text fontSize="xs" fontWeight="medium">
                      Done
                    </Text>
                  </HStack>
                )}
              </HStack>
              <Text fontSize="sm" color={textSecondary} mb={3}>
                {accountDone
                  ? `Deactivated ${formatTimestamp(data.account_deactivated_at)}`
                  : "Account is still active."}
              </Text>
              {isActive && !accountDone && (
                <ActionButton
                  onClick={handleDeactivate}
                  loading={deactivating}
                  label="Deactivate account"
                  icon={<LuUserX size={15} />}
                  danger
                />
              )}
            </Box>
          </SimpleGrid>
        </Card.Body>
      </Card.Root>

      {/* Details */}
      <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <Card.Body>
          <Text fontWeight="semibold" color={textPrimary} mb={4}>
            Employee Details
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <InfoRow
              icon={<LuMail size={16} />}
              label="Email"
              value={data.new_hire?.email}
            />
            <InfoRow
              icon={<LuCalendar size={16} />}
              label="Last day"
              value={formatDate(data.last_day)}
            />
            <InfoRow
              icon={<LuBriefcase size={16} />}
              label="Job title"
              value={data.new_hire?.job_title}
            />
            <InfoRow
              icon={<LuBuilding size={16} />}
              label="Department"
              value={data.new_hire?.department}
            />
            <InfoRow
              icon={<LuUser size={16} />}
              label="Submitted by"
              value={data.submitted_by_user?.name}
            />
          </SimpleGrid>
          {data.reason_note && (
            <Box mt={4}>
              <Text fontSize="xs" color={textMuted} mb={1}>
                Reason / Note
              </Text>
              <Text fontSize="sm" color={textPrimary} whiteSpace="pre-wrap">
                {data.reason_note}
              </Text>
            </Box>
          )}
        </Card.Body>
      </Card.Root>

      {/* Devices */}
      <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <Card.Body>
          <HStack gap={2} mb={4}>
            <Box color={iconColor}>
              <LuLaptop size={18} />
            </Box>
            <Text fontWeight="semibold" color={textPrimary}>
              Devices
            </Text>
          </HStack>

          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="xs" color={textMuted} mb={2}>
                Outstanding ({outstanding.length})
              </Text>
              {outstanding.length === 0 ? (
                <Text fontSize="sm" color={textSecondary}>
                  No devices currently assigned to this employee.
                </Text>
              ) : (
                <VStack align="stretch" gap={2}>
                  {outstanding.map((asset) => (
                    <Flex
                      key={asset.id}
                      align="center"
                      gap={3}
                      px={4}
                      py={2.5}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={borderColor}
                    >
                      <Box color={iconColor}>
                        <LuLaptop size={16} />
                      </Box>
                      <Box flex={1} minW={0}>
                        <Text fontSize="sm" fontWeight="medium" color={textPrimary} truncate>
                          {asset.name}
                          {asset.asset_tag ? ` (${asset.asset_tag})` : ""}
                        </Text>
                        {asset.type_label && (
                          <Text fontSize="xs" color={textSecondary}>
                            {asset.type_label}
                          </Text>
                        )}
                      </Box>
                      <OnboardingStatusBadge
                        label={asset.status_label}
                        color={asset.status_color}
                      />
                    </Flex>
                  ))}
                </VStack>
              )}
            </Box>

            {recovered.length > 0 && (
              <Box>
                <Text fontSize="xs" color={textMuted} mb={2}>
                  Recovered ({recovered.length})
                </Text>
                <VStack align="stretch" gap={2}>
                  {recovered.map((rec) => (
                    <Flex
                      key={rec.id}
                      align="center"
                      gap={3}
                      px={4}
                      py={2.5}
                      borderRadius="lg"
                      bg={subtleBg}
                      border="1px solid"
                      borderColor={borderColor}
                    >
                      <Box color={successColor}>
                        <LuPackageCheck size={16} />
                      </Box>
                      <Box flex={1} minW={0}>
                        <Text fontSize="sm" fontWeight="medium" color={textPrimary} truncate>
                          {rec.asset_name ?? `Asset #${rec.asset_id}`}
                        </Text>
                        <Text fontSize="xs" color={textSecondary}>
                          Released {formatTimestamp(rec.released_at)}
                        </Text>
                      </Box>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}

function ActionButton({
  onClick,
  loading,
  label,
  icon,
  danger = false,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  const bg = danger ? "red.500" : "brand.500";
  const hoverBg = danger ? "red.600" : "brand.600";
  return (
    <Box
      as="button"
      onClick={loading ? undefined : onClick}
      aria-disabled={loading}
      px={4}
      py={2}
      borderRadius="lg"
      fontWeight="medium"
      fontSize="sm"
      bg={bg}
      color="white"
      display="inline-flex"
      alignItems="center"
      gap={2}
      opacity={loading ? 0.7 : 1}
      cursor={loading ? "not-allowed" : "pointer"}
      _hover={{ bg: loading ? bg : hoverBg }}
      transition="all 0.15s"
    >
      {loading ? <Spinner size="sm" /> : icon}
      {label}
    </Box>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  const color = useColorModeValue("gray.600", "gray.400");
  const hoverColor = useColorModeValue("gray.900", "gray.50");
  return (
    <Box
      as="button"
      onClick={onClick}
      display="inline-flex"
      alignItems="center"
      gap={2}
      color={color}
      fontSize="sm"
      fontWeight="medium"
      w="fit-content"
      _hover={{ color: hoverColor }}
      transition="color 0.15s"
    >
      <LuArrowLeft size={16} />
      Back to offboarding
    </Box>
  );
}
