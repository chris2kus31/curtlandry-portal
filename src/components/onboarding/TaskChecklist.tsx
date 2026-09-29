"use client";

import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { LuCircle, LuCircleCheck } from "react-icons/lu";
import type { OnboardingChecklistItem } from "@/lib/api";

interface TaskChecklistProps {
  items: OnboardingChecklistItem[];
  /** Locked or saving tasks render read-only. */
  interactive: boolean;
  onToggle: (index: number) => void;
}

export function TaskChecklist({
  items,
  interactive,
  onToggle,
}: TaskChecklistProps) {
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const itemHoverBg = useColorModeValue("gray.100", "gray.700");
  const iconColor = useColorModeValue("gray.400", "gray.500");

  if (items.length === 0) return null;

  return (
    <VStack align="stretch" gap={1} mb={3}>
      {items.map((item, idx) => (
        <HStack
          key={idx}
          gap={2}
          align="center"
          px={2}
          py={1.5}
          borderRadius="md"
          cursor={interactive ? "pointer" : "default"}
          onClick={() => interactive && onToggle(idx)}
          _hover={interactive ? { bg: itemHoverBg } : undefined}
          transition="background 0.15s"
        >
          <Box color={item.done ? "green.500" : iconColor} flexShrink={0}>
            {item.done ? <LuCircleCheck size={18} /> : <LuCircle size={18} />}
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
  );
}
