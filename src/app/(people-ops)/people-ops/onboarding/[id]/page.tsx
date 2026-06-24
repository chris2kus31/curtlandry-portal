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
  Textarea,
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
  LuMapPin,
  LuCalendar,
  LuLaptop,
  LuMessageSquare,
  LuSend,
  LuShieldAlert,
  LuBan,
  LuUser,
  LuPackage,
  LuTriangleAlert,
} from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { onboardingService } from "@/lib/api";
import type {
  OnboardingCase,
  OnboardingTaskStatus,
  OnboardingChecklistItem,
  UpdateTaskPayload,
} from "@/lib/api";
import { OnboardingStatusBadge } from "@/components/onboarding/OnboardingStatusBadge";
import { OnboardingTaskCard } from "@/components/onboarding/OnboardingTaskCard";

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

export default function OnboardingCaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = Number(params?.id);

  const { hasRole, hasPermission } = useAuthStore();
  const canManage = hasPermission("onboarding.manage") || hasRole("super_admin");

  const [data, setData] = useState<OnboardingCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<number | null>(null);

  // Colors
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const subtleBg = useColorModeValue("gray.50", "gray.800");
  const iconColor = useColorModeValue("gray.400", "gray.500");

  const load = useCallback(
    async (silent = false) => {
      if (!canManage || !caseId) return;
      if (!silent) setLoading(true);
      try {
        const result = await onboardingService.get(caseId);
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

  const handleAddNote = async () => {
    const body = noteBody.trim();
    if (!body || !data) return;
    setSavingNote(true);
    try {
      const note = await onboardingService.addNote(data.id, body);
      setData((prev) =>
        prev ? { ...prev, notes: [note, ...(prev.notes ?? [])] } : prev,
      );
      setNoteBody("");
      toaster.create({ title: "Note added", type: "success" });
    } catch (error) {
      toaster.create({
        title: "Failed to add note",
        description: error instanceof Error ? error.message : "Try again",
        type: "error",
      });
    } finally {
      setSavingNote(false);
    }
  };

  const handleCancel = async () => {
    if (!data) return;
    if (
      !window.confirm(
        "Cancel this onboarding case? This stops the workflow for this hire.",
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      const updated = await onboardingService.cancel(data.id);
      setData((prev) => (prev ? { ...prev, ...updated } : updated));
      toaster.create({ title: "Onboarding cancelled", type: "success" });
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

  const mutateTask = async (
    taskId: number,
    payload: UpdateTaskPayload,
    reloadCase: boolean,
  ) => {
    if (!data) return;
    setSavingTaskId(taskId);
    try {
      const updated = await onboardingService.updateTask(
        data.id,
        taskId,
        payload,
      );
      if (reloadCase) {
        // A status change can auto-complete/reopen the whole case.
        await load(true);
      } else {
        setData((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks?.map((t) => (t.id === taskId ? updated : t)),
              }
            : prev,
        );
      }
    } catch (error) {
      toaster.create({
        title: "Failed to update task",
        description: error instanceof Error ? error.message : "Try again",
        type: "error",
      });
      await load(true);
    } finally {
      setSavingTaskId(null);
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

  // Access guard (API also enforces this).
  if (!canManage) {
    return (
      <VStack gap={6} align="stretch">
        <BackButton onClick={() => router.push("/people-ops")} />
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
                Only HR/IT and admins can view onboarding case details.
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
        <BackButton onClick={() => router.push("/people-ops")} />
        <Skeleton height="120px" borderRadius="xl" />
        <Skeleton height="200px" borderRadius="xl" />
      </VStack>
    );
  }

  if (notFound || !data) {
    return (
      <VStack gap={6} align="stretch">
        <BackButton onClick={() => router.push("/people-ops")} />
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

  const isActive =
    data.status !== "completed" && data.status !== "cancelled";
  const tasks = data.tasks ?? [];
  const notes = data.notes ?? [];
  const software = data.software ?? [];

  return (
    <VStack gap={6} align="stretch">
      <BackButton onClick={() => router.push("/people-ops")} />

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
              {data.new_hire?.name ?? "New hire"}
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
            Cancel Onboarding
          </Box>
        )}
      </Flex>

      {/* Details + Device */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <Card.Body>
            <Text fontWeight="semibold" color={textPrimary} mb={4}>
              Hire Details
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
              <InfoRow
                icon={<LuMail size={16} />}
                label="Email"
                value={data.new_hire?.email}
              />
              <InfoRow
                icon={<LuCalendar size={16} />}
                label="Start date"
                value={formatStartDate(data.start_date)}
              />
              <InfoRow
                icon={<LuBriefcase size={16} />}
                label="Job title"
                value={data.new_hire?.job_title}
              />
              <InfoRow
                icon={<LuBuilding size={16} />}
                label="Department"
                value={data.department}
              />
              <InfoRow
                icon={<LuMapPin size={16} />}
                label="Work location"
                value={data.work_location_label}
              />
              <InfoRow
                icon={<LuUser size={16} />}
                label="Submitted by"
                value={data.submitted_by_user?.name}
              />
            </SimpleGrid>
          </Card.Body>
        </Card.Root>

        <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <Card.Body>
            <HStack gap={2} mb={4}>
              <Box color={iconColor}>
                <LuLaptop size={18} />
              </Box>
              <Text fontWeight="semibold" color={textPrimary}>
                Device &amp; Equipment
              </Text>
            </HStack>
            {!data.device_needed ? (
              <Text fontSize="sm" color={textSecondary}>
                No device requested for this hire.
              </Text>
            ) : (
              <VStack align="stretch" gap={3}>
                {data.requested_asset && (
                  <InfoRow
                    icon={<LuLaptop size={16} />}
                    label="Assigned device"
                    value={`${data.requested_asset.name}${
                      data.requested_asset.asset_tag
                        ? ` (${data.requested_asset.asset_tag})`
                        : ""
                    }`}
                  />
                )}
                {data.purchase_needed && (
                  <Box
                    px={4}
                    py={2}
                    bg="warning.bg"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="warning.surface"
                  >
                    <Text fontSize="sm" color="warning.strong" fontWeight="medium">
                      New device purchase requested
                    </Text>
                  </Box>
                )}
                {data.requested_device_note && (
                  <Box>
                    <Text fontSize="xs" color={textMuted} mb={1}>
                      Notes
                    </Text>
                    <Text fontSize="sm" color={textPrimary}>
                      {data.requested_device_note}
                    </Text>
                  </Box>
                )}
                {!data.requested_asset &&
                  !data.purchase_needed &&
                  !data.requested_device_note && (
                    <Text fontSize="sm" color={textSecondary}>
                      Device needed — no specifics provided.
                    </Text>
                  )}
              </VStack>
            )}
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {/* Software */}
      {software.length > 0 && (
        <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <Card.Body>
            <HStack gap={2} mb={4}>
              <Box color={iconColor}>
                <LuPackage size={18} />
              </Box>
              <Text fontWeight="semibold" color={textPrimary}>
                Software
              </Text>
            </HStack>
            <Flex gap={2} flexWrap="wrap">
              {software.map((sw) => (
                <HStack
                  key={sw.id}
                  px={3}
                  py={1.5}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={borderColor}
                  bg={subtleBg}
                  gap={2}
                >
                  <Box color={sw.requires_approval ? "orange.400" : textMuted}>
                    <LuPackage size={14} />
                  </Box>
                  <Text fontSize="sm" color={textPrimary} fontWeight="medium">
                    {sw.name}
                  </Text>
                  {sw.requires_approval && (
                    <HStack
                      gap={1}
                      px={1.5}
                      py={0.5}
                      borderRadius="md"
                      bg="orange.500/10"
                      color="orange.600"
                    >
                      <LuTriangleAlert size={11} />
                      <Text fontSize="xs" fontWeight="medium">
                        Approval
                      </Text>
                    </HStack>
                  )}
                </HStack>
              ))}
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      {/* Tasks */}
      <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <Card.Body>
          <Text fontWeight="semibold" color={textPrimary} mb={4}>
            Setup Tasks
          </Text>
          {tasks.length === 0 ? (
            <Text fontSize="sm" color={textSecondary}>
              No tasks have been created for this case.
            </Text>
          ) : (
            <VStack align="stretch" gap={3}>
              {tasks.map((task) => (
                <OnboardingTaskCard
                  key={task.id}
                  task={task}
                  saving={savingTaskId === task.id}
                  onUpdateChecklist={(checklist: OnboardingChecklistItem[]) =>
                    mutateTask(task.id, { checklist }, false)
                  }
                  onSetStatus={(status: OnboardingTaskStatus) =>
                    mutateTask(task.id, { status }, true)
                  }
                  onSetWaitingOn={(text: string) =>
                    mutateTask(task.id, { waiting_on: text }, false)
                  }
                />
              ))}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>

      {/* Notes */}
      <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <Card.Body>
          <HStack gap={2} mb={4}>
            <Box color={iconColor}>
              <LuMessageSquare size={18} />
            </Box>
            <Text fontWeight="semibold" color={textPrimary}>
              Notes
            </Text>
          </HStack>

          <Box mb={notes.length > 0 ? 5 : 0}>
            <Textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Add an internal note…"
              bg={inputBg}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="lg"
              px={4}
              py={2}
              rows={3}
              _focus={{ borderColor: "brand.500" }}
            />
            <Flex justify="flex-end" mt={2}>
              <Box
                as="button"
                onClick={savingNote || !noteBody.trim() ? undefined : handleAddNote}
                aria-disabled={savingNote || !noteBody.trim()}
                px={4}
                py={2}
                borderRadius="lg"
                fontWeight="medium"
                bg="brand.500"
                color="white"
                display="flex"
                alignItems="center"
                gap={2}
                opacity={savingNote || !noteBody.trim() ? 0.6 : 1}
                cursor={
                  savingNote || !noteBody.trim() ? "not-allowed" : "pointer"
                }
                _hover={{
                  bg: savingNote || !noteBody.trim() ? "brand.500" : "brand.600",
                }}
                transition="all 0.15s"
              >
                {savingNote ? <Spinner size="sm" /> : <LuSend size={14} />}
                Add Note
              </Box>
            </Flex>
          </Box>

          {notes.length > 0 && (
            <VStack align="stretch" gap={3}>
              {notes.map((note) => (
                <Box
                  key={note.id}
                  px={4}
                  py={3}
                  borderRadius="lg"
                  bg={subtleBg}
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
                      {note.author?.name ?? "Unknown"}
                    </Text>
                    <Text fontSize="xs" color={textMuted}>
                      {formatTimestamp(note.created_at)}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={textSecondary} whiteSpace="pre-wrap">
                    {note.body}
                  </Text>
                </Box>
              ))}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>
    </VStack>
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
      Back to onboarding
    </Box>
  );
}
