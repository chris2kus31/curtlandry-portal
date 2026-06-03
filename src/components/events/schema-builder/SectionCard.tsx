"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Input,
  Spacer,
  Text,
  VStack,
  chakra,
} from "@chakra-ui/react";
import {
  LuArrowDown,
  LuArrowUp,
  LuChevronDown,
  LuChevronUp,
  LuTrash2,
} from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import type {
  SchemaField,
  SchemaFieldType,
  SchemaSection,
} from "@/lib/api/admin-applications-service";
import {
  defaultField,
  move,
  removeAt,
  replaceAt,
  slugify,
} from "./helpers";
import { FieldCard } from "./FieldCard";
import { AddFieldMenu } from "./AddFieldMenu";

interface Props {
  section: SchemaSection;
  index: number;
  /** Other field keys in the same step (across other sections). */
  otherKeysInStep: string[];
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: SchemaSection) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

/**
 * Section card — collapsible group of fields with its own metadata (key,
 * label). Holds the per-field reorder/edit/remove and the "+ Add field"
 * dialog.
 */
export function SectionCard({
  section,
  index,
  otherKeysInStep,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(true);

  const subduedText = useColorModeValue("gray.600", "gray.400");
  const surfaceBg = useColorModeValue("white", "gray.900");
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const fields = section.fields ?? [];
  const fieldKeys = fields.map((f) => f.key);

  const setProp = <K extends keyof SchemaSection>(k: K, v: SchemaSection[K]) =>
    onChange({ ...section, [k]: v });

  const addField = (type: SchemaFieldType) => {
    const field = defaultField(type, [...otherKeysInStep, ...fieldKeys]);
    onChange({ ...section, fields: [...fields, field] });
  };

  const updateField = (i: number, next: SchemaField) =>
    onChange({ ...section, fields: replaceAt(fields, i, next) });

  const moveField = (i: number, direction: -1 | 1) =>
    onChange({ ...section, fields: move(fields, i, direction) });

  const removeField = (i: number) =>
    onChange({ ...section, fields: removeAt(fields, i) });

  return (
    <Box
      bg={surfaceBg}
      borderWidth={1}
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
    >
      {/* Section header */}
      <Flex align="center" gap={2} px={4} py={3} bg={headerBg}>
        <IconButton
          aria-label={open ? "Collapse section" : "Expand section"}
          size="xs"
          variant="ghost"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
        </IconButton>
        <Text fontSize="xs" color={subduedText} textTransform="uppercase" letterSpacing="wide">
          Section {index + 1}
        </Text>
        <Text fontWeight={600} truncate>
          {section.label || (
            <Box as="span" color={subduedText} fontWeight={400} fontStyle="italic">
              (untitled — fields will render without a heading)
            </Box>
          )}
        </Text>
        <Spacer />
        <Text fontSize="xs" color={subduedText}>
          {fields.length} field{fields.length === 1 ? "" : "s"}
        </Text>
        <Flex direction="column" gap={1}>
          <IconButton
            aria-label="Move section up"
            size="2xs"
            variant="ghost"
            disabled={isFirst}
            onClick={() => onMove(-1)}
          >
            <LuArrowUp size={12} />
          </IconButton>
          <IconButton
            aria-label="Move section down"
            size="2xs"
            variant="ghost"
            disabled={isLast}
            onClick={() => onMove(1)}
          >
            <LuArrowDown size={12} />
          </IconButton>
        </Flex>
        <IconButton
          aria-label="Remove section"
          size="xs"
          variant="ghost"
          colorPalette="red"
          onClick={onRemove}
        >
          <LuTrash2 size={14} />
        </IconButton>
      </Flex>

      {open && (
        <Box p={4}>
          <VStack align="stretch" gap={4}>
            <Flex gap={3} wrap="wrap">
              <Box flex={1} minW="240px">
                <Text
                  fontSize="xs"
                  color={subduedText}
                  textTransform="uppercase"
                  letterSpacing="wide"
                  mb={1}
                >
                  Section label
                </Text>
                <Input
                  px={4}
                  value={section.label ?? ""}
                  placeholder="(optional) e.g. Your name"
                  onChange={(e) => {
                    const auto =
                      !section.key || slugify(section.label ?? "") === section.key;
                    const nextLabel = e.target.value;
                    onChange({
                      ...section,
                      label: nextLabel,
                      ...(auto ? { key: slugify(nextLabel) || section.key } : {}),
                    });
                  }}
                />
              </Box>
              <Box w={{ base: "100%", md: "240px" }}>
                <Text
                  fontSize="xs"
                  color={subduedText}
                  textTransform="uppercase"
                  letterSpacing="wide"
                  mb={1}
                >
                  Section key
                </Text>
                <Input
                  px={4}
                  value={section.key ?? ""}
                  onChange={(e) =>
                    setProp("key", slugify(e.target.value) || e.target.value)
                  }
                />
              </Box>
            </Flex>

            <Box>
              <HStack mb={3}>
                <Text fontSize="sm" fontWeight={600}>
                  Fields
                </Text>
                <Spacer />
                <AddFieldMenu onAdd={addField} />
              </HStack>

              {fields.length === 0 ? (
                <Box
                  textAlign="center"
                  p={6}
                  borderWidth={1}
                  borderStyle="dashed"
                  borderColor={borderColor}
                  borderRadius="md"
                  bg={headerBg}
                >
                  <Text fontSize="sm" color={subduedText}>
                    No fields yet — add one with the button above.
                  </Text>
                </Box>
              ) : (
                <VStack align="stretch" gap={2}>
                  {fields.map((field, i) => (
                    <FieldCard
                      key={`${field.key}-${i}`}
                      field={field}
                      siblingKeys={[
                        ...otherKeysInStep,
                        ...fieldKeys.filter((_, idx) => idx !== i),
                      ]}
                      isFirst={i === 0}
                      isLast={i === fields.length - 1}
                      onChange={(next) => updateField(i, next)}
                      onMove={(d) => moveField(i, d)}
                      onRemove={() => removeField(i)}
                    />
                  ))}
                </VStack>
              )}
            </Box>
          </VStack>
        </Box>
      )}
    </Box>
  );
}
