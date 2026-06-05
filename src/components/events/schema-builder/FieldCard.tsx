"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Flex,
  HStack,
  IconButton,
  Input,
  SimpleGrid,
  Text,
  Textarea,
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
} from "@/lib/api/admin-applications-service";
import {
  FIELD_TYPES,
  PROFILE_MAPPINGS,
  TYPES_WITH_OPTIONS,
  slugify,
} from "./helpers";
import { OptionsEditor } from "./OptionsEditor";

const Select = chakra("select");

interface Props {
  field: SchemaField;
  /** Existing field keys in the same step (excluding this one) for collision hints. */
  siblingKeys: string[];
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: SchemaField) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

/**
 * Per-field editor — collapsed by default to a compact row, expandable to
 * a full properties form scoped to the field's `type`.
 *
 * Property surface area depends on type:
 *   - all          : label, key, required, helpText, columnSpan, mapped
 *   - text/textarea: + placeholder, maxLength (textarea only)
 *   - select/...   : + options (with sub-editor)
 *   - checkbox_grp : + maxSelect
 *   - info_callout : body + variant, no label needed
 */
export function FieldCard({
  field,
  siblingKeys,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);

  const subduedText = useColorModeValue("gray.600", "gray.400");
  const surfaceBg = useColorModeValue("white", "gray.900");
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const headerHoverBg = useColorModeValue("gray.100", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const accent = useColorModeValue("brand.600", "brand.300");

  const typeMeta = FIELD_TYPES.find((t) => t.value === field.type);
  const keyCollides = siblingKeys.includes(field.key);
  const showsOptions = TYPES_WITH_OPTIONS.includes(field.type);

  const setProp = <K extends keyof SchemaField>(k: K, v: SchemaField[K]) =>
    onChange({ ...field, [k]: v });

  return (
    <Box
      bg={surfaceBg}
      borderWidth={1}
      borderColor={keyCollides ? "red.400" : borderColor}
      borderRadius="md"
      overflow="hidden"
    >
      {/* Collapsed row */}
      <Flex
        align="center"
        gap={2}
        px={3}
        py={2}
        bg={headerBg}
        cursor="pointer"
        onClick={() => setOpen((v) => !v)}
        _hover={{ bg: headerHoverBg }}
      >
        <IconButton
          aria-label={open ? "Collapse" : "Expand"}
          size="2xs"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          {open ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
        </IconButton>
        <Box flex={1} minW={0}>
          <HStack gap={2}>
            <Text fontWeight={600} truncate>
              {field.type === "info_callout"
                ? "ⓘ Callout"
                : field.label || <Box as="span" color={subduedText}>(no label)</Box>}
            </Text>
            <Badge variant="subtle" colorPalette="gray" textTransform="lowercase" px={4}>
              {typeMeta?.label.toLowerCase() ?? field.type}
            </Badge>
            {field.required && (
              <Badge variant="subtle" colorPalette="red" px={4}>
                required
              </Badge>
            )}
          </HStack>
          <Text fontSize="xs" color={keyCollides ? "red.400" : subduedText}>
            {field.key || "(no key)"}{" "}
            {keyCollides && <Box as="span">· duplicate key</Box>}
          </Text>
        </Box>

        <Flex direction="column" gap={1}>
          <IconButton
            aria-label="Move up"
            size="2xs"
            variant="ghost"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation();
              onMove(-1);
            }}
          >
            <LuArrowUp size={12} />
          </IconButton>
          <IconButton
            aria-label="Move down"
            size="2xs"
            variant="ghost"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation();
              onMove(1);
            }}
          >
            <LuArrowDown size={12} />
          </IconButton>
        </Flex>
        <IconButton
          aria-label="Remove field"
          size="xs"
          variant="ghost"
          colorPalette="red"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <LuTrash2 size={14} />
        </IconButton>
      </Flex>

      {/* Expanded body */}
      {open && (
        <Box p={4}>
          <VStack align="stretch" gap={4}>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              <Field label="Type">
                <Select
                  value={field.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setProp("type", e.target.value as SchemaFieldType)
                  }
                  borderWidth={1}
                  borderColor={borderColor}
                  borderRadius="md"
                  px={4}
                  py={2}
                  fontSize="sm"
                  bg={surfaceBg}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                <Text fontSize="xs" color={subduedText} mt={1}>
                  {typeMeta?.hint}
                </Text>
              </Field>

              <Field label="Column span" hint="Full-width fields span 2; half-width span 1">
                <Select
                  value={String(field.columnSpan ?? 2)}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setProp("columnSpan", (parseInt(e.target.value, 10) as 1 | 2))
                  }
                  borderWidth={1}
                  borderColor={borderColor}
                  borderRadius="md"
                  px={4}
                  py={2}
                  fontSize="sm"
                  bg={surfaceBg}
                >
                  <option value="1">Half width</option>
                  <option value="2">Full width</option>
                </Select>
              </Field>
            </SimpleGrid>

            {field.type !== "info_callout" && (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                <Field label="Label" required>
                  <Input
                    px={4}
                    value={field.label}
                    onChange={(e) => {
                      const auto =
                        slugify(field.label) === field.key || field.key === "";
                      const nextLabel = e.target.value;
                      onChange({
                        ...field,
                        label: nextLabel,
                        ...(auto ? { key: slugify(nextLabel) || field.key } : {}),
                      });
                    }}
                  />
                </Field>
                <Field
                  label="Key"
                  required
                  hint={
                    keyCollides
                      ? "Duplicate key in this step — applicants' answers will collide."
                      : "Stored on the application JSON. Auto-filled from the label."
                  }
                  invalid={keyCollides}
                >
                  <Input
                    px={4}
                    value={field.key}
                    onChange={(e) =>
                      setProp("key", slugify(e.target.value) || e.target.value)
                    }
                  />
                </Field>
              </SimpleGrid>
            )}

            {/* Required + optional toggles (skipped for info_callout) */}
            {field.type !== "info_callout" && (
              <HStack gap={6} wrap="wrap">
                <Check
                  label="Required"
                  checked={!!field.required}
                  onChange={(v) =>
                    onChange({
                      ...field,
                      required: v,
                      optional: v ? undefined : field.optional,
                    })
                  }
                />
                <Check
                  label='Mark "optional"'
                  checked={!!field.optional}
                  onChange={(v) =>
                    onChange({
                      ...field,
                      optional: v,
                      required: v ? undefined : field.required,
                    })
                  }
                />
              </HStack>
            )}

            {/* Type-specific props ---------------------------------------- */}

            {(field.type === "text" ||
              field.type === "email" ||
              field.type === "tel" ||
              field.type === "number") && (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                <Field label="Placeholder">
                  <Input
                    px={4}
                    value={field.placeholder ?? ""}
                    onChange={(e) =>
                      setProp("placeholder", e.target.value || undefined)
                    }
                  />
                </Field>
                <Field label="Help text">
                  <Input
                    px={4}
                    value={field.helpText ?? ""}
                    onChange={(e) =>
                      setProp("helpText", e.target.value || undefined)
                    }
                  />
                </Field>
                {(field.type === "text" || field.type === "email") && (
                  <Field
                    label="Map to applicant profile"
                    hint="Forwards this answer into the applicant record (e.g. first_name)"
                  >
                    <Select
                      value={field.mapped ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setProp(
                          "mapped",
                          (e.target.value || undefined) as SchemaField["mapped"],
                        )
                      }
                      borderWidth={1}
                      borderColor={borderColor}
                      borderRadius="md"
                      px={4}
                      py={2}
                      fontSize="sm"
                      bg={surfaceBg}
                    >
                      {PROFILE_MAPPINGS.map((m) => (
                        <option key={m.label} value={m.value ?? ""}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </SimpleGrid>
            )}

            {field.type === "textarea" && (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                <Field label="Placeholder">
                  <Input
                    px={4}
                    value={field.placeholder ?? ""}
                    onChange={(e) =>
                      setProp("placeholder", e.target.value || undefined)
                    }
                  />
                </Field>
                <Field label="Max length (characters)">
                  <Input
                    px={4}
                    type="number"
                    min={0}
                    value={field.maxLength ?? ""}
                    onChange={(e) =>
                      setProp(
                        "maxLength",
                        e.target.value ? parseInt(e.target.value, 10) : undefined,
                      )
                    }
                  />
                </Field>
                <Box gridColumn={{ md: "span 2" }}>
                  <Field label="Help text">
                    <Input
                      px={4}
                      value={field.helpText ?? ""}
                      onChange={(e) =>
                        setProp("helpText", e.target.value || undefined)
                      }
                    />
                  </Field>
                </Box>
              </SimpleGrid>
            )}

            {showsOptions && (
              <Box>
                <Field
                  label={`Options${field.type === "checkbox_group" ? " — applicants pick several" : ""}`}
                >
                  <OptionsEditor
                    options={field.options ?? []}
                    onChange={(opts) => setProp("options", opts)}
                  />
                </Field>
                {field.type === "checkbox_group" && (
                  <Box mt={3} maxW="240px">
                    <Field
                      label="Max selectable"
                      hint="Leave blank for no cap"
                    >
                      <Input
                        px={4}
                        type="number"
                        min={1}
                        value={field.maxSelect ?? ""}
                        onChange={(e) =>
                          setProp(
                            "maxSelect",
                            e.target.value ? parseInt(e.target.value, 10) : undefined,
                          )
                        }
                      />
                    </Field>
                  </Box>
                )}
              </Box>
            )}

            {field.type === "checkbox" && (
              <Field
                label="Description"
                hint="Text shown next to the checkbox (e.g. 'I agree to…')"
              >
                <Textarea
                  px={4}
                  rows={3}
                  value={field.description ?? ""}
                  onChange={(e) =>
                    setProp("description", e.target.value || undefined)
                  }
                />
              </Field>
            )}

            {field.type === "info_callout" && (
              <SimpleGrid columns={{ base: 1, md: 4 }} gap={3}>
                <Box gridColumn={{ md: "span 3" }}>
                  <Field label="Body" required>
                    <Textarea
                      px={4}
                      rows={4}
                      value={field.body ?? ""}
                      onChange={(e) => setProp("body", e.target.value)}
                    />
                  </Field>
                </Box>
                <Field label="Variant">
                  <Select
                    value={field.variant ?? "info"}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setProp(
                        "variant",
                        e.target.value as SchemaField["variant"],
                      )
                    }
                    borderWidth={1}
                    borderColor={borderColor}
                    borderRadius="md"
                    px={4}
                    py={2}
                    fontSize="sm"
                    bg={surfaceBg}
                  >
                    <option value="info">Info (blue)</option>
                    <option value="warn">Warn (amber)</option>
                    <option value="success">Success (green)</option>
                  </Select>
                </Field>
              </SimpleGrid>
            )}

            <Text fontSize="xs" color={accent}>
              Tip: every field needs a unique key within a step. Duplicate keys overwrite
              each other on the applicant&apos;s saved JSON.
            </Text>
          </VStack>
        </Box>
      )}
    </Box>
  );
}

/* --------------------------------- bits --------------------------------- */

function Field({
  label,
  children,
  required,
  hint,
  invalid,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  invalid?: boolean;
}) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  return (
    <Box>
      <Text
        fontSize="xs"
        color={invalid ? "red.400" : subduedText}
        textTransform="uppercase"
        letterSpacing="wide"
        mb={1}
      >
        {label}
        {required && (
          <Box as="span" color="red.500" ml={1}>
            *
          </Box>
        )}
      </Text>
      {children}
      {hint && (
        <Text fontSize="xs" color={invalid ? "red.400" : subduedText} mt={1}>
          {hint}
        </Text>
      )}
    </Box>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <chakra.label
      display="flex"
      alignItems="center"
      gap={2}
      fontSize="sm"
      cursor="pointer"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </chakra.label>
  );
}
