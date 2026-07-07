"use client";

import { Box, HStack, Text, VStack, Flex, Spinner, Input } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import {
  LuCircle,
  LuCircleCheck,
  LuLock,
  LuPlay,
  LuClock,
  LuCheck,
  LuRotateCcw,
} from "react-icons/lu";
import type {
  OnboardingTask,
  OnboardingTaskStatus,
  OnboardingChecklistItem,
} from "@/lib/api";
import { OnboardingStatusBadge } from "./OnboardingStatusBadge";

interface OnboardingTaskCardProps {
  task: OnboardingTask;
  saving: boolean;
  onUpdateChecklist: (checklist: OnboardingChecklistItem[]) => void;
  onSetStatus: (status: OnboardingTaskStatus) => void;
  onSetWaitingOn: (text: string) => void;
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

function TaskActionButton({
  icon,
  label,
  onClick,
  saving,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  saving: boolean;
  primary?: boolean;
}) {
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.700");

  return (
    <Box
      as="button"
      onClick={saving ? undefined : onClick}
      aria-disabled={saving}
      display="inline-flex"
      alignItems="center"
      gap={2}
      px={4}
      py={2}
      borderRadius="lg"
      fontSize="sm"
      fontWeight="medium"
      border="1px solid"
      borderColor={primary ? "brand.500" : borderColor}
      bg={primary ? "brand.500" : "transparent"}
      color={primary ? "white" : textSecondary}
      opacity={saving ? 0.6 : 1}
      cursor={saving ? "not-allowed" : "pointer"}
      _hover={{
        bg: primary ? "brand.600" : hoverBg,
        borderColor: primary ? "brand.600" : "brand.300",
      }}
      transition="all 0.15s"
    >
      {icon}
      {label}
    </Box>
  );
}

export function OnboardingTaskCard({
  task,
  saving,
  onUpdateChecklist,
  onSetStatus,
  onSetWaitingOn,
}: OnboardingTaskCardProps) {
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const subtleBg = useColorModeValue("gray.50", "gray.800");
  const inputBg = useColorModeValue("white", "gray.900");
  const itemHoverBg = useColorModeValue("gray.100", "gray.700");
  const iconColor = useColorModeValue("gray.400", "gray.500");

  const locked = task.is_locked;
  const interactive = !locked && !saving;

  const toggleItem = (index: number) => {
    if (!interactive) return;
    const next = task.checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item,
    );
    onUpdateChecklist(next);
  };

  const commitWaitingOn = (value: string) => {
    const trimmed = value.trim();
    if (trimmed !== (task.waiting_on ?? "")) {
      onSetWaitingOn(trimmed);
    }
  };

  return (
    <Box
      px={4}
      py={4}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      bg={subtleBg}
    >
      <Flex justify="space-between" align="center" gap={3} mb={3}>
        <HStack gap={2} minW={0}>
          {locked && (
            <Box color={textMuted} flexShrink={0}>
              <LuLock size={14} />
            </Box>
          )}
          <Text fontWeight="semibold" color={textPrimary} truncate>
            {task.title}
          </Text>
        </HStack>
        <HStack gap={2} flexShrink={0}>
          {saving && <Spinner size="sm" color="brand.500" />}
          <OnboardingStatusBadge
            label={task.status_label}
            color={task.status_color}
          />
        </HStack>
      </Flex>

      {/* Checklist */}
      {task.checklist.length > 0 && (
        <VStack align="stretch" gap={1} mb={3}>
          {task.checklist.map((item, idx) => (
            <HStack
              key={idx}
              gap={2}
              align="center"
              px={2}
              py={1.5}
              borderRadius="md"
              cursor={interactive ? "pointer" : "default"}
              onClick={() => toggleItem(idx)}
              _hover={interactive ? { bg: itemHoverBg } : undefined}
              transition="background 0.15s"
            >
              <Box color={item.done ? "green.500" : iconColor} flexShrink={0}>
                {item.done ? (
                  <LuCircleCheck size={18} />
                ) : (
                  <LuCircle size={18} />
                )}
              </Box>
              <Text
                fontSize="sm"
                color={item.done ? textMuted : textPrimary}
                textDecoration={item.done ? "line-through" : "none"}
              >
                {item.label}
              </Text>
            </HStack>
          ))}
        </VStack>
      )}

      {/* Waiting-on reason (editable while task is in "waiting on") */}
      {!locked && task.status === "waiting_on" && (
        <Box mb={3}>
          <Text fontSize="xs" color={textMuted} mb={1}>
            Waiting on
          </Text>
          <Input
            key={`waiting-${task.id}-${task.waiting_on ?? ""}`}
            defaultValue={task.waiting_on ?? ""}
            onBlur={(e) => commitWaitingOn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="What's blocking this task?"
            size="sm"
            bg={inputBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="lg"
            px={4}
            _focus={{ borderColor: "brand.500" }}
          />
        </Box>
      )}

      {locked && task.waiting_on && (
        <Text fontSize="xs" color={textMuted} mb={2}>
          Was waiting on: {task.waiting_on}
        </Text>
      )}

      {/* Completion meta */}
      {task.completed_at && (
        <Text fontSize="xs" color={textMuted} mb={3}>
          Completed {formatTimestamp(task.completed_at)}
          {task.completed_by_user ? ` by ${task.completed_by_user.name}` : ""}
        </Text>
      )}

      {/* Actions */}
      <Flex gap={2} flexWrap="wrap">
        {locked ? (
          <TaskActionButton
            icon={<LuRotateCcw size={15} />}
            label="Reopen"
            saving={saving}
            onClick={() => onSetStatus("in_progress")}
          />
        ) : (
          <>
            {task.status === "pending" && (
              <TaskActionButton
                icon={<LuPlay size={15} />}
                label="Start"
                saving={saving}
                onClick={() => onSetStatus("in_progress")}
              />
            )}
            {task.status !== "waiting_on" && (
              <TaskActionButton
                icon={<LuClock size={15} />}
                label="Waiting on"
                saving={saving}
                onClick={() => onSetStatus("waiting_on")}
              />
            )}
            <TaskActionButton
              icon={<LuCheck size={15} />}
              label="Mark complete"
              primary
              saving={saving}
              onClick={() => {
                if (
                  window.confirm(
                    "Mark this task complete? It will lock — reopen it if you need to make changes.",
                  )
                ) {
                  onSetStatus("completed");
                }
              }}
            />
          </>
        )}
      </Flex>
    </Box>
  );
}
