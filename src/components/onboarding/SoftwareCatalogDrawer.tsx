"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { LuX, LuPackage, LuBuilding, LuSave, LuShieldCheck } from "react-icons/lu";
import { softwareService } from "@/lib/api";
import type { SoftwareCatalogItem } from "@/lib/api";

interface SoftwareCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Item being edited, or null to create a new one. */
  item: SoftwareCatalogItem | null;
  /** { value: label } map of departments for the scoping select. */
  departments: Record<string, string>;
}

interface FormState {
  name: string;
  department: string;
  requires_approval: boolean;
  is_active: boolean;
  notes: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  department: "",
  requires_approval: false,
  is_active: true,
  notes: "",
};

export function SoftwareCatalogDrawer({
  isOpen,
  onClose,
  onSaved,
  item,
  departments,
}: SoftwareCatalogDrawerProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const drawerBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const labelColor = useColorModeValue("gray.600", "gray.400");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const hoverBg = useColorModeValue("gray.100", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const footerBg = useColorModeValue("gray.50", "gray.800");
  const errorColor = useColorModeValue("red.500", "red.400");

  useEffect(() => {
    if (isOpen) {
      setForm(
        item
          ? {
              name: item.name ?? "",
              department: item.department ?? "",
              requires_approval: !!item.requires_approval,
              is_active: !!item.is_active,
              notes: item.notes ?? "",
            }
          : INITIAL_FORM,
      );
      setErrors({});
    }
  }, [isOpen, item]);

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

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        department: form.department || null,
        requires_approval: form.requires_approval,
        is_active: form.is_active,
        notes: form.notes.trim() || null,
      };

      if (item) {
        await softwareService.update(item.id, payload);
        toaster.create({ title: "Software updated", type: "success" });
      } else {
        await softwareService.create(payload);
        toaster.create({ title: "Software added", type: "success" });
      }

      onSaved();
      onClose();
    } catch (error) {
      toaster.create({
        title: item ? "Failed to update" : "Failed to add",
        description: error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      placement="end"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg={drawerBg} maxW="440px" w="full">
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
                    <LuPackage size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color={textPrimary}>
                      {item ? "Edit Software" : "Add Software"}
                    </Text>
                    <Text fontSize="sm" color={textSecondary}>
                      Manage the intake software catalog
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
              <VStack gap={4} align="stretch">
                <Box w="full">
                  <FieldLabel required>Name</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="e.g., Adobe Creative Cloud"
                    borderColor={errors.name ? "red.500" : borderColor}
                    {...inputProps}
                  />
                  {errors.name && (
                    <Text fontSize="xs" color={errorColor} mt={1}>
                      {errors.name}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <FieldLabel icon={<LuBuilding size={14} color={iconColor} />}>
                    Department
                  </FieldLabel>
                  <Box
                    position="relative"
                    bg={inputBg}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={borderColor}
                    _focusWithin={{ borderColor: "brand.500" }}
                  >
                    <select
                      value={form.department}
                      onChange={(e) => setField("department", e.target.value)}
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
                      <option value="">All departments</option>
                      {Object.entries(departments).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Box
                      position="absolute"
                      right={3}
                      top="50%"
                      transform="translateY(-50%)"
                      pointerEvents="none"
                      color={textSecondary}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="currentColor"
                      >
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
                  <Text fontSize="xs" color={labelColor} mt={1}>
                    Leave as “All departments” to offer it to every new hire.
                  </Text>
                </Box>

                <Check
                  checked={form.requires_approval}
                  onToggle={() =>
                    setField("requires_approval", !form.requires_approval)
                  }
                  title="Requires approval"
                  subtitle="Selecting this at intake notifies the configured approver(s)."
                />

                <Check
                  checked={form.is_active}
                  onToggle={() => setField("is_active", !form.is_active)}
                  title="Active"
                  subtitle="Inactive items are hidden from the intake form."
                />

                <Box w="full">
                  <FieldLabel>Notes</FieldLabel>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Internal notes — license details, install steps, etc."
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
              </VStack>
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
                      {item ? <LuSave size={16} /> : <LuShieldCheck size={16} />}
                      {item ? "Save Changes" : "Add Software"}
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
