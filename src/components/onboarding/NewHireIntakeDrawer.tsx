"use client";

import { useState, useEffect, type ReactNode } from "react";
import {
  Box,
  Button,
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
  Image,
  NativeSelect,
  IconButton,
} from "@chakra-ui/react";
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
  LuArrowLeft,
} from "react-icons/lu";
import { onboardingService } from "@/lib/api";
import { apiErrorMessage, fieldErrorsFromApi } from "@/lib/api/api-error";
import type {
  OnboardingFormOptions,
  IntakePayload,
  OnboardingCase,
  OnboardingAsset,
} from "@/lib/api";
import {
  createEmptyIntakeForm,
  type IntakeFormState,
} from "@/lib/onboarding/intake-constants";
import {
  DeviceCategoryPicker,
  categoryIcon,
} from "@/components/onboarding/intake/DeviceCategoryPicker";
import { DeviceAssetPicker } from "@/components/onboarding/intake/DeviceAssetPicker";

interface NewHireIntakeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (created: OnboardingCase) => void;
  options: OnboardingFormOptions | null;
  optionsLoading?: boolean;
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
  const [form, setForm] = useState<IntakeFormState>(() =>
    createEmptyIntakeForm(),
  );
  const [softwareIds, setSoftwareIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<OnboardingAsset | null>(
    null,
  );
  /** An asset_categories id (as a string), matched against asset.asset_category_id. */
  const [deviceCategory, setDeviceCategory] = useState<string | null>(null);

  // Colors — all hooks before any conditional return

  // Start every session from a clean form.
  useEffect(() => {
    if (!isOpen) return;
    setForm(createEmptyIntakeForm());
    setSoftwareIds([]);
    setDeviceCategory(null);
    setErrors({});
    setPreviewAsset(null);
  }, [isOpen]);

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

  const selectDeviceCategory = (category: string) => {
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

  const setField = (field: keyof IntakeFormState, value: string | boolean) => {
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

      toaster.create({
        title: "Intake submitted",
        description: `${form.first_name} ${form.last_name} has been submitted. HR & IT have been notified.`,
        type: "success",
      });

      onCreated(created);
      onClose();
    } catch (error) {
      // httpClient rejects with a plain ApiError — not an Error instance.
      const nextErrors = fieldErrorsFromApi(error);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
      } else {
        toaster.create({
          title: "Failed to submit intake",
          description: apiErrorMessage(error),
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
      <Text fontSize="sm" color="fg.muted">
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
      color="fg.muted"
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
    <NativeSelect.Root
      size="md"
      bg="bg.secondary"
      borderRadius="lg"
      border="1px solid"
      borderColor="border.primary"
      _focusWithin={{ borderColor: "brand.500" }}
    >
      <NativeSelect.Field
        value={value}
        onChange={(e) => onChange(e.target.value)}
        ps={4}
        pe={8}
        py={2.5}
        fontSize="sm"
        border="none"
        bg="transparent"
      >
        {children}
      </NativeSelect.Field>
      <NativeSelect.Indicator color="fg.muted" />
    </NativeSelect.Root>
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
      bg="bg.secondary"
      borderRadius="lg"
      border="1px solid"
      borderColor="border.primary"
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
        borderColor={checked ? "brand.500" : "border.primary"}
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
        <Text fontSize="sm" fontWeight="medium" color="fg">
          {title}
        </Text>
        {subtitle && (
          <Text fontSize="xs" color="fg.muted">
            {subtitle}
          </Text>
        )}
      </Box>
    </HStack>
  );

  const inputProps = {
    bg: "bg.secondary",
    border: "1px solid",
    borderRadius: "lg",
    px: 4,
    _focus: { borderColor: "brand.500" },
  } as const;

  const departments = options?.departments ?? {};
  const workLocations = options?.work_locations ?? {};
  const employmentTypes = options?.employment_types ?? [];
  const managers = options?.managers ?? [];
  const assignableAssets = options?.assignable_assets ?? [];
  // Which categories appear in the picker is People Ops' call (show_in_intake),
  // served alongside the rest of the intake options.
  const deviceCategories = options?.device_categories ?? [];
  const softwareCatalog = options?.software_catalog ?? [];

  const selectedCategoryMeta = deviceCategories.find(
    (c) => String(c.value) === deviceCategory,
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
          <Drawer.Content bg="bg.card" maxW="480px" w="full">
            {/* Header */}
            <Box
              p={4}
              borderBottom="1px solid"
              borderColor="border.primary"
              bg="bg.secondary"
            >
              <Flex justify="space-between" align="center">
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="brand.500" color="white">
                    <LuUserPlus size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color="fg">
                      New Hire Intake
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      Submit a new hire for HR &amp; IT setup
                    </Text>
                  </Box>
                </HStack>
                <IconButton
                  aria-label="Close"
                  variant="ghost"
                  size="sm"
                  color="fg.muted"
                  onClick={onClose}
                >
                  <LuX size={20} />
                </IconButton>
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
                  {/* Basic info */}
                  <Box>
                    <SectionTitle>Basic Information</SectionTitle>
                    <VStack gap={3}>
                      <Box w="full">
                        <FieldLabel
                          icon={<LuMail size={14} color="fg.muted" />}
                          required
                        >
                          Work Email
                        </FieldLabel>
                        <Input
                          value={form.email}
                          onChange={(e) => setField("email", e.target.value)}
                          placeholder="newhire@company.com"
                          borderColor={errors.email ? "red.500" : "border.primary"}
                          {...inputProps}
                        />
                        {errors.email && (
                          <Text fontSize="xs" color="error.primary" mt={1}>
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
                              errors.first_name ? "red.500" : "border.primary"
                            }
                            {...inputProps}
                          />
                          {errors.first_name && (
                            <Text fontSize="xs" color="error.primary" mt={1}>
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
                              errors.last_name ? "red.500" : "border.primary"
                            }
                            {...inputProps}
                          />
                          {errors.last_name && (
                            <Text fontSize="xs" color="error.primary" mt={1}>
                              {errors.last_name}
                            </Text>
                          )}
                        </Box>
                      </HStack>
                      <Box w="full">
                        <FieldLabel
                          icon={<LuBriefcase size={14} color="fg.muted" />}
                        >
                          Job Title
                        </FieldLabel>
                        <Input
                          value={form.job_title}
                          onChange={(e) =>
                            setField("job_title", e.target.value)
                          }
                          placeholder="e.g., Media Producer"
                          borderColor="border.primary"
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
                          icon={<LuBuilding size={14} color="fg.muted" />}
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
                          icon={<LuMapPin size={14} color="fg.muted" />}
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
                          icon={<LuUsers size={14} color="fg.muted" />}
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
                            icon={<LuClock size={14} color="fg.muted" />}
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
                              errors.weekly_hours ? "red.500" : "border.primary"
                            }
                            {...inputProps}
                          />
                          {errors.weekly_hours && (
                            <Text fontSize="xs" color="error.primary" mt={1}>
                              {errors.weekly_hours}
                            </Text>
                          )}
                        </Box>
                      </HStack>
                      <Box w="full">
                        <FieldLabel
                          icon={<LuCalendar size={14} color="fg.muted" />}
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
                            errors.start_date ? "red.500" : "border.primary"
                          }
                          {...inputProps}
                        />
                        {errors.start_date && (
                          <Text fontSize="xs" color="error.primary" mt={1}>
                            {errors.start_date}
                          </Text>
                        )}
                        <Text fontSize="xs" color="fg.muted" mt={1}>
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
                                    <LuLaptop size={14} color="fg.muted" />
                                  }
                                >
                                  What kind of device?
                                </FieldLabel>
                                <DeviceCategoryPicker
                                  categories={deviceCategories}
                                  assets={assignableAssets}
                                  onSelect={selectDeviceCategory}
                                />
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
                                      const Icon = selectedCategoryMeta
                                        ? categoryIcon(
                                            selectedCategoryMeta.icon_key,
                                          )
                                        : LuLaptop;
                                      return (
                                        <Icon size={14} color="fg.muted" />
                                      );
                                    })()}
                                  >
                                    {selectedCategoryMeta?.label ?? "Devices"}
                                  </FieldLabel>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={clearDeviceCategory}
                                    color="brand.500"
                                    fontWeight="medium"
                                    px={1}
                                    _hover={{ color: "brand.600", bg: "transparent" }}
                                  >
                                    <LuArrowLeft size={12} />
                                    Change type
                                  </Button>
                                </Flex>

                                {selectedCategoryMeta && (
                                  <DeviceAssetPicker
                                    category={selectedCategoryMeta}
                                    assets={assignableAssets}
                                    selectedAssetId={form.requested_asset_id}
                                    onSelect={selectAsset}
                                    onPreview={setPreviewAsset}
                                  />
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
                              bg="brand.muted"
                            >
                              <Text
                                fontSize="sm"
                                fontWeight="semibold"
                                color="fg"
                                mb={1}
                              >
                                What should IT purchase?
                              </Text>
                              <Text
                                fontSize="xs"
                                color="fg.muted"
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
                                bg="bg.secondary"
                                border="1px solid"
                                borderColor="border.primary"
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
                                bg="bg.secondary"
                                border="1px solid"
                                borderColor="border.primary"
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
                      <Text fontSize="sm" color="fg.muted">
                        No catalog software{" "}
                        {form.department ? "for this department" : ""} yet.
                      </Text>
                    ) : (
                      <VStack gap={2} align="stretch">
                        <Text fontSize="xs" color="fg.muted" mb={1}>
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
                              bg="bg.secondary"
                              borderRadius="lg"
                              border="1px solid"
                              borderColor={checked ? "brand.400" : "border.primary"}
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
                                borderColor={checked ? "brand.500" : "border.primary"}
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
                              <Box color="fg.muted" flexShrink={0}>
                                <LuPackage size={16} />
                              </Box>
                              <Text
                                flex={1}
                                fontSize="sm"
                                fontWeight="medium"
                                color="fg"
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
              borderColor="border.primary"
              bg="bg.secondary"
            >
              <HStack gap={3}>
                <Button
                  flex={1}
                  variant="outline"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  flex={1}
                  colorPalette="brand"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  loading={isSaving}
                >
                  <LuSave size={16} />
                  Submit Intake
                </Button>
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
        <Dialog.Backdrop bg="blackAlpha.700" />
        <Dialog.Positioner padding={4}>
          <Dialog.Content
            maxW="720px"
            w="full"
            mx={4}
            borderRadius="2xl"
            overflow="hidden"
            bg="bg.card"
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
                  bg="bg.tertiary"
                  border="1px solid"
                  borderColor="border.primary"
                >
                  <Image
                    src={previewAsset.image_url}
                    alt={previewAsset.name}
                    w="100%"
                    h="auto"
                    display="block"
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
                <Text fontSize="sm" color="fg.muted">
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
                  <Button
                    mt={3}
                    colorPalette="brand"
                    size="sm"
                    onClick={() => {
                      selectAsset(String(previewAsset.id));
                      setPreviewAsset(null);
                    }}
                  >
                    {form.requested_asset_id === String(previewAsset.id)
                      ? "Selected"
                      : "Select this device"}
                  </Button>
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
