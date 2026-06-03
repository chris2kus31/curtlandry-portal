import type {
  ApplicationSchema,
  SchemaField,
  SchemaFieldType,
  SchemaOption,
  SchemaSection,
  SchemaStep,
} from "@/lib/api/admin-applications-service";

/* --------------------------- Type metadata ---------------------------- */

export interface FieldTypeMeta {
  value: SchemaFieldType;
  label: string;
  hint: string;
}

/**
 * Ordered list of field types the builder exposes. Order matters — it's
 * what the "add field" menu will display, so we surface the most-used
 * types first.
 */
export const FIELD_TYPES: FieldTypeMeta[] = [
  { value: "text", label: "Short text", hint: "Single-line input (name, title, etc.)" },
  { value: "textarea", label: "Long text", hint: "Multi-line input for paragraphs" },
  { value: "email", label: "Email", hint: "Email address with validation" },
  { value: "tel", label: "Phone", hint: "Phone number (free-form)" },
  { value: "number", label: "Number", hint: "Numeric input" },
  { value: "select", label: "Dropdown", hint: "Pick one from a list" },
  { value: "radio", label: "Single-choice cards", hint: "Visual radio with icons" },
  { value: "checkbox_group", label: "Multi-choice cards", hint: "Pick several with optional cap" },
  { value: "checkbox", label: "Single checkbox", hint: "Yes/no or agree" },
  { value: "info_callout", label: "Info callout", hint: "Read-only banner shown to the applicant" },
];

export const TYPES_WITH_OPTIONS: SchemaFieldType[] = [
  "select",
  "radio",
  "checkbox_group",
];

export const PROFILE_MAPPINGS: { value: SchemaField["mapped"]; label: string }[] =
  [
    { value: undefined, label: "— none —" },
    { value: "first_name", label: "First name" },
    { value: "last_name", label: "Last name" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
  ];

/* ------------------------------- Slugs ------------------------------- */

/**
 * Turn a free-form label into a stable, lowercase snake_case key. Bounded
 * to 64 chars so a long sentence-as-label doesn't blow out the key.
 */
export function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/** Ensure a key is unique within a list of existing keys. */
export function uniqueKey(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

/* ------------------------- Default factories ------------------------- */

export function defaultStep(existing: SchemaStep[]): SchemaStep {
  const baseKey = uniqueKey(
    "step",
    existing.map((s) => s.key),
  );
  return {
    key: baseKey,
    title: `Step ${existing.length + 1}`,
    navLabel: `Step ${existing.length + 1}`,
    sections: [],
  };
}

export function defaultSection(existing: SchemaSection[]): SchemaSection {
  const baseKey = uniqueKey(
    "section",
    existing.map((s) => s.key ?? ""),
  );
  return {
    key: baseKey,
    label: "",
    fields: [],
  };
}

export function defaultField(
  type: SchemaFieldType,
  existingKeys: string[],
): SchemaField {
  const baseKey = uniqueKey(slugify(`new ${type}`) || "field", existingKeys);
  const common: SchemaField = {
    key: baseKey,
    label: "New field",
    type,
    columnSpan: 2,
  };

  switch (type) {
    case "select":
    case "radio":
      return {
        ...common,
        columnSpan: 2,
        options: [
          { value: "option_1", label: "Option 1" },
          { value: "option_2", label: "Option 2" },
        ],
      };
    case "checkbox_group":
      return {
        ...common,
        columnSpan: 2,
        options: [
          { value: "option_1", label: "Option 1" },
          { value: "option_2", label: "Option 2" },
        ],
      };
    case "checkbox":
      return { ...common, columnSpan: 2, label: "I agree to…" };
    case "textarea":
      return { ...common, columnSpan: 2, maxLength: 500 };
    case "info_callout":
      return {
        ...common,
        columnSpan: 2,
        body: "Helpful information for the applicant.",
        variant: "info",
      };
    case "email":
      return { ...common, columnSpan: 1 };
    case "tel":
      return { ...common, columnSpan: 1 };
    case "text":
    case "number":
    default:
      return { ...common, columnSpan: 1 };
  }
}

/** Brand-new, empty schema (v2). */
export function emptySchema(): ApplicationSchema {
  return { version: 2, steps: [] };
}

/* --------------------------- Array helpers ---------------------------- */

export function move<T>(arr: T[], from: number, direction: -1 | 1): T[] {
  const to = from + direction;
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function replaceAt<T>(arr: T[], index: number, next: T): T[] {
  const copy = arr.slice();
  copy[index] = next;
  return copy;
}

export function removeAt<T>(arr: T[], index: number): T[] {
  const copy = arr.slice();
  copy.splice(index, 1);
  return copy;
}

/* ---------------------- Field accessor helpers ------------------------ */

/** Flatten all field keys across a step so we can enforce uniqueness. */
export function collectFieldKeys(step: SchemaStep): string[] {
  const out: string[] = [];
  const sections = step.sections?.length
    ? step.sections
    : step.fields
      ? [{ fields: step.fields }]
      : [];
  for (const section of sections) {
    for (const field of section.fields ?? []) out.push(field.key);
  }
  return out;
}

/* ----------------------------- Validation ----------------------------- */

/**
 * Lightweight validation so we can warn the user inline. The server has
 * the final say but catching obvious issues here saves a round-trip.
 */
export interface SchemaValidationResult {
  ok: boolean;
  warnings: string[];
}

export function validateSchema(schema: ApplicationSchema): SchemaValidationResult {
  const warnings: string[] = [];

  if (!schema.steps?.length) {
    warnings.push("Schema has no steps.");
  }

  const stepKeys = new Set<string>();
  schema.steps.forEach((step, idx) => {
    if (!step.key) warnings.push(`Step ${idx + 1}: missing key.`);
    if (!step.title) warnings.push(`Step ${idx + 1}: missing title.`);
    if (step.key && stepKeys.has(step.key))
      warnings.push(`Step ${idx + 1}: duplicate key "${step.key}".`);
    stepKeys.add(step.key);

    const fieldKeys = new Set<string>();
    const sections = step.sections?.length
      ? step.sections
      : step.fields
        ? [{ fields: step.fields }]
        : [];

    sections.forEach((section, sIdx) => {
      section.fields?.forEach((field, fIdx) => {
        if (!field.key)
          warnings.push(
            `Step ${idx + 1} → section ${sIdx + 1} → field ${fIdx + 1}: missing key.`,
          );
        if (!field.label && field.type !== "info_callout")
          warnings.push(
            `Step ${idx + 1} → section ${sIdx + 1} → field ${fIdx + 1}: missing label.`,
          );
        if (field.key && fieldKeys.has(field.key))
          warnings.push(
            `Step ${idx + 1}: duplicate field key "${field.key}".`,
          );
        fieldKeys.add(field.key);

        if (TYPES_WITH_OPTIONS.includes(field.type)) {
          const opts = field.options ?? [];
          if (opts.length === 0)
            warnings.push(
              `Step ${idx + 1} → "${field.label || field.key}": no options.`,
            );
        }
      });
    });
  });

  return { ok: warnings.length === 0, warnings };
}

/* ---------------------- Schema option normalization ------------------ */

/** Coerce a string-or-option into the canonical SchemaOption form. */
export function normalizeOption(option: string | SchemaOption): SchemaOption {
  if (typeof option === "string") return { value: option, label: option };
  return option;
}
