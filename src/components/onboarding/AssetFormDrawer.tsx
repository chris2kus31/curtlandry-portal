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
import { LuX, LuLaptop, LuSave, LuPlus } from "react-icons/lu";
import { assetService } from "@/lib/api";
import { apiErrorMessage, fieldErrorsFromApi } from "@/lib/api/api-error";
import type { Asset, AssetOptions } from "@/lib/api";

interface AssetFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: Asset | null;
  options: AssetOptions | null;
}

interface FormState {
  name: string;
  type: string;
  asset_tag: string;
  serial_number: string;
  purchase_date: string;
  cost: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  type: "laptop",
  asset_tag: "",
  serial_number: "",
  purchase_date: "",
  cost: "",
  notes: "",
};

export function AssetFormDrawer({
  isOpen,
  onClose,
  onSaved,
  item,
  options,
}: AssetFormDrawerProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    if (isOpen) {
      setForm(
        item
          ? {
              name: item.name ?? "",
              type: item.type ?? "laptop",
              asset_tag: item.asset_tag ?? "",
              serial_number: item.serial_number ?? "",
              purchase_date: item.purchase_date ?? "",
              cost: item.cost != null ? String(item.cost) : "",
              notes: item.notes ?? "",
            }
          : INITIAL_FORM,
      );
      setErrors({});
    }
  }, [isOpen, item]);

  const setField = (field: keyof FormState, value: string) => {
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
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.type) next.type = "Type is required";
    if (form.cost && isNaN(Number(form.cost))) next.cost = "Cost must be a number";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        asset_tag: form.asset_tag.trim() || null,
        serial_number: form.serial_number.trim() || null,
        purchase_date: form.purchase_date || null,
        cost: form.cost ? Number(form.cost) : null,
        notes: form.notes.trim() || null,
      };

      if (item) {
        await assetService.update(item.id, payload);
        toaster.create({ title: "Asset updated", type: "success" });
      } else {
        await assetService.create(payload);
        toaster.create({ title: "Asset added", type: "success" });
      }
      onSaved();
      onClose();
    } catch (error) {
      const nextErrors = fieldErrorsFromApi(error);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
      } else {
        toaster.create({
          title: item ? "Failed to update" : "Failed to add",
          description: apiErrorMessage(error),
          type: "error",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const FieldLabel = ({
    children,
    required,
  }: {
    children: ReactNode;
    required?: boolean;
  }) => (
    <Text fontSize="sm" color="fg.muted" mb={1.5}>
      {children}
      {required && (
        <Text as="span" color="red.500">
          {" "}
          *
        </Text>
      )}
    </Text>
  );

  const inputProps = {
    bg: "bg.secondary",
    border: "1px solid",
    borderRadius: "lg",
    px: 4,
    _focus: { borderColor: "brand.500" },
  } as const;

  const types = options?.types ?? {};

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
            <Box
              p={4}
              borderBottom="1px solid"
              borderColor="border.primary"
              bg="bg.secondary"
            >
              <Flex justify="space-between" align="center">
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="brand.500" color="white">
                    <LuLaptop size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color="fg">
                      {item ? "Edit Asset" : "Add Asset"}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      Device inventory
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

            <Box p={5} overflowY="auto" flex={1}>
              <VStack gap={4} align="stretch">
                <Box>
                  <FieldLabel required>Name</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder='e.g., MacBook Pro 14"'
                    borderColor={errors.name ? "red.500" : "border.primary"}
                    {...inputProps}
                  />
                  {errors.name && (
                    <Text fontSize="xs" color="error.primary" mt={1}>
                      {errors.name}
                    </Text>
                  )}
                </Box>

                <Box>
                  <FieldLabel required>Type</FieldLabel>
                  <NativeSelect.Root
                    size="md"
                    bg="bg.secondary"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="border.primary"
                    _focusWithin={{ borderColor: "brand.500" }}
                  >
                    <NativeSelect.Field
                      value={form.type}
                      onChange={(e) => setField("type", e.target.value)}
                      ps={4}
                      pe={8}
                      py={2.5}
                      fontSize="sm"
                      border="none"
                      bg="transparent"
                    >
                      {Object.entries(types).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Box>

                <HStack gap={3} align="flex-start">
                  <Box flex={1}>
                    <FieldLabel>Asset Tag</FieldLabel>
                    <Input
                      value={form.asset_tag}
                      onChange={(e) => setField("asset_tag", e.target.value)}
                      placeholder="CL-0123"
                      borderColor={errors.asset_tag ? "red.500" : "border.primary"}
                      {...inputProps}
                    />
                    {errors.asset_tag && (
                      <Text fontSize="xs" color="error.primary" mt={1}>
                        {errors.asset_tag}
                      </Text>
                    )}
                  </Box>
                  <Box flex={1}>
                    <FieldLabel>Serial #</FieldLabel>
                    <Input
                      value={form.serial_number}
                      onChange={(e) =>
                        setField("serial_number", e.target.value)
                      }
                      placeholder="C02XXXXX"
                      borderColor="border.primary"
                      {...inputProps}
                    />
                  </Box>
                </HStack>

                <HStack gap={3} align="flex-start">
                  <Box flex={1}>
                    <FieldLabel>Purchase Date</FieldLabel>
                    <Input
                      type="date"
                      value={form.purchase_date}
                      onChange={(e) =>
                        setField("purchase_date", e.target.value)
                      }
                      borderColor="border.primary"
                      {...inputProps}
                    />
                  </Box>
                  <Box flex={1}>
                    <FieldLabel>Cost (USD)</FieldLabel>
                    <Input
                      type="number"
                      value={form.cost}
                      onChange={(e) => setField("cost", e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      borderColor={errors.cost ? "red.500" : "border.primary"}
                      {...inputProps}
                    />
                    {errors.cost && (
                      <Text fontSize="xs" color="error.primary" mt={1}>
                        {errors.cost}
                      </Text>
                    )}
                  </Box>
                </HStack>

                <Box>
                  <FieldLabel>Notes</FieldLabel>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Condition, accessories, etc."
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
                  {item ? <LuSave size={16} /> : <LuPlus size={16} />}
                  {item ? "Save Changes" : "Add Asset"}
                </Button>
              </HStack>
            </Box>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
