"use client";

import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Text,
  VStack,
  chakra,
} from "@chakra-ui/react";
import {
  LuArrowDown,
  LuArrowUp,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import type { SchemaOption } from "@/lib/api/admin-applications-service";
import {
  move,
  normalizeOption,
  removeAt,
  replaceAt,
  slugify,
  uniqueKey,
} from "./helpers";

interface Props {
  options: (string | SchemaOption)[];
  onChange: (next: SchemaOption[]) => void;
}

/**
 * Edits the list of options for select / radio / checkbox_group fields.
 * Each option exposes label + value (auto-synced from label on first
 * entry; user can override). The optional `icon` field accepts a Lucide
 * icon name string — kept lightweight (no icon picker yet).
 */
export function OptionsEditor({ options, onChange }: Props) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const rowBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const normalized = options.map(normalizeOption);

  const updateOption = (i: number, patch: Partial<SchemaOption>) => {
    const next: SchemaOption = { ...normalized[i], ...patch };
    onChange(replaceAt(normalized, i, next));
  };

  const addOption = () => {
    const newValue = uniqueKey(
      "option",
      normalized.map((o) => o.value),
    );
    onChange([
      ...normalized,
      { value: newValue, label: `Option ${normalized.length + 1}` },
    ]);
  };

  return (
    <VStack align="stretch" gap={2}>
      {normalized.map((opt, i) => (
        <Flex
          key={`${opt.value}-${i}`}
          align="center"
          gap={2}
          bg={rowBg}
          borderWidth={1}
          borderColor={borderColor}
          borderRadius="md"
          p={2}
        >
          <Box flex={1}>
            <Text fontSize="2xs" color={subduedText} mb={1} textTransform="uppercase">
              Label
            </Text>
            <Input
              size="sm"
              px={4}
              value={opt.label}
              onChange={(e) => {
                // If the user hasn't customized the value, keep it in sync.
                const auto = slugify(opt.label) === opt.value;
                const nextLabel = e.target.value;
                updateOption(i, {
                  label: nextLabel,
                  ...(auto ? { value: slugify(nextLabel) || opt.value } : {}),
                });
              }}
            />
          </Box>
          <Box w="160px">
            <Text fontSize="2xs" color={subduedText} mb={1} textTransform="uppercase">
              Stored value
            </Text>
            <Input
              size="sm"
              px={4}
              value={opt.value}
              onChange={(e) => updateOption(i, { value: e.target.value })}
            />
          </Box>
          <Box w="140px">
            <Text fontSize="2xs" color={subduedText} mb={1} textTransform="uppercase">
              Icon (optional)
            </Text>
            <Input
              size="sm"
              px={4}
              placeholder="LuRocket"
              value={opt.icon ?? ""}
              onChange={(e) => updateOption(i, { icon: e.target.value || undefined })}
            />
          </Box>
          <Flex direction="column" gap={1} mt={4}>
            <IconButton
              aria-label="Move up"
              size="2xs"
              variant="ghost"
              disabled={i === 0}
              onClick={() => onChange(move(normalized, i, -1))}
            >
              <LuArrowUp size={12} />
            </IconButton>
            <IconButton
              aria-label="Move down"
              size="2xs"
              variant="ghost"
              disabled={i === normalized.length - 1}
              onClick={() => onChange(move(normalized, i, 1))}
            >
              <LuArrowDown size={12} />
            </IconButton>
          </Flex>
          <IconButton
            aria-label="Remove option"
            size="xs"
            variant="ghost"
            colorPalette="red"
            onClick={() => onChange(removeAt(normalized, i))}
            mt={4}
          >
            <LuTrash2 size={14} />
          </IconButton>
        </Flex>
      ))}

      <chakra.div>
        <Button size="xs" variant="outline" px={4} onClick={addOption}>
          <LuPlus /> Add option
        </Button>
      </chakra.div>

      {normalized.length === 0 && (
        <Text fontSize="xs" color={subduedText}>
          No options yet — applicants won&apos;t see anything to pick from.
        </Text>
      )}
    </VStack>
  );
}
