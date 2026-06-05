"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Portal,
  SimpleGrid,
  Spacer,
  Text,
  Textarea,
  VStack,
  chakra,
  CloseButton,
} from "@chakra-ui/react";
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuCode,
  LuLayoutGrid,
  LuPlus,
  LuTrash2,
  LuTriangle,
  LuClipboard,
} from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import type {
  ApplicationSchema,
  SchemaSection,
  SchemaStep,
} from "@/lib/api/admin-applications-service";
import { SectionCard } from "./SectionCard";
import {
  collectFieldKeys,
  defaultSection,
  defaultStep,
  emptySchema,
  move,
  removeAt,
  replaceAt,
  slugify,
  validateSchema,
} from "./helpers";

interface Props {
  /** Current schema. `null` means "no application form yet". */
  value: ApplicationSchema | null;
  onChange: (next: ApplicationSchema | null) => void;
}

type ViewMode = "builder" | "json";

/**
 * Top-level visual editor for the multi-step application form schema.
 *
 * State model: the schema lives in the parent (EventForm), this component
 * just calls `onChange` with the next immutable tree. Internally we track
 * which step is selected and which view (builder vs raw JSON).
 *
 * The JSON pane is read-only by default; "Edit JSON" turns it into a paste
 * buffer that's validated on apply, so power users can still drop in a
 * complete schema from another source.
 */
export function ApplicationSchemaBuilder({ value, onChange }: Props) {
  const schema = value ?? emptySchema();
  const [view, setView] = useState<ViewMode>("builder");
  const [rawActiveStepIdx, setActiveStepIdx] = useState(0);

  // Clamp the active index during render so we never reference a step
  // that's been deleted by a sibling action. Computing inline (vs. in an
  // effect) avoids a flash of "no active step" + an extra render pass.
  const activeStepIdx = Math.min(
    rawActiveStepIdx,
    Math.max(0, schema.steps.length - 1),
  );

  const subduedText = useColorModeValue("gray.600", "gray.400");
  const surfaceBg = useColorModeValue("white", "gray.900");
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const accentBg = useColorModeValue("brand.500", "brand.600");
  const tabBg = useColorModeValue("white", "gray.900");
  const tabHover = useColorModeValue("gray.100", "gray.700");
  // Warning-bubble + summary card colors (hoisted because hooks can't be
  // called inside the conditional JSX below).
  const warnPillBg = useColorModeValue("amber.50", "amber.900");
  const warnCardBg = useColorModeValue("amber.50", "amber.900");
  const warnCardBorder = useColorModeValue("amber.200", "amber.700");

  const validation = useMemo(() => validateSchema(schema), [schema]);

  const setSteps = (nextSteps: SchemaStep[]) =>
    onChange(nextSteps.length ? { ...schema, steps: nextSteps } : null);

  /* ----------------------------- Step ops ---------------------------- */

  const addStep = () => {
    const step = defaultStep(schema.steps);
    onChange({ ...schema, steps: [...schema.steps, step] });
    setActiveStepIdx(schema.steps.length);
  };

  const updateStep = (i: number, next: SchemaStep) =>
    setSteps(replaceAt(schema.steps, i, next));

  const moveStep = (i: number, direction: -1 | 1) => {
    setSteps(move(schema.steps, i, direction));
    if (i === activeStepIdx) setActiveStepIdx(i + direction);
  };

  const removeStep = (i: number) => {
    if (
      !window.confirm(
        `Remove step "${schema.steps[i]?.title || `Step ${i + 1}`}"? This cannot be undone.`,
      )
    )
      return;
    setSteps(removeAt(schema.steps, i));
    if (activeStepIdx >= i) setActiveStepIdx(Math.max(0, activeStepIdx - 1));
  };

  /* ------------------------- Active step editing -------------------- */

  const activeStep = schema.steps[activeStepIdx];

  // Ensure consistent shape: sections-first. If the legacy `step.fields`
  // form is present, lift it into a single anonymous section so the
  // builder can edit it.
  const ensureSections = (step: SchemaStep): SchemaStep => {
    if (step.sections?.length) return step;
    if (step.fields?.length) {
      return {
        ...step,
        sections: [{ fields: step.fields }],
        fields: undefined,
      };
    }
    return { ...step, sections: [] };
  };

  const writeActiveStep = (next: SchemaStep) =>
    updateStep(activeStepIdx, next);

  const updateStepProp = <K extends keyof SchemaStep>(
    k: K,
    v: SchemaStep[K],
  ) => activeStep && writeActiveStep(ensureSections({ ...activeStep, [k]: v }));

  /* --------------------------- Section ops -------------------------- */

  const addSection = () => {
    if (!activeStep) return;
    const ensured = ensureSections(activeStep);
    const sections = ensured.sections ?? [];
    writeActiveStep({
      ...ensured,
      sections: [...sections, defaultSection(sections)],
    });
  };

  const writeSections = (next: SchemaSection[]) => {
    if (!activeStep) return;
    writeActiveStep({ ...ensureSections(activeStep), sections: next });
  };

  const updateSection = (i: number, next: SchemaSection) => {
    const ensured = ensureSections(activeStep!);
    writeSections(replaceAt(ensured.sections ?? [], i, next));
  };

  const moveSection = (i: number, direction: -1 | 1) => {
    const ensured = ensureSections(activeStep!);
    writeSections(move(ensured.sections ?? [], i, direction));
  };

  const removeSection = (i: number) => {
    if (
      !window.confirm(
        "Remove this section and all of its fields? This cannot be undone.",
      )
    )
      return;
    const ensured = ensureSections(activeStep!);
    writeSections(removeAt(ensured.sections ?? [], i));
  };

  /* ----------------------------------------------------------------- */

  return (
    <Box>
      {/* View toggle */}
      <HStack mb={4} gap={2}>
        <Button
          size="sm"
          variant={view === "builder" ? "solid" : "outline"}
          colorPalette={view === "builder" ? "brand" : "gray"}
          onClick={() => setView("builder")}
          px={4}
        >
          <LuLayoutGrid /> Builder
        </Button>
        <Button
          size="sm"
          variant={view === "json" ? "solid" : "outline"}
          colorPalette={view === "json" ? "brand" : "gray"}
          onClick={() => setView("json")}
          px={4}
        >
          <LuCode /> Raw JSON
        </Button>
        <Spacer />
        {validation.warnings.length > 0 && (
          <HStack
            color="amber.500"
            fontSize="xs"
            bg={warnPillBg}
            px={3}
            py={1.5}
            borderRadius="full"
          >
            <LuTriangle size={12} />
            <Text>
              {validation.warnings.length} warning
              {validation.warnings.length === 1 ? "" : "s"}
            </Text>
          </HStack>
        )}
      </HStack>

      {view === "json" ? (
        <RawJsonPane value={schema} onChange={onChange} />
      ) : (
        <Box>
          {/* Step tabs */}
          <Flex
            wrap="wrap"
            gap={1}
            mb={4}
            borderBottomWidth={1}
            borderBottomColor={borderColor}
            pb={1}
          >
            {schema.steps.map((step, i) => {
              const active = i === activeStepIdx;
              return (
                <chakra.button
                  key={`${step.key}-${i}`}
                  onClick={() => setActiveStepIdx(i)}
                  bg={active ? accentBg : tabBg}
                  color={active ? "white" : undefined}
                  px={4}
                  py={2}
                  borderRadius="md"
                  borderWidth={1}
                  borderColor={active ? accentBg : borderColor}
                  fontSize="sm"
                  fontWeight={active ? 600 : 500}
                  _hover={active ? undefined : { bg: tabHover }}
                  transition="background 0.15s"
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <Box as="span" opacity={0.7}>
                    {i + 1}.
                  </Box>
                  {step.navLabel || step.title || `Step ${i + 1}`}
                </chakra.button>
              );
            })}
            <Button
              size="sm"
              variant="ghost"
              onClick={addStep}
              px={4}
            >
              <LuPlus /> Add step
            </Button>
          </Flex>

          {/* Active step */}
          {!activeStep ? (
            <Card.Root bg={surfaceBg} borderWidth={1} borderColor={borderColor}>
              <Card.Body p={8} textAlign="center">
                <Text color={subduedText}>
                  No steps yet. Click <chakra.b>+ Add step</chakra.b> to start
                  building the application form.
                </Text>
              </Card.Body>
            </Card.Root>
          ) : (
            <VStack align="stretch" gap={5}>
              {/* Step metadata */}
              <Card.Root bg={surfaceBg} borderWidth={1} borderColor={borderColor}>
                <Card.Body p={5}>
                  <HStack mb={4}>
                    <Heading size="sm">Step settings</Heading>
                    <Spacer />
                    <IconButton
                      aria-label="Move step earlier"
                      size="xs"
                      variant="ghost"
                      disabled={activeStepIdx === 0}
                      onClick={() => moveStep(activeStepIdx, -1)}
                    >
                      <LuArrowLeft size={14} />
                    </IconButton>
                    <IconButton
                      aria-label="Move step later"
                      size="xs"
                      variant="ghost"
                      disabled={activeStepIdx === schema.steps.length - 1}
                      onClick={() => moveStep(activeStepIdx, 1)}
                    >
                      <LuArrowRight size={14} />
                    </IconButton>
                    <IconButton
                      aria-label="Remove step"
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => removeStep(activeStepIdx)}
                    >
                      <LuTrash2 size={14} />
                    </IconButton>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <SimpleField
                      label="Title"
                      required
                      value={activeStep.title}
                      onChange={(v) => {
                        const auto =
                          !activeStep.key || slugify(activeStep.title) === activeStep.key;
                        writeActiveStep(
                          ensureSections({
                            ...activeStep,
                            title: v,
                            ...(auto ? { key: slugify(v) || activeStep.key } : {}),
                          }),
                        );
                      }}
                    />
                    <SimpleField
                      label="Step key"
                      required
                      value={activeStep.key}
                      onChange={(v) => updateStepProp("key", slugify(v) || v)}
                      hint="Internal identifier (auto-generated from title)"
                    />
                    <SimpleField
                      label="Nav label (left rail)"
                      value={activeStep.navLabel ?? ""}
                      onChange={(v) => updateStepProp("navLabel", v || undefined)}
                      hint="Short label shown in the sidebar navigator"
                    />
                    <SimpleField
                      label="Nav hint"
                      value={activeStep.navHint ?? ""}
                      onChange={(v) => updateStepProp("navHint", v || undefined)}
                      hint="Sub-label beneath the nav label"
                    />
                    <Box gridColumn={{ md: "span 2" }}>
                      <SimpleField
                        label="Subtitle"
                        value={activeStep.subtitle ?? ""}
                        onChange={(v) => updateStepProp("subtitle", v || undefined)}
                        hint="Shown under the step title in the public form"
                      />
                    </Box>
                  </SimpleGrid>
                </Card.Body>
              </Card.Root>

              {/* Sections */}
              <Box>
                <HStack mb={3}>
                  <Heading size="sm">Sections</Heading>
                  <Spacer />
                  <Button size="sm" variant="outline" px={4} onClick={addSection}>
                    <LuPlus /> Add section
                  </Button>
                </HStack>

                {(() => {
                  const sections = ensureSections(activeStep).sections ?? [];
                  if (sections.length === 0) {
                    return (
                      <Box
                        textAlign="center"
                        p={8}
                        borderWidth={1}
                        borderStyle="dashed"
                        borderColor={borderColor}
                        borderRadius="lg"
                        bg={headerBg}
                      >
                        <Text fontSize="sm" color={subduedText} mb={3}>
                          No sections yet. Sections group related fields together
                          inside a step.
                        </Text>
                        <Button size="sm" variant="outline" px={4} onClick={addSection}>
                          <LuPlus /> Add your first section
                        </Button>
                      </Box>
                    );
                  }
                  // Build the "other field keys in step" list once per render
                  // so each section gets duplicate-key warnings across siblings.
                  const allKeysInStep = collectFieldKeys(
                    ensureSections(activeStep),
                  );

                  return (
                    <VStack align="stretch" gap={3}>
                      {sections.map((section, i) => {
                        const ownKeys = (section.fields ?? []).map((f) => f.key);
                        const others = allKeysInStep.filter(
                          (k) => !ownKeys.includes(k),
                        );
                        return (
                          <SectionCard
                            key={`${section.key ?? ""}-${i}`}
                            section={section}
                            index={i}
                            otherKeysInStep={others}
                            isFirst={i === 0}
                            isLast={i === sections.length - 1}
                            onChange={(next) => updateSection(i, next)}
                            onMove={(d) => moveSection(i, d)}
                            onRemove={() => removeSection(i)}
                          />
                        );
                      })}
                    </VStack>
                  );
                })()}
              </Box>
            </VStack>
          )}

          {/* Validation summary */}
          {validation.warnings.length > 0 && (
            <Card.Root
              mt={5}
              bg={warnCardBg}
              borderWidth={1}
              borderColor={warnCardBorder}
            >
              <Card.Body p={4}>
                <HStack mb={2}>
                  <LuTriangle size={14} />
                  <Text fontSize="sm" fontWeight={600}>
                    Please review before saving
                  </Text>
                </HStack>
                <VStack align="stretch" gap={1}>
                  {validation.warnings.slice(0, 6).map((w, i) => (
                    <Text key={i} fontSize="xs">
                      • {w}
                    </Text>
                  ))}
                  {validation.warnings.length > 6 && (
                    <Text fontSize="xs" color={subduedText}>
                      …and {validation.warnings.length - 6} more
                    </Text>
                  )}
                </VStack>
              </Card.Body>
            </Card.Root>
          )}
        </Box>
      )}
    </Box>
  );
}

/* ============================== Sub-components ============================ */

function SimpleField({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
}) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  return (
    <Box>
      <Text
        fontSize="xs"
        color={subduedText}
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
      <Input px={4} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && (
        <Text fontSize="xs" color={subduedText} mt={1}>
          {hint}
        </Text>
      )}
    </Box>
  );
}

/* ----------------------------- Raw JSON pane ----------------------------- */

interface RawJsonPaneProps {
  value: ApplicationSchema;
  onChange: (next: ApplicationSchema | null) => void;
}

function RawJsonPane({ value, onChange }: RawJsonPaneProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  const subduedText = useColorModeValue("gray.600", "gray.400");
  const codeBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const serialized = JSON.stringify(value, null, 2);

  const handleApply = () => {
    try {
      const parsed = JSON.parse(draft);
      if (typeof parsed !== "object" || !Array.isArray(parsed.steps)) {
        throw new Error("Schema must be an object with a `steps` array.");
      }
      onChange(parsed);
      setEditing(false);
      toaster.success({ title: "Schema applied from JSON." });
    } catch (err) {
      toaster.error({ title: `Invalid JSON: ${(err as Error).message}` });
    }
  };

  const handlePasteImport = () => {
    try {
      const parsed = JSON.parse(pasteValue);
      if (typeof parsed !== "object" || !Array.isArray(parsed.steps)) {
        throw new Error("Schema must be an object with a `steps` array.");
      }
      onChange(parsed);
      setPasteOpen(false);
      setPasteValue("");
      toaster.success({ title: "Schema imported." });
    } catch (err) {
      toaster.error({ title: `Invalid JSON: ${(err as Error).message}` });
    }
  };

  return (
    <Box>
      <HStack mb={3}>
        <Text fontSize="xs" color={subduedText}>
          The canonical JSON the API stores. Edit directly only if you know
          what you&apos;re doing.
        </Text>
        <Spacer />
        {editing ? (
          <>
            <Button
              size="xs"
              variant="ghost"
              px={4}
              onClick={() => {
                setEditing(false);
                setDraft(serialized);
              }}
            >
              Cancel
            </Button>
            <Button size="xs" colorPalette="brand" px={4} onClick={handleApply}>
              <LuCheck /> Apply
            </Button>
          </>
        ) : (
          <>
            <Button
              size="xs"
              variant="outline"
              px={4}
              onClick={() => setPasteOpen(true)}
            >
              <LuClipboard /> Paste & import
            </Button>
            <Button
              size="xs"
              variant="outline"
              px={4}
              onClick={() => {
                setDraft(serialized);
                setEditing(true);
              }}
            >
              Edit JSON
            </Button>
          </>
        )}
      </HStack>

      <Textarea
        rows={24}
        px={4}
        fontFamily="mono"
        fontSize="sm"
        bg={editing ? undefined : codeBg}
        borderColor={borderColor}
        readOnly={!editing}
        value={editing ? draft : serialized}
        onChange={(e) => setDraft(e.target.value)}
      />

      {/* Paste dialog */}
      <Dialog.Root
        open={pasteOpen}
        onOpenChange={(d) => setPasteOpen(d.open)}
        size="lg"
        placement="center"
        motionPreset="slide-in-bottom"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner padding={4}>
            <Dialog.Content maxW="720px" w="full" mx={4} borderRadius="xl">
              <Dialog.Header px={6} pt={6} pb={2}>
                <Dialog.Title fontSize="lg" fontWeight={700}>
                  Import schema from JSON
                </Dialog.Title>
                <Dialog.CloseTrigger position="absolute" top={3} right={3} asChild>
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body px={6} py={4}>
                <Text fontSize="xs" color={subduedText} mb={2}>
                  Paste a complete application schema. The previous schema
                  will be replaced.
                </Text>
                <Textarea
                  rows={16}
                  px={4}
                  fontFamily="mono"
                  fontSize="sm"
                  value={pasteValue}
                  onChange={(e) => setPasteValue(e.target.value)}
                  placeholder='{"version": 2, "steps": [...]}'
                />
              </Dialog.Body>
              <Dialog.Footer px={6} pb={6} pt={2} gap={3}>
                <Button
                  variant="ghost"
                  onClick={() => setPasteOpen(false)}
                  px={4}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="brand"
                  onClick={handlePasteImport}
                  px={4}
                  disabled={!pasteValue.trim()}
                >
                  Import
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
}
