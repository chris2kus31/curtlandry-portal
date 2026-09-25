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
import { LuX, LuLaptop, LuSave, LuPlus } from "react-icons/lu";
import { assetService } from "@/lib/api";
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

  const drawerBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
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
      const message =
        error instanceof Error ? error.message : "Please try again";
      if (message.toLowerCase().includes("tag")) {
        setErrors({ asset_tag: "That asset tag is already in use" });
      } else {
        toaster.create({
          title: item ? "Failed to update" : "Failed to add",
          description: message,
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
    <Text fontSize="sm" color={textSecondary} mb={1.5}>
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
    bg: inputBg,
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
          <Drawer.Content bg={drawerBg} maxW="440px" w="full">
            <Box
              p={4}
              borderBottom="1px solid"
              borderColor={borderColor}
              bg={headerBg}
            >
              <Flex justify="space-between" align="center">
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="brand.500" color="white">
                    <LuLaptop size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color={textPrimary}>
                      {item ? "Edit Asset" : "Add Asset"}
                    </Text>
                    <Text fontSize="sm" color={textSecondary}>
                      Device inventory
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

            <Box p={5} overflowY="auto" flex={1}>
              <VStack gap={4} align="stretch">
                <Box>
                  <FieldLabel required>Name</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder='e.g., MacBook Pro 14"'
                    borderColor={errors.name ? "red.500" : borderColor}
                    {...inputProps}
                  />
                  {errors.name && (
                    <Text fontSize="xs" color={errorColor} mt={1}>
                      {errors.name}
                    </Text>
                  )}
                </Box>

                <Box>
                  <FieldLabel required>Type</FieldLabel>
                  <Box
                    position="relative"
                    bg={inputBg}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={borderColor}
                    _focusWithin={{ borderColor: "brand.500" }}
                  >
                    <select
                      value={form.type}
                      onChange={(e) => setField("type", e.target.value)}
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
                      {Object.entries(types).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Box>
                </Box>

                <HStack gap={3} align="flex-start">
                  <Box flex={1}>
                    <FieldLabel>Asset Tag</FieldLabel>
                    <Input
                      value={form.asset_tag}
                      onChange={(e) => setField("asset_tag", e.target.value)}
                      placeholder="CL-0123"
                      borderColor={errors.asset_tag ? "red.500" : borderColor}
                      {...inputProps}
                    />
                    {errors.asset_tag && (
                      <Text fontSize="xs" color={errorColor} mt={1}>
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
                      borderColor={borderColor}
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
                      borderColor={borderColor}
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
                      borderColor={errors.cost ? "red.500" : borderColor}
                      {...inputProps}
                    />
                    {errors.cost && (
                      <Text fontSize="xs" color={errorColor} mt={1}>
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
                      {item ? <LuSave size={16} /> : <LuPlus size={16} />}
                      {item ? "Save Changes" : "Add Asset"}
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
