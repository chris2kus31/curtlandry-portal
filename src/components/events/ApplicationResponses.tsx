"use client";

import { Box, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import type {
  ApplicationSchema,
  SchemaField,
  SchemaOption,
  SchemaSection,
  SchemaStep,
} from "@/lib/api/admin-applications-service";

interface Props {
  schema: ApplicationSchema | null;
  formData: Record<string, unknown>;
}

/**
 * Render the applicant's submitted answers, organized using the schema's
 * step + section layout. Falls back to a flat dump of `formData` when no
 * schema is available so admins are never stuck looking at nothing.
 */
export function ApplicationResponses({ schema, formData }: Props) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  if (!schema) {
    return (
      <VStack align="stretch" gap={3}>
        {Object.entries(formData ?? {}).map(([key, value]) => (
          <Box key={key}>
            <Text fontSize="xs" color={subduedText} textTransform="uppercase">
              {key}
            </Text>
            <Text>{formatValue(value)}</Text>
          </Box>
        ))}
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap={6}>
      {schema.steps
        .filter((s) => s.key !== "review_submit")
        .map((step) => (
          <StepBlock
            key={step.key}
            step={step}
            formData={formData}
            cardBg={cardBg}
            borderColor={borderColor}
            subduedText={subduedText}
          />
        ))}
    </VStack>
  );
}

function StepBlock({
  step,
  formData,
  cardBg,
  borderColor,
  subduedText,
}: {
  step: SchemaStep;
  formData: Record<string, unknown>;
  cardBg: string;
  borderColor: string;
  subduedText: string;
}) {
  const sections: SchemaSection[] = step.sections?.length
    ? step.sections
    : [{ fields: step.fields ?? [] }];

  return (
    <Box bg={cardBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={5}>
      <Heading size="sm" mb={1}>
        {step.title}
      </Heading>
      {step.subtitle && (
        <Text fontSize="xs" color={subduedText} mb={4}>
          {step.subtitle}
        </Text>
      )}

      <VStack align="stretch" gap={5}>
        {sections.map((section, i) => {
          // Filter out info_callouts — they're applicant-facing context
          // that doesn't carry any submitted data worth rendering here.
          const renderable = section.fields.filter(
            (f) => f.type !== "info_callout",
          );
          if (renderable.length === 0) return null;

          return (
            <Box key={section.key ?? i}>
              {section.label && (
                <Text
                  fontSize="xs"
                  color={subduedText}
                  textTransform="uppercase"
                  letterSpacing="wide"
                  mb={3}
                >
                  {section.label}
                </Text>
              )}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                {renderable.map((field) => (
                  <ResponseField
                    key={field.key}
                    field={field}
                    formData={formData}
                    subduedText={subduedText}
                  />
                ))}
              </SimpleGrid>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}

function ResponseField({
  field,
  formData,
  subduedText,
}: {
  field: SchemaField;
  formData: Record<string, unknown>;
  subduedText: string;
}) {
  const raw = formData?.[field.key];
  const labelByValue = (value: string) => {
    const opt = (field.options ?? []).find((o) =>
      typeof o === "string" ? o === value : o.value === value,
    );
    if (!opt) return value;
    return typeof opt === "string" ? opt : opt.label;
  };

  let display: React.ReactNode;
  if (raw === null || raw === undefined || raw === "") {
    display = <Text color={subduedText}>—</Text>;
  } else if (Array.isArray(raw)) {
    display = (
      <Text whiteSpace="pre-wrap">
        {raw.map((v) => labelByValue(String(v))).join(", ")}
      </Text>
    );
  } else if (field.type === "select" || field.type === "radio") {
    display = <Text>{labelByValue(String(raw))}</Text>;
  } else if (field.type === "textarea") {
    display = <Text whiteSpace="pre-wrap">{String(raw)}</Text>;
  } else {
    display = <Text>{String(raw)}</Text>;
  }

  // textarea answers can be long — give them the full row width.
  const colSpan = field.type === "textarea" ? 2 : field.columnSpan ?? 1;

  return (
    <Box gridColumn={{ md: `span ${colSpan}` }}>
      <Text
        fontSize="xs"
        color={subduedText}
        textTransform="uppercase"
        letterSpacing="wide"
        mb={1}
      >
        {field.label}
      </Text>
      {display}
    </Box>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// re-export to keep callers happy without importing the schema service
export type { SchemaOption };
