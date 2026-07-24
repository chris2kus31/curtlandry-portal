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
  Select as CSelect,
  SimpleGrid,
  Spacer,
  Text,
  Textarea,
  VStack,
  chakra,
  createListCollection,
} from "@chakra-ui/react";
import { LuArrowLeft, LuEye, LuSave, LuTrash2, LuTriangleAlert } from "react-icons/lu";
import NextLink from "next/link";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import type { ApiError } from "@/types/api";
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
import { cloneDefaultApplicationSchema } from "./defaultApplicationSchema";
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

// US states + DC + common territories, as {code, name}. Value stored is the
// 2-letter code (matches how the API stores location_state, e.g. "FL").
const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" }, { code: "PR", name: "Puerto Rico" },
];

// Supported currencies. USD is the default; the rest are here so multi-region
// events don't require code changes.
const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD"];

/** Keep only digits (for capacity). */
const digitsOnly = (v: string) => v.replace(/[^0-9]/g, "");

/** Keep digits + a single optional hyphen, max 10 chars (US ZIP / ZIP+4). */
const sanitizeZip = (v: string) => {
  const cleaned = v.replace(/[^0-9-]/g, "");
  // collapse to at most one hyphen
  const parts = cleaned.split("-");
  const joined = parts.length > 1 ? `${parts[0]}-${parts.slice(1).join("")}` : parts[0];
  return joined.slice(0, 10);
};

/** Keep digits and a single decimal point, max 2 decimal places (for price). */
const sanitizeMoney = (v: string) => {
  let cleaned = v.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    // remove any additional dots after the first
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "");
    // cap to 2 decimal places
    const [whole, dec] = cleaned.split(".");
    cleaned = dec !== undefined ? `${whole}.${dec.slice(0, 2)}` : whole;
  }
  return cleaned;
};

// State dropdown backing collection — a fixed-height, scrollable, type-to-search
// popover (Chakra Select), so the full 50-state list never fills the screen.
const STATE_COLLECTION = createListCollection({
  items: US_STATES.map((s) => ({ label: `${s.name} (${s.code})`, value: s.code })),
});

// Friendly labels for API field keys, so server validation messages read like
// English instead of snake_case. Used by humanizeMessage() and the error banner.
const FIELD_LABELS: Record<string, string> = {
  slug: "URL slug",
  name: "Event name",
  subtitle: "Subtitle",
  description: "Description",
  site_id: "Site",
  start_date: "Start date",
  end_date: "End date",
  timezone: "Timezone",
  location_venue_name: "Venue name",
  location_street_1: "Street address",
  location_street_2: "Street address line 2",
  location_city: "City",
  location_state: "State",
  location_postal_code: "Postal code",
  location_country: "Country",
  capacity: "Capacity",
  currency: "Currency",
  price_cents: "Price",
  refund_full_until: "Full-refund deadline",
  refund_partial_until: "Partial-refund deadline",
  refund_partial_pct: "Partial-refund percentage",
  application_status: "Application status",
  application_schema: "Application form",
  format: "Format",
  group_size_label: "Group size label",
  length_label: "Length label",
};

// Rewrites Laravel's raw attribute phrases (e.g. "refund partial until") into the
// friendly labels above so messages are readable. Longest keys first to avoid
// partial overlaps.
function humanizeMessage(msg: string): string {
  let out = msg;
  const entries = Object.entries(FIELD_LABELS).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [key, label] of entries) {
    const phrase = key.replace(/_/g, " ");
    out = out.replace(new RegExp(`\\b${phrase}\\b`, "gi"), label);
  }
  return out;
}

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
    // New events inherit the standard application form. Editing it in the
    // builder diverges it into a per-event custom schema.
    application_schema: cloneDefaultApplicationSchema(),
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

  // Empty price is treated as free ($0), not an error.
  const dollars = form.price_dollars.trim() === "" ? 0 : parseFloat(form.price_dollars);
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
  // Server-side validation errors, keyed by API field name (already humanized).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const surfaceBg = useColorModeValue("white", "gray.900");
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const freeBannerBg = useColorModeValue("green.50", "green.900");
  const freeBannerBorder = useColorModeValue("green.200", "green.700");
  const freeBannerText = useColorModeValue("green.800", "green.200");
  const errBannerBg = useColorModeValue("red.50", "red.950");
  const errBannerBorder = useColorModeValue("red.300", "red.700");
  const errText = useColorModeValue("red.700", "red.200");
  const fe = (key: string): string | undefined => fieldErrors[key];

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
    setFieldErrors({});
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
      // httpClient rejects with a flat ApiError ({ message, errors, status }),
      // NOT an axios { response: { data } } wrapper — reading the wrong shape is
      // why real validation errors used to collapse into a generic message.
      const apiErr = err as Partial<ApiError>;
      const raw = apiErr?.errors ?? {};
      const next: Record<string, string> = {};
      for (const [field, msgs] of Object.entries(raw)) {
        if (Array.isArray(msgs) && msgs.length) {
          next[field] = humanizeMessage(String(msgs[0]));
        }
      }
      setFieldErrors(next);
      const count = Object.keys(next).length;
      toaster.error({
        title:
          count > 0
            ? `Couldn't save — please fix ${count} field${count === 1 ? "" : "s"} highlighted below.`
            : apiErr?.message
              ? humanizeMessage(apiErr.message)
              : "Failed to save event.",
      });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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
      const apiErr = err as Partial<ApiError>;
      toaster.error({
        title: apiErr?.message
          ? humanizeMessage(apiErr.message)
          : "Failed to delete event.",
      });
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
        {Object.keys(fieldErrors).length > 0 && (
          <Box
            borderWidth={1}
            borderColor={errBannerBorder}
            bg={errBannerBg}
            borderRadius="md"
            p={4}
          >
            <HStack gap={2} mb={2} color={errText}>
              <LuTriangleAlert />
              <Text fontWeight="semibold">
                Please fix the following before saving:
              </Text>
            </HStack>
            <VStack as="ul" align="stretch" gap={1} pl={1}>
              {Object.entries(fieldErrors).map(([field, msg]) => (
                <Text as="li" key={field} fontSize="sm" color={errText} listStyleType="none">
                  • {msg}
                </Text>
              ))}
            </VStack>
          </Box>
        )}
        {/* Basics */}
        <SectionCard title="Basics" surfaceBg={surfaceBg} borderColor={borderColor} onSave={handleSave} saving={saving} saveLabel={mode === "create" ? "Create" : "Save"}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {mode === "create" && (
              <FieldShell label="Site" required error={fe("site_id")}>
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
            <FieldShell label="Name" required error={fe("name")}>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                px={4}
                placeholder="Aligned: A Pastors' Retreat"
              />
            </FieldShell>
            <FieldShell label="Slug" required helpText="lowercase, hyphens only" error={fe("slug")}>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                px={4}
                placeholder="aligned"
              />
            </FieldShell>
            <FieldShell label="Subtitle" error={fe("subtitle")}>
              <Input
                value={form.subtitle}
                onChange={(e) => setField("subtitle", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Lifecycle status" required error={fe("application_status")}>
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
            <FieldShell label="Description" error={fe("description")}>
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
        <SectionCard title="Schedule & location" surfaceBg={surfaceBg} borderColor={borderColor} onSave={handleSave} saving={saving} saveLabel={mode === "create" ? "Create" : "Save"}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <FieldShell label="Start date" required error={fe("start_date")}>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="End date" required error={fe("end_date")}>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setField("end_date", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Timezone" required error={fe("timezone")}>
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

            <FieldShell label="Venue" error={fe("location_venue_name")}>
              <Input
                value={form.location_venue_name}
                onChange={(e) => setField("location_venue_name", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Street" error={fe("location_street_1")}>
              <Input
                value={form.location_street_1}
                onChange={(e) => setField("location_street_1", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Street (line 2)" error={fe("location_street_2")}>
              <Input
                value={form.location_street_2}
                onChange={(e) => setField("location_street_2", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="City" required helpText="Where the retreat is held." error={fe("location_city")}>
              <Input
                value={form.location_city}
                onChange={(e) => setField("location_city", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="State" required helpText="Pick or type to search — avoids typos." error={fe("location_state")}>
              <StateSelect
                value={form.location_state}
                onChange={(v) => setField("location_state", v)}
                borderColor={borderColor}
                surfaceBg={surfaceBg}
              />
            </FieldShell>
            <FieldShell label="Postal code" helpText="Numbers only, e.g. 32550 or 32550-1234." error={fe("location_postal_code")}>
              <Input
                value={form.location_postal_code}
                onChange={(e) =>
                  setField("location_postal_code", sanitizeZip(e.target.value))
                }
                inputMode="numeric"
                placeholder="32550"
                px={4}
              />
            </FieldShell>
            <FieldShell label="Country" helpText="US only for now." error={fe("location_country")}>
              <Input
                value="US"
                disabled
                readOnly
                px={4}
                cursor="not-allowed"
                opacity={0.7}
              />
            </FieldShell>
          </SimpleGrid>
        </SectionCard>

        {/* Capacity & pricing */}
        <SectionCard title="Capacity & pricing" surfaceBg={surfaceBg} borderColor={borderColor} onSave={handleSave} saving={saving} saveLabel={mode === "create" ? "Create" : "Save"}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <FieldShell label="Capacity" required helpText="Max attendees. Whole number." error={fe("capacity")}>
              <Input
                value={form.capacity}
                onChange={(e) => setField("capacity", digitsOnly(e.target.value))}
                inputMode="numeric"
                placeholder="24"
                px={4}
              />
            </FieldShell>
            <FieldShell label="Currency" required helpText="Almost always USD." error={fe("currency")}>
              <Select
                value={form.currency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setField("currency", e.target.value)
                }
                borderWidth={1}
                borderColor={borderColor}
                borderRadius="md"
                px={4}
                py={2}
                fontSize="sm"
                bg={surfaceBg}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FieldShell>
            <FieldShell
              label="Price"
              required
              error={fe("price_cents")}
              helpText={
                Number(form.price_dollars) > 0
                  ? "Dollars, e.g. 2500.00."
                  : "Set to 0 for a FREE event — no payment, applicants are confirmed directly."
              }
            >
              <Input
                value={form.price_dollars}
                onChange={(e) =>
                  setField("price_dollars", sanitizeMoney(e.target.value))
                }
                inputMode="decimal"
                placeholder="0.00"
                px={4}
              />
            </FieldShell>
          </SimpleGrid>
          {(form.price_dollars.trim() === "" || Number(form.price_dollars) === 0) && (
            <Box
              mt={3}
              px={4}
              py={2}
              borderRadius="md"
              bg={freeBannerBg}
              borderWidth={1}
              borderColor={freeBannerBorder}
            >
              <Text fontSize="sm" color={freeBannerText}>
                This is a <strong>free event</strong> — no payment is collected. Applicants
                are confirmed directly without a Stripe checkout.
              </Text>
            </Box>
          )}
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
        <SectionCard title="Display & media" surfaceBg={surfaceBg} borderColor={borderColor} onSave={handleSave} saving={saving} saveLabel={mode === "create" ? "Create" : "Save"}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <FieldShell label="Format" helpText="e.g. In-person retreat" error={fe("format")}>
              <Input
                value={form.format}
                onChange={(e) => setField("format", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Group size label" helpText="e.g. Up to 12 leaders" error={fe("group_size_label")}>
              <Input
                value={form.group_size_label}
                onChange={(e) => setField("group_size_label", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Length label" helpText="e.g. 3 days, 2 nights" error={fe("length_label")}>
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
        <SectionCard title="Refund policy" surfaceBg={surfaceBg} borderColor={borderColor} onSave={handleSave} saving={saving} saveLabel={mode === "create" ? "Create" : "Save"}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <FieldShell label="Full refund until" error={fe("refund_full_until")}>
              <Input
                type="date"
                value={form.refund_full_until}
                onChange={(e) => setField("refund_full_until", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Partial refund until" error={fe("refund_partial_until")}>
              <Input
                type="date"
                value={form.refund_partial_until}
                onChange={(e) => setField("refund_partial_until", e.target.value)}
                px={4}
              />
            </FieldShell>
            <FieldShell label="Partial refund %" helpText="0-100" error={fe("refund_partial_pct")}>
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
        <SectionCard title="Application form" surfaceBg={surfaceBg} borderColor={borderColor} onSave={handleSave} saving={saving} saveLabel={mode === "create" ? "Create" : "Save"}>
          <Text fontSize="xs" color={subduedText} mb={4}>
            Compose the multi-step application form applicants will fill
            out. Add steps, sections, and fields visually — or switch to{" "}
            <chakra.b>Raw JSON</chakra.b> to import/export a complete schema.
            An application form is required for this event to accept
            applicants — an event with no form can&rsquo;t be applied to.
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

/**
 * State picker built on Chakra's Select. Unlike a native <select>, the popover
 * is a fixed-height, scrollable list with built-in type-to-search — so the full
 * 50-state list stays compact instead of filling the screen.
 */
function StateSelect({
  value,
  onChange,
  borderColor,
  surfaceBg,
}: {
  value: string;
  onChange: (v: string) => void;
  borderColor: string;
  surfaceBg: string;
}) {
  return (
    <CSelect.Root
      collection={STATE_COLLECTION}
      value={value ? [value] : []}
      onValueChange={(d) => onChange(d.value[0] ?? "")}
      size="sm"
    >
      <CSelect.HiddenSelect />
      <CSelect.Control>
        <CSelect.Trigger
          borderWidth={1}
          borderColor={borderColor}
          borderRadius="md"
          bg={surfaceBg}
          px={4}
          py={2}
        >
          <CSelect.ValueText placeholder="Select a state…" />
          <CSelect.IndicatorGroup>
            <CSelect.Indicator />
          </CSelect.IndicatorGroup>
        </CSelect.Trigger>
      </CSelect.Control>
      <Portal>
        <CSelect.Positioner>
          <CSelect.Content maxH="288px" overflowY="auto">
            {STATE_COLLECTION.items.map((item) => (
              <CSelect.Item item={item} key={item.value}>
                {item.label}
                <CSelect.ItemIndicator />
              </CSelect.Item>
            ))}
          </CSelect.Content>
        </CSelect.Positioner>
      </Portal>
    </CSelect.Root>
  );
}

function SectionCard({
  title,
  children,
  surfaceBg,
  borderColor,
  onSave,
  saving,
  saveLabel = "Save",
}: {
  title: string;
  children: React.ReactNode;
  surfaceBg: string;
  borderColor: string;
  /** When provided, renders a Save button in the section header. */
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
}) {
  return (
    <Card.Root bg={surfaceBg} borderWidth={1} borderColor={borderColor}>
      <Card.Body p={5}>
        <HStack mb={4} justify="space-between" align="center">
          <Heading size="sm">{title}</Heading>
          {onSave && (
            <Button
              size="xs"
              variant="outline"
              colorPalette="brand"
              onClick={onSave}
              loading={saving}
              px={3}
            >
              <LuSave /> {saveLabel}
            </Button>
          )}
        </HStack>
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
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  helpText?: string;
  error?: string;
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
      {error ? (
        <Text fontSize="xs" color="red.500" mt={1}>
          {error}
        </Text>
      ) : helpText ? (
        <Text fontSize="xs" color={subduedText} mt={1}>
          {helpText}
        </Text>
      ) : null}
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
