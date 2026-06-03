"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CloseButton,
  Dialog,
  Heading,
  HStack,
  Input,
  Portal,
  SimpleGrid,
  Spacer,
  Text,
  Textarea,
  VStack,
  chakra,
} from "@chakra-ui/react";
import { LuArrowLeft, LuEye, LuSave, LuTrash2 } from "react-icons/lu";
import NextLink from "next/link";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminEvent,
  type ApplicationSchema,
  type CreateEventPayload,
  type EventLifecycleStatus,
  type UpdateEventPayload,
} from "@/lib/api/admin-applications-service";
import { siteService, type Site } from "@/lib/api/site-service";
import { ApplicationSchemaBuilder } from "./schema-builder/ApplicationSchemaBuilder";
import { ImagePicker } from "./ImagePicker";
import { GalleryPicker } from "./GalleryPicker";
import { EventPreview } from "./EventPreview";

const Select = chakra("select");

const LIFECYCLE_OPTIONS: { value: EventLifecycleStatus; label: string }[] = [
  { value: "draft", label: "Draft (private)" },
  { value: "open", label: "Open (accepting apps)" },
  { value: "closed", label: "Closed (visible, locked)" },
  { value: "archived", label: "Archived (hidden)" },
];

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

interface FormState {
  site_id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  hero_image_url: string;
  gallery_image_urls: string[];
  start_date: string;
  end_date: string;
  timezone: string;
  location_venue_name: string;
  location_street_1: string;
  location_street_2: string;
  location_city: string;
  location_state: string;
  location_postal_code: string;
  location_country: string;
  format: string;
  group_size_label: string;
  length_label: string;
  inclusions: string; // newline-separated
  capacity: string;
  show_capacity_publicly: boolean;
  currency: string;
  price_dollars: string; // we expose dollars, convert to cents on save
  collect_tax: boolean;
  collect_shipping: boolean;
  refund_full_until: string;
  refund_partial_until: string;
  refund_partial_pct: string;
  application_status: EventLifecycleStatus;
  /** Live schema tree (null = no application form yet). */
  application_schema: ApplicationSchema | null;
}

function blankForm(): FormState {
  return {
    site_id: "",
    slug: "",
    name: "",
    subtitle: "",
    description: "",
    hero_image_url: "",
    gallery_image_urls: [],
    start_date: "",
    end_date: "",
    timezone: "America/New_York",
    location_venue_name: "",
    location_street_1: "",
    location_street_2: "",
    location_city: "",
    location_state: "",
    location_postal_code: "",
    location_country: "US",
    format: "",
    group_size_label: "",
    length_label: "",
    inclusions: "",
    capacity: "50",
    show_capacity_publicly: true,
    currency: "USD",
    price_dollars: "0",
    collect_tax: false,
    collect_shipping: false,
    refund_full_until: "",
    refund_partial_until: "",
    refund_partial_pct: "",
    application_status: "draft",
    application_schema: null,
  };
}

function fromEvent(event: AdminEvent): FormState {
  return {
    site_id: String(event.site_id),
    slug: event.slug,
    name: event.name,
    subtitle: event.subtitle ?? "",
    description: event.description ?? "",
    hero_image_url: event.hero_image_url ?? "",
    gallery_image_urls: event.gallery_image_urls ?? [],
    start_date: event.start_date ?? "",
    end_date: event.end_date ?? "",
    timezone: event.timezone ?? "America/New_York",
    location_venue_name: event.location.venue ?? "",
    location_street_1: event.location.street_1 ?? "",
    location_street_2: event.location.street_2 ?? "",
    location_city: event.location.city ?? "",
    location_state: event.location.state ?? "",
    location_postal_code: event.location.postal_code ?? "",
    location_country: event.location.country ?? "US",
    format: event.format ?? "",
    group_size_label: event.group_size_label ?? "",
    length_label: event.length_label ?? "",
    inclusions: (event.inclusions ?? []).join("\n"),
    capacity: String(event.capacity),
    show_capacity_publicly: event.show_capacity_publicly,
    currency: event.currency,
    price_dollars: (event.price_cents / 100).toFixed(2),
    collect_tax: event.collect_tax,
    collect_shipping: event.collect_shipping,
    refund_full_until: event.refund_full_until ?? "",
    refund_partial_until: event.refund_partial_until ?? "",
    refund_partial_pct: event.refund_partial_pct?.toString() ?? "",
    application_status: event.application_status,
    application_schema: event.application_schema ?? null,
  };
}

/** Convert form state into the API payload, returning null + a message on errors. */
function buildPayload(
  form: FormState,
  mode: "create" | "update",
): { ok: true; payload: CreateEventPayload | UpdateEventPayload } | { ok: false; error: string } {
  // Pluck the lines for arrays + filter empties so a user pressing Enter
  // in an otherwise blank textarea doesn't produce ["", ""].
  const splitLines = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  // The builder maintains the schema as a live object tree, so we no
  // longer have to parse a string. An empty form (no steps yet) is sent
  // as null so the server clears the column.
  const schema =
    form.application_schema && form.application_schema.steps.length
      ? form.application_schema
      : null;

  const dollars = parseFloat(form.price_dollars);
  if (Number.isNaN(dollars) || dollars < 0) {
    return { ok: false, error: "Price must be a non-negative number." };
  }

  const base = {
    slug: form.slug.trim(),
    name: form.name.trim(),
    subtitle: form.subtitle.trim() || null,
    description: form.description.trim() || null,
    hero_image_url: form.hero_image_url.trim() || null,
    gallery_image_urls: form.gallery_image_urls.filter((u) => u.trim()),
    start_date: form.start_date,
    end_date: form.end_date,
    timezone: form.timezone,
    location_venue_name: form.location_venue_name.trim() || null,
    location_street_1: form.location_street_1.trim() || null,
    location_street_2: form.location_street_2.trim() || null,
    location_city: form.location_city.trim(),
    location_state: form.location_state.trim(),
    location_postal_code: form.location_postal_code.trim() || null,
    location_country: (form.location_country.trim() || "US").toUpperCase(),
    format: form.format.trim() || null,
    group_size_label: form.group_size_label.trim() || null,
    length_label: form.length_label.trim() || null,
    inclusions: splitLines(form.inclusions),
    capacity: parseInt(form.capacity, 10),
    show_capacity_publicly: form.show_capacity_publicly,
    currency: form.currency.toUpperCase(),
    price_cents: Math.round(dollars * 100),
    collect_tax: form.collect_tax,
    collect_shipping: form.collect_shipping,
    refund_full_until: form.refund_full_until || null,
    refund_partial_until: form.refund_partial_until || null,
    refund_partial_pct: form.refund_partial_pct
      ? parseInt(form.refund_partial_pct, 10)
      : null,
    application_status: form.application_status,
    application_schema: schema,
  };

  if (mode === "create") {
    const siteId = parseInt(form.site_id, 10);
    if (!siteId) return { ok: false, error: "Select a site." };
    return { ok: true, payload: { ...base, site_id: siteId } };
  }
  return { ok: true, payload: base };
}

interface Props {
  mode: "create" | "update";
  initial?: AdminEvent;
}

export function EventForm({ mode, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    initial ? fromEvent(initial) : blankForm(),
  );
  const [sites, setSites] = useState<Site[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const surfaceBg = useColorModeValue("white", "gray.900");
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  useEffect(() => {
    if (mode === "create") {
      siteService.getSites().then(setSites).catch(() => setSites([]));
    }
  }, [mode]);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    [],
  );

  // No schema-preview memo needed — the builder handles its own validation
  // and warnings inline.

  const handleSave = async () => {
    const built = buildPayload(form, mode);
    if (!built.ok) {
      toaster.error({ title: built.error });
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        const created = await adminApplicationsService.createEvent(
          built.payload as CreateEventPayload,
        );
        toaster.success({ title: "Event created." });
        router.push(`/events/manage/${created.id}/edit`);
      } else if (initial) {
        await adminApplicationsService.updateEvent(
          initial.id,
          built.payload as UpdateEventPayload,
        );
        toaster.success({ title: "Event saved." });
      }
    } catch (err: unknown) {
      const data = (err as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      })?.response?.data;
      // Surface the first server-side validation error for visibility.
      const firstError = data?.errors
        ? Object.values(data.errors).flat()[0]
        : undefined;
      toaster.error({ title: firstError ?? data?.message ?? "Failed to save event." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    if (!window.confirm(`Delete "${initial.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await adminApplicationsService.deleteEvent(initial.id);
      toaster.success({ title: "Event deleted." });
      router.push("/events/manage");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete event.";
      toaster.error({ title: msg });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 8 }}>
      {/* Header */}
      <HStack mb={6} gap={3}>
        <NextLink href="/events/manage" passHref>
          <Button size="sm" variant="ghost" px={4}>
            <LuArrowLeft /> Back
          </Button>
        </NextLink>
        <Box>
          <Heading size="lg">
            {mode === "create" ? "New event" : initial?.name ?? "Edit event"}
          </Heading>
          {mode === "update" && (
            <Text fontSize="sm" color={subduedText}>
              {initial?.site?.slug ?? "—"} / {initial?.slug}
            </Text>
          )}
        </Box>
        <Spacer />
        {mode === "update" && (
          <Button
            size="sm"
            variant="outline"
            colorPalette="red"
            onClick={handleDelete}
            loading={deleting}
            px={4}
          >
            <LuTrash2 /> Delete
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPreviewOpen(true)}
          px={4}
        >
          <LuEye /> Preview
        </Button>
        <Button
          colorPalette="brand"
          size="sm"
          onClick={handleSave}
          loading={saving}
          px={4}
        >
          <LuSave /> {mode === "create" ? "Create event" : "Save changes"}
        </Button>
      </HStack>

      <Dialog.Root
        open={previewOpen}
        onOpenChange={(d) => !d.open && setPreviewOpen(false)}
        size="cover"
        placement="center"
        scrollBehavior="inside"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner padding={{ base: 0, md: 6 }}>
            <Dialog.Content
              maxW="1100px"
              w="full"
              borderRadius={{ base: 0, md: "xl" }}
              overflow="hidden"
              bg="white"
            >
              <Dialog.Header
                px={6}
                py={3}
                borderBottomWidth="1px"
                borderColor="gray.200"
                bg="white"
              >
                <Dialog.Title>
                  <Text
                    fontSize="2xs"
                    letterSpacing="0.14em"
                    textTransform="uppercase"
                    color="gray.500"
                    fontWeight="bold"
                  >
                    Preview · how attendees will see it
                  </Text>
                </Dialog.Title>
                <Dialog.CloseTrigger position="absolute" top={3} right={3} asChild>
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body p={0}>
                <EventPreview
                  data={{
                    name: form.name,
                    subtitle: form.subtitle,
                    description: form.description,
                    hero_image_url: form.hero_image_url,
                    gallery_image_urls: form.gallery_image_urls,
                    format: form.format,
                    group_size_label: form.group_size_label,
                    length_label: form.length_label,
                    inclusions: form.inclusions,
                    start_date: form.start_date,
                    end_date: form.end_date,
                    location_city: form.location_city,
                    location_state: form.location_state,
                    location_country: form.location_country,
                    price_dollars: form.price_dollars,
                    currency: form.currency,
                  }}
                />
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <VStack align="stretch" gap={6}>
        {/* Basics */}
        <SectionCard title="Basics" surfaceBg={surfaceBg} borderColor={borderColor}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {mode === "create" && (
              <FieldShell label="Site" required>
                <Select
                  value={form.site_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setField("site_id", e.target.value)
                  }
                  borderWidth={1}
                  borderColor={borderColor}
                  borderRadius="md"
                  px={4}
                  py={2}
                  fontSize="sm"
                  bg={surfaceBg}
                >
                  <option value="">Select a site…</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </Select>
              </FieldShell>
            )}
            <FieldShell label="Name" required>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                px={4}
                placeholder="Aligned: A Pastors' Retreat"
              />
            </FieldShell>
            <FieldShell label="Slug" required helpText="lowercase, hyphens only">
              <Input
                value={form.slug}
                onChange={(e) =>
                  setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                px={4}
                placeholder="aligned"
              />
            </FieldShell>
            <FieldShell label="Subtitle">
              <Input
                value={form.subtitle}
                onChange={(e) => setField("subtitle", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Lifecycle status" required>
              <Select
                value={form.application_status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setField("application_status", e.target.value as EventLifecycleStatus)
                }
                borderWidth={1}
                borderColor={borderColor}
                borderRadius="md"
                px={4}
                py={2}
                fontSize="sm"
                bg={surfaceBg}
              >
                {LIFECYCLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FieldShell>
          </SimpleGrid>
          <Box mt={4}>
            <FieldShell label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={4}
                px={4}
              />
            </FieldShell>
          </Box>
        </SectionCard>

        {/* Schedule + location */}
        <SectionCard title="Schedule & location" surfaceBg={surfaceBg} borderColor={borderColor}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <FieldShell label="Start date" required>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="End date" required>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setField("end_date", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Timezone" required>
              <Select
                value={form.timezone}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setField("timezone", e.target.value)
                }
                borderWidth={1}
                borderColor={borderColor}
                borderRadius="md"
                px={4}
                py={2}
                fontSize="sm"
                bg={surfaceBg}
              >
                {COMMON_TIMEZONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </FieldShell>

            <FieldShell label="Venue">
              <Input
                value={form.location_venue_name}
                onChange={(e) => setField("location_venue_name", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Street">
              <Input
                value={form.location_street_1}
                onChange={(e) => setField("location_street_1", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Street (line 2)">
              <Input
                value={form.location_street_2}
                onChange={(e) => setField("location_street_2", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="City" required>
              <Input
                value={form.location_city}
                onChange={(e) => setField("location_city", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="State" required>
              <Input
                value={form.location_state}
                onChange={(e) => setField("location_state", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Postal code">
              <Input
                value={form.location_postal_code}
                onChange={(e) => setField("location_postal_code", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Country" helpText="ISO 3166-1 alpha-2">
              <Input
                value={form.location_country}
                onChange={(e) =>
                  setField("location_country", e.target.value.toUpperCase().slice(0, 2))
                }
                px={4}
              />
            </FieldShell>
          </SimpleGrid>
        </SectionCard>

        {/* Capacity & pricing */}
        <SectionCard title="Capacity & pricing" surfaceBg={surfaceBg} borderColor={borderColor}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <FieldShell label="Capacity" required>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setField("capacity", e.target.value)}
                px={4}
                min={1}
              />
            </FieldShell>
            <FieldShell label="Currency" required>
              <Input
                value={form.currency}
                onChange={(e) =>
                  setField("currency", e.target.value.toUpperCase().slice(0, 3))
                }
                px={4}
              />
            </FieldShell>
            <FieldShell label="Price" required helpText="In dollars (e.g. 2500.00)">
              <Input
                type="number"
                value={form.price_dollars}
                onChange={(e) => setField("price_dollars", e.target.value)}
                px={4}
                min={0}
                step={0.01}
              />
            </FieldShell>
          </SimpleGrid>
          <HStack mt={4} gap={6}>
            <CheckRow
              label="Show capacity publicly"
              checked={form.show_capacity_publicly}
              onChange={(v) => setField("show_capacity_publicly", v)}
            />
            <CheckRow
              label="Collect tax"
              checked={form.collect_tax}
              onChange={(v) => setField("collect_tax", v)}
            />
            <CheckRow
              label="Collect shipping"
              checked={form.collect_shipping}
              onChange={(v) => setField("collect_shipping", v)}
            />
          </HStack>
        </SectionCard>

        {/* Display labels + media */}
        <SectionCard title="Display & media" surfaceBg={surfaceBg} borderColor={borderColor}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <FieldShell label="Format" helpText="e.g. In-person retreat">
              <Input
                value={form.format}
                onChange={(e) => setField("format", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Group size label" helpText="e.g. Up to 12 leaders">
              <Input
                value={form.group_size_label}
                onChange={(e) => setField("group_size_label", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Length label" helpText="e.g. 3 days, 2 nights">
              <Input
                value={form.length_label}
                onChange={(e) => setField("length_label", e.target.value)}
                px={4}
              />
            </FieldShell>
          </SimpleGrid>
          <Box mt={4}>
            <FieldShell label="Hero image" helpText="Shown at the top of the event page (16:9 ideal).">
              <ImagePicker
                value={form.hero_image_url}
                onChange={(url) => setField("hero_image_url", url)}
                siteId={form.site_id ? Number(form.site_id) : null}
                aspectRatio="16/9"
                label="Click or drop the hero image"
              />
            </FieldShell>
          </Box>
          <Box mt={4}>
            <FieldShell
              label="Gallery"
              helpText="Drag tiles to reorder. Drop multiple files at once."
            >
              <GalleryPicker
                value={form.gallery_image_urls}
                onChange={(urls) => setField("gallery_image_urls", urls)}
                siteId={form.site_id ? Number(form.site_id) : null}
              />
            </FieldShell>
          </Box>
          <Box mt={4}>
            <FieldShell
              label="Inclusions"
              helpText="One per line — shown as a checklist on the event page"
            >
              <Textarea
                value={form.inclusions}
                onChange={(e) => setField("inclusions", e.target.value)}
                rows={4}
                px={4}
              />
            </FieldShell>
          </Box>
        </SectionCard>

        {/* Refund */}
        <SectionCard title="Refund policy" surfaceBg={surfaceBg} borderColor={borderColor}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <FieldShell label="Full refund until">
              <Input
                type="date"
                value={form.refund_full_until}
                onChange={(e) => setField("refund_full_until", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Partial refund until">
              <Input
                type="date"
                value={form.refund_partial_until}
                onChange={(e) => setField("refund_partial_until", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Partial refund %" helpText="0-100">
              <Input
                type="number"
                value={form.refund_partial_pct}
                onChange={(e) => setField("refund_partial_pct", e.target.value)}
                min={0}
                max={100}
                px={4}
              />
            </FieldShell>
          </SimpleGrid>
        </SectionCard>

        {/* Application schema */}
        <SectionCard title="Application form" surfaceBg={surfaceBg} borderColor={borderColor}>
          <Text fontSize="xs" color={subduedText} mb={4}>
            Compose the multi-step application form applicants will fill
            out. Add steps, sections, and fields visually — or switch to{" "}
            <chakra.b>Raw JSON</chakra.b> to import/export a complete schema.
            Leave empty to skip (the public wizard will render a generic form).
          </Text>
          <ApplicationSchemaBuilder
            value={form.application_schema}
            onChange={(next) => setField("application_schema", next)}
          />
        </SectionCard>
      </VStack>
    </Box>
  );
}

/* --------------------------------- bits ------------------------------- */

function SectionCard({
  title,
  children,
  surfaceBg,
  borderColor,
}: {
  title: string;
  children: React.ReactNode;
  surfaceBg: string;
  borderColor: string;
}) {
  return (
    <Card.Root bg={surfaceBg} borderWidth={1} borderColor={borderColor}>
      <Card.Body p={5}>
        <Heading size="sm" mb={4}>
          {title}
        </Heading>
        {children}
      </Card.Body>
    </Card.Root>
  );
}

function FieldShell({
  label,
  children,
  required,
  helpText,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  helpText?: string;
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
      {children}
      {helpText && (
        <Text fontSize="xs" color={subduedText} mt={1}>
          {helpText}
        </Text>
      )}
    </Box>
  );
}

function CheckRow({
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
