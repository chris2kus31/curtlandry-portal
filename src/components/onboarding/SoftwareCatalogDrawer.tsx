"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  NativeSelect,
  IconButton,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { LuX, LuPackage, LuBuilding, LuSave, LuShieldCheck } from "react-icons/lu";
import { softwareService } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api/api-error";
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
        description: apiErrorMessage(error),
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


  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      placement="end"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg="bg.card" maxW="440px" w="full">
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
                    <LuPackage size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color="fg">
                      {item ? "Edit Software" : "Add Software"}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      Manage the intake software catalog
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
              <VStack gap={4} align="stretch">
                <Box w="full">
                  <FieldLabel required>Name</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="e.g., Adobe Creative Cloud"
                    borderColor={errors.name ? "red.500" : "border.primary"}
                    {...inputProps}
                  />
                  {errors.name && (
                    <Text fontSize="xs" color="error.primary" mt={1}>
                      {errors.name}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <FieldLabel icon={<LuBuilding size={14} color="fg.muted" />}>
                    Department
                  </FieldLabel>
                  <NativeSelect.Root
                    size="md"
                    bg="bg.secondary"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="border.primary"
                    _focusWithin={{ borderColor: "brand.500" }}
                  >
                    <NativeSelect.Field
                      value={form.department}
                      onChange={(e) => setField("department", e.target.value)}
                      ps={4}
                      pe={8}
                      py={2.5}
                      fontSize="sm"
                      border="none"
                      bg="transparent"
                    >
                      <option value="">All departments</option>
                      {Object.entries(departments).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator color="fg.muted" />
                  </NativeSelect.Root>
                  <Text fontSize="xs" color="fg.muted" mt={1}>
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
              </VStack>
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
                  {item ? <LuSave size={16} /> : <LuShieldCheck size={16} />}
                  {item ? "Save Changes" : "Add Software"}
                </Button>
              </HStack>
            </Box>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
