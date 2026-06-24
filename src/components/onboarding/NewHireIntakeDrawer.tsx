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
} from "react-icons/lu";
import { onboardingService } from "@/lib/api";
import type {
  OnboardingFormOptions,
  IntakePayload,
  OnboardingCase,
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
      setErrors({});
    }
  }, [isOpen]);

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

  return (
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
                        onToggle={() =>
                          setField("device_needed", !form.device_needed)
                        }
                        title="This hire needs a device"
                        subtitle="Laptop, desktop, or other equipment"
                      />
                      {form.device_needed && (
                        <>
                          <Box w="full">
                            <FieldLabel
                              icon={<LuLaptop size={14} color={iconColor} />}
                            >
                              Assign Existing Device
                            </FieldLabel>
                            <StyledSelect
                              value={form.requested_asset_id}
                              onChange={(v) =>
                                setField("requested_asset_id", v)
                              }
                            >
                              <option value="">
                                {assignableAssets.length === 0
                                  ? "No available devices in inventory"
                                  : "Select an available device"}
                              </option>
                              {assignableAssets.map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                  {asset.name}
                                  {asset.asset_tag
                                    ? ` (${asset.asset_tag})`
                                    : ""}
                                </option>
                              ))}
                            </StyledSelect>
                          </Box>
                          <Check
                            checked={form.purchase_needed}
                            onToggle={() =>
                              setField(
                                "purchase_needed",
                                !form.purchase_needed,
                              )
                            }
                            title="A new device needs to be purchased"
                            subtitle="IT will be flagged to procure one"
                          />
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
                              placeholder="Any specifics — e.g. needs a MacBook Pro for video editing"
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
                        </>
                      )}
                    </VStack>
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
  );
}
