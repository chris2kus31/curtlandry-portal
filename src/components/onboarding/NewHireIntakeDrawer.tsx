"use client";

import { useState, useEffect, type ReactNode } from "react";
import {
  Box,
  Drawer,
  Portal,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Flex,
  Spinner,
  Dialog,
  CloseButton,
  Badge,
  SimpleGrid,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuX,
  LuUserPlus,
  LuMail,
  LuBuilding,
  LuBriefcase,
  LuMapPin,
  LuUsers,
  LuClock,
  LuCalendar,
  LuLaptop,
  LuSave,
  LuPackage,
  LuTriangleAlert,
  LuExpand,
  LuCheck,
  LuMonitor,
  LuTablet,
  LuSmartphone,
  LuArrowLeft,
} from "react-icons/lu";
import { onboardingService } from "@/lib/api";
import type {
  OnboardingFormOptions,
  IntakePayload,
  OnboardingCase,
  OnboardingAsset,
} from "@/lib/api";

interface NewHireIntakeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (created: OnboardingCase) => void;
  options: OnboardingFormOptions | null;
  optionsLoading?: boolean;
}

interface FormState {
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  department: string;
  work_location: string;
  start_date: string;
  reports_to: string;
  employment_type: string;
  weekly_hours: string;
  device_needed: boolean;
  requested_asset_id: string;
  purchase_needed: boolean;
  requested_device_note: string;
}

/** Matches Asset Tiger / portal asset types, plus iPad as a tablet subtype. */
type DeviceCategory =
  | "laptop"
  | "desktop"
  | "ipad"
  | "tablet"
  | "phone"
  | "other";

const INITIAL_FORM: FormState = {
  email: "",
  first_name: "",
  last_name: "",
  job_title: "",
  department: "",
  work_location: "",
  start_date: "",
  reports_to: "",
  employment_type: "full_time",
  weekly_hours: "40",
  device_needed: false,
  requested_asset_id: "",
  purchase_needed: false,
  requested_device_note: "",
};

const INTAKE_DRAFT_KEY = "people-ops:new-hire-intake-draft";

interface IntakeDraft {
  form: FormState;
  softwareIds: number[];
  deviceCategory: DeviceCategory | null;
  savedAt: string;
}

function isMeaningfulDraft(
  form: FormState,
  softwareIds: number[],
  deviceCategory: DeviceCategory | null,
): boolean {
  if (softwareIds.length > 0 || deviceCategory) return true;
  return (
    !!form.email.trim() ||
    !!form.first_name.trim() ||
    !!form.last_name.trim() ||
    !!form.job_title.trim() ||
    !!form.department ||
    !!form.work_location ||
    !!form.start_date ||
    !!form.reports_to ||
    form.employment_type !== INITIAL_FORM.employment_type ||
    form.weekly_hours !== INITIAL_FORM.weekly_hours ||
    form.device_needed ||
    !!form.requested_asset_id ||
    form.purchase_needed ||
    !!form.requested_device_note.trim()
  );
}

function readIntakeDraft(): IntakeDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INTAKE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IntakeDraft;
    if (!parsed?.form || typeof parsed.form !== "object") return null;
    return {
      form: { ...INITIAL_FORM, ...parsed.form },
      softwareIds: Array.isArray(parsed.softwareIds)
        ? parsed.softwareIds.filter((id) => typeof id === "number")
        : [],
      deviceCategory: parsed.deviceCategory ?? null,
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeIntakeDraft(
  form: FormState,
  softwareIds: number[],
  deviceCategory: DeviceCategory | null,
): void {
  if (typeof window === "undefined") return;
  const draft: IntakeDraft = {
    form,
    softwareIds,
    deviceCategory,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(INTAKE_DRAFT_KEY, JSON.stringify(draft));
}

function clearIntakeDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(INTAKE_DRAFT_KEY);
}

const DEVICE_CATEGORIES: {
  id: DeviceCategory;
  label: string;
  icon: typeof LuLaptop;
}[] = [
  { id: "laptop", label: "Laptop", icon: LuLaptop },
  { id: "desktop", label: "Desktop", icon: LuMonitor },
  { id: "ipad", label: "iPad", icon: LuTablet },
  { id: "tablet", label: "Tablet", icon: LuTablet },
  { id: "phone", label: "Phone", icon: LuSmartphone },
  { id: "other", label: "Other", icon: LuPackage },
];

function getAssetCategory(asset: OnboardingAsset): DeviceCategory {
  const type = (asset.type || "").toLowerCase();
  const name = (asset.name || "").toLowerCase();
  const label = (asset.type_label || "").toLowerCase();

  if (type === "laptop" || label === "laptop") return "laptop";
  if (type === "desktop" || label === "desktop") return "desktop";
  if (
    type === "phone" ||
    label === "phone" ||
    name.includes("iphone") ||
    (name.includes("phone") && !name.includes("headphones"))
  ) {
    return "phone";
  }
  if (
    type === "tablet" ||
    label === "tablet" ||
    name.includes("ipad") ||
    name.includes("tablet")
  ) {
    return name.includes("ipad") ? "ipad" : "tablet";
  }
  // Include every other Asset Tiger assignable asset (phone already handled;
  // unknown / missing / custom types land in Other so nothing is hidden).
  return "other";
}

function assetMatchesCategory(
  asset: OnboardingAsset,
  category: DeviceCategory,
): boolean {
  return getAssetCategory(asset) === category;
}

function prettifyEmploymentType(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

export function NewHireIntakeDrawer({
  isOpen,
  onClose,
  onCreated,
  options,
  optionsLoading = false,
}: NewHireIntakeDrawerProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [softwareIds, setSoftwareIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<OnboardingAsset | null>(
    null,
  );
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategory | null>(
    null,
  );
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Colors — all hooks before any conditional return
  const drawerBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const labelColor = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const footerBg = useColorModeValue("gray.50", "gray.800");
  const errorColor = useColorModeValue("red.500", "red.400");
  const cardBg = useColorModeValue("white", "gray.900");
  const imageBg = useColorModeValue("gray.100", "gray.800");
  const selectedCardBg = useColorModeValue("brand.50", "whiteAlpha.100");
  const previewBackdrop = useColorModeValue("blackAlpha.700", "blackAlpha.800");
  const draftBannerBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const draftBannerBorder = useColorModeValue("blue.100", "whiteAlpha.200");

  // Restore draft when opening; reset only when there isn't one.
  useEffect(() => {
    if (!isOpen) {
      setDraftHydrated(false);
      return;
    }

    const draft = readIntakeDraft();
    if (
      draft &&
      isMeaningfulDraft(draft.form, draft.softwareIds, draft.deviceCategory)
    ) {
      setForm(draft.form);
      setSoftwareIds(draft.softwareIds);
      setDeviceCategory(draft.deviceCategory);
      setDraftRestored(true);
    } else {
      setForm(INITIAL_FORM);
      setSoftwareIds([]);
      setDeviceCategory(null);
      setDraftRestored(false);
    }
    setErrors({});
    setPreviewAsset(null);
    setDraftHydrated(true);
  }, [isOpen]);

  // Autosave while the drawer is open.
  useEffect(() => {
    if (!isOpen || !draftHydrated) return;

    const timer = window.setTimeout(() => {
      if (isMeaningfulDraft(form, softwareIds, deviceCategory)) {
        writeIntakeDraft(form, softwareIds, deviceCategory);
      } else {
        clearIntakeDraft();
        setDraftRestored(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [isOpen, draftHydrated, form, softwareIds, deviceCategory]);

  const discardDraft = () => {
    clearIntakeDraft();
    setForm(INITIAL_FORM);
    setSoftwareIds([]);
    setDeviceCategory(null);
    setErrors({});
    setPreviewAsset(null);
    setDraftRestored(false);
  };

  const selectAsset = (assetId: string) => {
    setForm((prev) => ({
      ...prev,
      requested_asset_id:
        prev.requested_asset_id === assetId ? "" : assetId,
      // Choosing an existing device implies no purchase request.
      purchase_needed:
        prev.requested_asset_id === assetId ? prev.purchase_needed : false,
    }));
  };

  const selectDeviceCategory = (category: DeviceCategory) => {
    setDeviceCategory(category);
    setForm((prev) => ({
      ...prev,
      requested_asset_id: "",
      purchase_needed: false,
    }));
  };

  const clearDeviceCategory = () => {
    setDeviceCategory(null);
    setForm((prev) => ({
      ...prev,
      requested_asset_id: "",
    }));
  };

  const setField = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Invalid email format";
    }
    if (!form.first_name.trim()) next.first_name = "First name is required";
    if (!form.last_name.trim()) next.last_name = "Last name is required";
    if (!form.start_date) next.start_date = "Start date is required";

    if (form.weekly_hours) {
      const hours = parseFloat(form.weekly_hours);
      if (isNaN(hours) || hours < 0 || hours > 80) {
        next.weekly_hours = "Weekly hours must be between 0 and 80";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload: IntakePayload = {
        email: form.email.trim().toLowerCase(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        job_title: form.job_title.trim() || undefined,
        department: form.department || undefined,
        work_location: form.work_location || undefined,
        start_date: form.start_date,
        reports_to: form.reports_to ? parseInt(form.reports_to, 10) : undefined,
        employment_type: form.employment_type || undefined,
        weekly_hours: form.weekly_hours
          ? parseFloat(form.weekly_hours)
          : undefined,
        device_needed: form.device_needed,
        requested_asset_id:
          form.device_needed && form.requested_asset_id
            ? parseInt(form.requested_asset_id, 10)
            : undefined,
        purchase_needed: form.device_needed ? form.purchase_needed : false,
        requested_device_note:
          form.device_needed && form.requested_device_note.trim()
            ? form.requested_device_note.trim()
            : undefined,
        software: softwareIds.length ? softwareIds : undefined,
      };

      const created = await onboardingService.submitIntake(payload);

      clearIntakeDraft();
      setDraftRestored(false);

      toaster.create({
        title: "Intake submitted",
        description: `${form.first_name} ${form.last_name} has been submitted. HR & IT have been notified.`,
        type: "success",
      });

      onCreated(created);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again";
      if (message.toLowerCase().includes("email")) {
        setErrors({ email: "This email is already in use" });
      } else {
        toaster.create({
          title: "Failed to submit intake",
          description: message,
          type: "error",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // --- Small presentational helpers (match CreateUserDrawer styling) ---

  const FieldLabel = ({
    icon,
    children,
    required,
  }: {
    icon?: ReactNode;
    children: ReactNode;
    required?: boolean;
  }) => (
    <HStack gap={2} mb={1.5}>
      {icon}
      <Text fontSize="sm" color={textSecondary}>
        {children}
        {required && (
          <Text as="span" color="red.500">
            {" "}
            *
          </Text>
        )}
      </Text>
    </HStack>
  );

  const SectionTitle = ({ children }: { children: ReactNode }) => (
    <Text
      fontSize="xs"
      fontWeight="semibold"
      color={labelColor}
      mb={3}
      textTransform="uppercase"
      letterSpacing="wide"
    >
      {children}
    </Text>
  );

  const StyledSelect = ({
    value,
    onChange,
    children,
  }: {
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
  }) => (
    <Box
      position="relative"
      bg={inputBg}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      _focusWithin={{ borderColor: "brand.500" }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 16px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "transparent",
          color: "inherit",
          fontSize: "14px",
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
          outline: "none",
        }}
      >
        {children}
      </select>
      <Box
        position="absolute"
        right={3}
        top="50%"
        transform="translateY(-50%)"
        pointerEvents="none"
        color={textSecondary}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </Box>
    </Box>
  );

  const Check = ({
    checked,
    onToggle,
    title,
    subtitle,
  }: {
    checked: boolean;
    onToggle: () => void;
    title: string;
    subtitle?: string;
  }) => (
    <HStack
      p={3}
      bg={inputBg}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      cursor="pointer"
      onClick={onToggle}
      _hover={{ borderColor: "brand.400" }}
      transition="all 0.15s"
      w="full"
    >
      <Box
        w={5}
        h={5}
        borderRadius="md"
        border="2px solid"
        borderColor={checked ? "brand.500" : borderColor}
        bg={checked ? "brand.500" : "transparent"}
        display="flex"
        alignItems="center"
        justifyContent="center"
        transition="all 0.15s"
        flexShrink={0}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
            <path
              d="M10 3L4.5 8.5L2 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        )}
      </Box>
      <Box flex={1}>
        <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
          {title}
        </Text>
        {subtitle && (
          <Text fontSize="xs" color={textSecondary}>
            {subtitle}
          </Text>
        )}
      </Box>
    </HStack>
  );

  const inputProps = {
    bg: inputBg,
    border: "1px solid",
    borderRadius: "lg",
    px: 4,
    _focus: { borderColor: "brand.500" },
  } as const;

  const iconColor = "var(--chakra-colors-gray-400)";
  const departments = options?.departments ?? {};
  const workLocations = options?.work_locations ?? {};
  const employmentTypes = options?.employment_types ?? [];
  const managers = options?.managers ?? [];
  const assignableAssets = options?.assignable_assets ?? [];
  const softwareCatalog = options?.software_catalog ?? [];

  const availableDeviceCategories = DEVICE_CATEGORIES.filter((category) =>
    assignableAssets.some((asset) =>
      assetMatchesCategory(asset, category.id),
    ),
  );

  const filteredAssets = deviceCategory
    ? assignableAssets.filter((asset) =>
        assetMatchesCategory(asset, deviceCategory),
      )
    : [];

  const selectedCategoryMeta = DEVICE_CATEGORIES.find(
    (c) => c.id === deviceCategory,
  );

  // Items offered for the chosen department: global (null department) + any
  // scoped to the selected department.
  const availableSoftware = softwareCatalog.filter(
    (s) => !s.department || s.department === form.department,
  );

  const toggleSoftware = (id: number) => {
    setSoftwareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Drop selections that no longer apply when the department changes.
  useEffect(() => {
    const allowed = new Set(
      softwareCatalog
        .filter((s) => !s.department || s.department === form.department)
        .map((s) => s.id),
    );
    setSoftwareIds((prev) => prev.filter((id) => allowed.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.department]);

  return (
    <>
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      placement="end"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg={drawerBg} maxW="480px" w="full">
            {/* Header */}
            <Box
              p={4}
              borderBottom="1px solid"
              borderColor={borderColor}
              bg={headerBg}
            >
              <Flex justify="space-between" align="center">
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="brand.500" color="white">
                    <LuUserPlus size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color={textPrimary}>
                      New Hire Intake
                    </Text>
                    <Text fontSize="sm" color={textSecondary}>
                      Submit a new hire for HR &amp; IT setup
                    </Text>
                  </Box>
                </HStack>
                <Box
                  as="button"
                  p={2}
                  borderRadius="lg"
                  color={textSecondary}
                  _hover={{ bg: hoverBg }}
                  onClick={onClose}
                >
                  <LuX size={20} />
                </Box>
              </Flex>
            </Box>

            {/* Body */}
            <Box p={5} overflowY="auto" flex={1}>
              {optionsLoading ? (
                <Flex justify="center" align="center" py={16}>
                  <Spinner size="lg" color="brand.500" />
                </Flex>
              ) : (
                <VStack gap={5} align="stretch">
                  {draftRestored && (
                    <HStack
                      p={3}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={draftBannerBorder}
                      bg={draftBannerBg}
                      justify="space-between"
                      align="center"
                      gap={3}
                    >
                      <Text fontSize="sm" color={textPrimary}>
                        Draft restored — pick up where you left off.
                      </Text>
                      <Box
                        as="button"
                        type="button"
                        fontSize="xs"
                        fontWeight="medium"
                        color="brand.500"
                        whiteSpace="nowrap"
                        _hover={{ color: "brand.600" }}
                        onClick={discardDraft}
                      >
                        Start fresh
                      </Box>
                    </HStack>
                  )}
                  {/* Basic info */}
                  <Box>
                    <SectionTitle>Basic Information</SectionTitle>
                    <VStack gap={3}>
                      <Box w="full">
                        <FieldLabel
                          icon={<LuMail size={14} color={iconColor} />}
                          required
                        >
                          Work Email
                        </FieldLabel>
                        <Input
                          value={form.email}
                          onChange={(e) => setField("email", e.target.value)}
                          placeholder="newhire@company.com"
                          borderColor={errors.email ? "red.500" : borderColor}
                          {...inputProps}
                        />
                        {errors.email && (
                          <Text fontSize="xs" color={errorColor} mt={1}>
                            {errors.email}
                          </Text>
                        )}
                      </Box>
                      <HStack gap={3} w="full" align="flex-start">
                        <Box flex={1}>
                          <FieldLabel required>First Name</FieldLabel>
                          <Input
                            value={form.first_name}
                            onChange={(e) =>
                              setField("first_name", e.target.value)
                            }
                            placeholder="John"
                            borderColor={
                              errors.first_name ? "red.500" : borderColor
                            }
                            {...inputProps}
                          />
                          {errors.first_name && (
                            <Text fontSize="xs" color={errorColor} mt={1}>
                              {errors.first_name}
                            </Text>
                          )}
                        </Box>
                        <Box flex={1}>
                          <FieldLabel required>Last Name</FieldLabel>
                          <Input
                            value={form.last_name}
                            onChange={(e) =>
                              setField("last_name", e.target.value)
                            }
                            placeholder="Doe"
                            borderColor={
                              errors.last_name ? "red.500" : borderColor
                            }
                            {...inputProps}
                          />
                          {errors.last_name && (
                            <Text fontSize="xs" color={errorColor} mt={1}>
                              {errors.last_name}
                            </Text>
                          )}
                        </Box>
                      </HStack>
                      <Box w="full">
                        <FieldLabel
                          icon={<LuBriefcase size={14} color={iconColor} />}
                        >
                          Job Title
                        </FieldLabel>
                        <Input
                          value={form.job_title}
                          onChange={(e) =>
                            setField("job_title", e.target.value)
                          }
                          placeholder="e.g., Media Producer"
                          borderColor={borderColor}
                          {...inputProps}
                        />
                      </Box>
                    </VStack>
                  </Box>

                  {/* Work info */}
                  <Box>
                    <SectionTitle>Work Information</SectionTitle>
                    <VStack gap={3}>
                      <Box w="full">
                        <FieldLabel
                          icon={<LuBuilding size={14} color={iconColor} />}
                        >
                          Department
                        </FieldLabel>
                        <StyledSelect
                          value={form.department}
                          onChange={(v) => setField("department", v)}
                        >
                          <option value="">Select department</option>
                          {Object.entries(departments).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </StyledSelect>
                      </Box>
                      <Box w="full">
                        <FieldLabel
                          icon={<LuMapPin size={14} color={iconColor} />}
                        >
                          Work Location
                        </FieldLabel>
                        <StyledSelect
                          value={form.work_location}
                          onChange={(v) => setField("work_location", v)}
                        >
                          <option value="">Select location</option>
                          {Object.entries(workLocations).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </StyledSelect>
                      </Box>
                      <Box w="full">
                        <FieldLabel
                          icon={<LuUsers size={14} color={iconColor} />}
                        >
                          Reports To
                        </FieldLabel>
                        <StyledSelect
                          value={form.reports_to}
                          onChange={(v) => setField("reports_to", v)}
                        >
                          <option value="">Select manager</option>
                          {managers.map((mgr) => (
                            <option key={mgr.id} value={mgr.id}>
                              {mgr.name ??
                                `${mgr.first_name} ${mgr.last_name}`}
                            </option>
                          ))}
                        </StyledSelect>
                      </Box>
                      <HStack gap={3} w="full" align="flex-start">
                        <Box flex={1}>
                          <FieldLabel>Employment Type</FieldLabel>
                          <StyledSelect
                            value={form.employment_type}
                            onChange={(v) => setField("employment_type", v)}
                          >
                            {employmentTypes.length === 0 && (
                              <option value="full_time">Full-Time</option>
                            )}
                            {employmentTypes.map((type) => (
                              <option key={type} value={type}>
                                {prettifyEmploymentType(type)}
                              </option>
                            ))}
                          </StyledSelect>
                        </Box>
                        <Box flex={1}>
                          <FieldLabel
                            icon={<LuClock size={14} color={iconColor} />}
                          >
                            Weekly Hours
                          </FieldLabel>
                          <Input
                            type="number"
                            value={form.weekly_hours}
                            onChange={(e) =>
                              setField("weekly_hours", e.target.value)
                            }
                            placeholder="40"
                            min="0"
                            max="80"
                            borderColor={
                              errors.weekly_hours ? "red.500" : borderColor
                            }
                            {...inputProps}
                          />
                          {errors.weekly_hours && (
                            <Text fontSize="xs" color={errorColor} mt={1}>
                              {errors.weekly_hours}
                            </Text>
                          )}
                        </Box>
                      </HStack>
                      <Box w="full">
                        <FieldLabel
                          icon={<LuCalendar size={14} color={iconColor} />}
                          required
                        >
                          Start Date
                        </FieldLabel>
                        <Input
                          type="date"
                          value={form.start_date}
                          onChange={(e) =>
                            setField("start_date", e.target.value)
                          }
                          borderColor={
                            errors.start_date ? "red.500" : borderColor
                          }
                          {...inputProps}
                        />
                        {errors.start_date && (
                          <Text fontSize="xs" color={errorColor} mt={1}>
                            {errors.start_date}
                          </Text>
                        )}
                        <Text fontSize="xs" color={textSecondary} mt={1}>
                          PTO accrual and account activation are anchored to
                          this date.
                        </Text>
                      </Box>
                    </VStack>
                  </Box>

                  {/* Device & equipment */}
                  <Box>
                    <SectionTitle>Device &amp; Equipment</SectionTitle>
                    <VStack gap={3}>
                      <Check
                        checked={form.device_needed}
                        onToggle={() => {
                          const next = !form.device_needed;
                          setField("device_needed", next);
                          if (!next) {
                            setDeviceCategory(null);
                            setField("requested_asset_id", "");
                            setField("purchase_needed", false);
                          }
                        }}
                        title="This hire needs a device"
                        subtitle="Laptop, desktop, tablet, or other equipment"
                      />
                      {form.device_needed && (
                        <>
                          <Box w="full">
                            {!deviceCategory ? (
                              <>
                                <FieldLabel
                                  icon={
                                    <LuLaptop size={14} color={iconColor} />
                                  }
                                >
                                  What kind of device?
                                </FieldLabel>
                                {availableDeviceCategories.length === 0 ? (
                                  <Box
                                    p={4}
                                    borderRadius="lg"
                                    border="1px dashed"
                                    borderColor={borderColor}
                                    bg={inputBg}
                                  >
                                    <Text fontSize="sm" color={textSecondary}>
                                      No available devices in inventory
                                    </Text>
                                  </Box>
                                ) : (
                                  <SimpleGrid columns={2} gap={2.5}>
                                    {availableDeviceCategories.map(
                                      (category) => {
                                        const Icon = category.icon;
                                        const count = assignableAssets.filter(
                                          (asset) =>
                                            assetMatchesCategory(
                                              asset,
                                              category.id,
                                            ),
                                        ).length;
                                        return (
                                          <Box
                                            key={category.id}
                                            as="button"
                                            type="button"
                                            p={4}
                                            borderRadius="xl"
                                            border="1.5px solid"
                                            borderColor={borderColor}
                                            bg={cardBg}
                                            textAlign="left"
                                            cursor="pointer"
                                            onClick={() =>
                                              selectDeviceCategory(category.id)
                                            }
                                            _hover={{
                                              borderColor: "brand.400",
                                              bg: hoverBg,
                                            }}
                                            transition="all 0.15s"
                                          >
                                            <HStack gap={3} align="center">
                                              <Box
                                                p={2}
                                                borderRadius="lg"
                                                bg={imageBg}
                                                color={textPrimary}
                                              >
                                                <Icon size={18} />
                                              </Box>
                                              <Box>
                                                <Text
                                                  fontSize="sm"
                                                  fontWeight="semibold"
                                                  color={textPrimary}
                                                >
                                                  {category.label}
                                                </Text>
                                                <Text
                                                  fontSize="xs"
                                                  color={textSecondary}
                                                >
                                                  {count} available
                                                </Text>
                                              </Box>
                                            </HStack>
                                          </Box>
                                        );
                                      },
                                    )}
                                  </SimpleGrid>
                                )}
                              </>
                            ) : (
                              <>
                                <Flex
                                  justify="space-between"
                                  align="center"
                                  mb={1.5}
                                  gap={2}
                                >
                                  <FieldLabel
                                    icon={(() => {
                                      const Icon =
                                        selectedCategoryMeta?.icon ?? LuLaptop;
                                      return (
                                        <Icon size={14} color={iconColor} />
                                      );
                                    })()}
                                  >
                                    {selectedCategoryMeta?.label ?? "Devices"}
                                  </FieldLabel>
                                  <Box
                                    as="button"
                                    type="button"
                                    onClick={clearDeviceCategory}
                                    display="flex"
                                    alignItems="center"
                                    gap={1}
                                    fontSize="xs"
                                    color="brand.500"
                                    fontWeight="medium"
                                    _hover={{ color: "brand.600" }}
                                  >
                                    <LuArrowLeft size={12} />
                                    Change type
                                  </Box>
                                </Flex>

                                {filteredAssets.length === 0 ? (
                                  <Box
                                    p={4}
                                    borderRadius="lg"
                                    border="1px dashed"
                                    borderColor={borderColor}
                                    bg={inputBg}
                                  >
                                    <Text fontSize="sm" color={textSecondary}>
                                      No{" "}
                                      {selectedCategoryMeta?.label.toLowerCase() ??
                                        "devices"}{" "}
                                      available right now
                                    </Text>
                                  </Box>
                                ) : (
                                  <VStack gap={2.5} align="stretch">
                                    {filteredAssets.map((asset) => {
                                      const selected =
                                        form.requested_asset_id ===
                                        String(asset.id);
                                      return (
                                        <HStack
                                          key={asset.id}
                                          as="button"
                                          type="button"
                                          align="stretch"
                                          gap={3}
                                          p={3}
                                          w="full"
                                          textAlign="left"
                                          bg={
                                            selected ? selectedCardBg : cardBg
                                          }
                                          borderRadius="xl"
                                          border="1.5px solid"
                                          borderColor={
                                            selected
                                              ? "brand.500"
                                              : borderColor
                                          }
                                          cursor="pointer"
                                          onClick={() =>
                                            selectAsset(String(asset.id))
                                          }
                                          _hover={{
                                            borderColor: selected
                                              ? "brand.500"
                                              : "brand.400",
                                            bg: selected
                                              ? selectedCardBg
                                              : hoverBg,
                                          }}
                                          transition="all 0.15s"
                                          position="relative"
                                        >
                                          <Box
                                            position="relative"
                                            w="76px"
                                            h="76px"
                                            flexShrink={0}
                                            borderRadius="lg"
                                            overflow="hidden"
                                            bg={imageBg}
                                            border="1px solid"
                                            borderColor={borderColor}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (asset.image_url) {
                                                setPreviewAsset(asset);
                                              }
                                            }}
                                            cursor={
                                              asset.image_url
                                                ? "zoom-in"
                                                : "default"
                                            }
                                            role={
                                              asset.image_url
                                                ? "button"
                                                : undefined
                                            }
                                            aria-label={
                                              asset.image_url
                                                ? `Preview ${asset.name}`
                                                : undefined
                                            }
                                          >
                                            {asset.image_url ? (
                                              <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                  src={asset.image_url}
                                                  alt={asset.name}
                                                  style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                  }}
                                                />
                                                <Box
                                                  position="absolute"
                                                  right={1}
                                                  bottom={1}
                                                  bg="blackAlpha.600"
                                                  color="white"
                                                  borderRadius="md"
                                                  p={0.5}
                                                  display="flex"
                                                  alignItems="center"
                                                  justifyContent="center"
                                                >
                                                  <LuExpand size={12} />
                                                </Box>
                                              </>
                                            ) : (
                                              <Flex
                                                w="full"
                                                h="full"
                                                align="center"
                                                justify="center"
                                                color={textSecondary}
                                              >
                                                <LuLaptop size={28} />
                                              </Flex>
                                            )}
                                          </Box>

                                          <VStack
                                            align="start"
                                            gap={1}
                                            flex={1}
                                            minW={0}
                                            py={0.5}
                                          >
                                            <HStack
                                              justify="space-between"
                                              w="full"
                                              gap={2}
                                            >
                                              <Text
                                                fontSize="sm"
                                                fontWeight="semibold"
                                                color={textPrimary}
                                                lineClamp={1}
                                              >
                                                {asset.name}
                                              </Text>
                                              {selected && (
                                                <Box
                                                  color="brand.500"
                                                  flexShrink={0}
                                                >
                                                  <LuCheck size={16} />
                                                </Box>
                                              )}
                                            </HStack>
                                            <HStack gap={2} flexWrap="wrap">
                                              {asset.type_label && (
                                                <Badge
                                                  size="sm"
                                                  variant="subtle"
                                                  colorPalette="gray"
                                                >
                                                  {asset.type_label}
                                                </Badge>
                                              )}
                                              {asset.status_label && (
                                                <Badge
                                                  size="sm"
                                                  variant="subtle"
                                                  colorPalette={
                                                    asset.status_color ===
                                                    "green"
                                                      ? "green"
                                                      : "gray"
                                                  }
                                                >
                                                  {asset.status_label}
                                                </Badge>
                                              )}
                                            </HStack>
                                            <Text
                                              fontSize="xs"
                                              color={textSecondary}
                                              lineClamp={1}
                                            >
                                              {[
                                                asset.asset_tag,
                                                asset.serial_number
                                                  ? `S/N ${asset.serial_number}`
                                                  : null,
                                              ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                            </Text>
                                          </VStack>
                                        </HStack>
                                      );
                                    })}
                                    <Text fontSize="xs" color={textSecondary}>
                                      Tap a card to assign. Click the image to
                                      enlarge.
                                      {process.env.NEXT_PUBLIC_DEV_AUTH ===
                                      "true"
                                        ? " (Asset Tiger local mock)"
                                        : ""}
                                    </Text>
                                  </VStack>
                                )}
                              </>
                            )}
                          </Box>
                          <Check
                            checked={form.purchase_needed}
                            onToggle={() => {
                              setField(
                                "purchase_needed",
                                !form.purchase_needed,
                              );
                              if (!form.purchase_needed) {
                                setField("requested_asset_id", "");
                              }
                            }}
                            title="A new device needs to be purchased"
                            subtitle="IT will be flagged to procure one"
                          />
                          {form.purchase_needed ? (
                            <Box
                              w="full"
                              p={4}
                              borderRadius="xl"
                              border="1.5px solid"
                              borderColor="brand.400"
                              bg={selectedCardBg}
                            >
                              <Text
                                fontSize="sm"
                                fontWeight="semibold"
                                color={textPrimary}
                                mb={1}
                              >
                                What should IT purchase?
                              </Text>
                              <Text
                                fontSize="xs"
                                color={textSecondary}
                                mb={3}
                              >
                                Be specific — model, size, accessories, and any
                                must-haves. This note goes straight to IT.
                              </Text>
                              <Textarea
                                value={form.requested_device_note}
                                onChange={(e) =>
                                  setField(
                                    "requested_device_note",
                                    e.target.value,
                                  )
                                }
                                placeholder={
                                  "Example:\n• MacBook Pro 14\" M3, 16GB RAM\n• Needs Adobe-capable machine\n• Include USB-C hub + laptop sleeve"
                                }
                                bg={cardBg}
                                border="1px solid"
                                borderColor={borderColor}
                                borderRadius="lg"
                                px={4}
                                py={3}
                                minH="160px"
                                rows={6}
                                fontSize="sm"
                                _focus={{ borderColor: "brand.500" }}
                              />
                            </Box>
                          ) : (
                            <Box w="full">
                              <FieldLabel>Device Notes</FieldLabel>
                              <Textarea
                                value={form.requested_device_note}
                                onChange={(e) =>
                                  setField(
                                    "requested_device_note",
                                    e.target.value,
                                  )
                                }
                                placeholder="Any specifics — e.g. preferred setup notes for an existing device"
                                bg={inputBg}
                                border="1px solid"
                                borderColor={borderColor}
                                borderRadius="lg"
                                px={4}
                                py={2}
                                rows={3}
                                _focus={{ borderColor: "brand.500" }}
                              />
                            </Box>
                          )}
                        </>
                      )}
                    </VStack>
                  </Box>

                  {/* Software */}
                  <Box>
                    <SectionTitle>Software</SectionTitle>
                    {availableSoftware.length === 0 ? (
                      <Text fontSize="sm" color={textSecondary}>
                        No catalog software{" "}
                        {form.department ? "for this department" : ""} yet.
                      </Text>
                    ) : (
                      <VStack gap={2} align="stretch">
                        <Text fontSize="xs" color={textSecondary} mb={1}>
                          Pick the apps this hire needs. Items marked{" "}
                          <Text as="span" color="orange.500" fontWeight="medium">
                            Approval
                          </Text>{" "}
                          notify the approver when submitted.
                        </Text>
                        {availableSoftware.map((sw) => {
                          const checked = softwareIds.includes(sw.id);
                          return (
                            <HStack
                              key={sw.id}
                              p={3}
                              bg={inputBg}
                              borderRadius="lg"
                              border="1px solid"
                              borderColor={checked ? "brand.400" : borderColor}
                              cursor="pointer"
                              onClick={() => toggleSoftware(sw.id)}
                              _hover={{ borderColor: "brand.400" }}
                              transition="all 0.15s"
                              w="full"
                            >
                              <Box
                                w={5}
                                h={5}
                                borderRadius="md"
                                border="2px solid"
                                borderColor={checked ? "brand.500" : borderColor}
                                bg={checked ? "brand.500" : "transparent"}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                transition="all 0.15s"
                                flexShrink={0}
                              >
                                {checked && (
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="white"
                                  >
                                    <path
                                      d="M10 3L4.5 8.5L2 6"
                                      stroke="white"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      fill="none"
                                    />
                                  </svg>
                                )}
                              </Box>
                              <Box color={iconColor} flexShrink={0}>
                                <LuPackage size={16} />
                              </Box>
                              <Text
                                flex={1}
                                fontSize="sm"
                                fontWeight="medium"
                                color={textPrimary}
                              >
                                {sw.name}
                              </Text>
                              {sw.requires_approval && (
                                <HStack
                                  gap={1}
                                  px={2}
                                  py={0.5}
                                  borderRadius="md"
                                  bg="orange.500/10"
                                  color="orange.600"
                                  flexShrink={0}
                                >
                                  <LuTriangleAlert size={12} />
                                  <Text fontSize="xs" fontWeight="medium">
                                    Approval
                                  </Text>
                                </HStack>
                              )}
                            </HStack>
                          );
                        })}
                      </VStack>
                    )}
                  </Box>
                </VStack>
              )}
            </Box>

            {/* Footer */}
            <Box
              p={4}
              borderTop="1px solid"
              borderColor={borderColor}
              bg={footerBg}
            >
              <HStack gap={3}>
                <Box
                  as="button"
                  flex={1}
                  py={2.5}
                  px={4}
                  borderRadius="lg"
                  fontWeight="medium"
                  border="1px solid"
                  borderColor={borderColor}
                  color={textPrimary}
                  bg="transparent"
                  onClick={onClose}
                  _hover={{ bg: hoverBg }}
                >
                  Cancel
                </Box>
                <Box
                  as="button"
                  flex={1}
                  py={2.5}
                  px={4}
                  borderRadius="lg"
                  fontWeight="medium"
                  bg="brand.500"
                  color="white"
                  onClick={isSaving ? undefined : handleSubmit}
                  aria-disabled={isSaving}
                  opacity={isSaving ? 0.7 : 1}
                  cursor={isSaving ? "not-allowed" : "pointer"}
                  _hover={{ bg: isSaving ? "brand.500" : "brand.600" }}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={2}
                >
                  {isSaving ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <LuSave size={16} />
                      Submit Intake
                    </>
                  )}
                </Box>
              </HStack>
            </Box>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>

    <Dialog.Root
      open={!!previewAsset}
      onOpenChange={(d) => {
        if (!d.open) setPreviewAsset(null);
      }}
      size="xl"
      placement="center"
      motionPreset="scale"
    >
      <Portal>
        <Dialog.Backdrop bg={previewBackdrop} />
        <Dialog.Positioner padding={4}>
          <Dialog.Content
            maxW="720px"
            w="full"
            mx={4}
            borderRadius="2xl"
            overflow="hidden"
            bg={drawerBg}
          >
            <Dialog.Header px={5} pt={5} pb={2}>
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                {previewAsset?.name ?? "Device preview"}
              </Dialog.Title>
              <Dialog.CloseTrigger
                position="absolute"
                top={3}
                right={3}
                asChild
              >
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={5} pb={5} pt={2}>
              {previewAsset?.image_url && (
                <Box
                  borderRadius="xl"
                  overflow="hidden"
                  bg={imageBg}
                  border="1px solid"
                  borderColor={borderColor}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewAsset.image_url}
                    alt={previewAsset.name}
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </Box>
              )}
              <VStack align="start" gap={1} mt={4}>
                <HStack gap={2} flexWrap="wrap">
                  {previewAsset?.type_label && (
                    <Badge size="sm" variant="subtle" colorPalette="gray">
                      {previewAsset.type_label}
                    </Badge>
                  )}
                  {previewAsset?.status_label && (
                    <Badge size="sm" variant="subtle" colorPalette="green">
                      {previewAsset.status_label}
                    </Badge>
                  )}
                </HStack>
                <Text fontSize="sm" color={textSecondary}>
                  {[
                    previewAsset?.asset_tag,
                    previewAsset?.serial_number
                      ? `S/N ${previewAsset.serial_number}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                {previewAsset && (
                  <Box
                    as="button"
                    mt={3}
                    px={4}
                    py={2}
                    borderRadius="lg"
                    bg="brand.500"
                    color="white"
                    fontWeight="medium"
                    fontSize="sm"
                    onClick={() => {
                      selectAsset(String(previewAsset.id));
                      setPreviewAsset(null);
                    }}
                    _hover={{ bg: "brand.600" }}
                  >
                    {form.requested_asset_id === String(previewAsset.id)
                      ? "Selected"
                      : "Select this device"}
                  </Box>
                )}
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
    </>
  );
}
