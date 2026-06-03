"use client";

import { useState } from "react";
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  Text,
  VStack,
  chakra,
} from "@chakra-ui/react";
import { LuPlus } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import type { SchemaFieldType } from "@/lib/api/admin-applications-service";
import { FIELD_TYPES } from "./helpers";

interface Props {
  onAdd: (type: SchemaFieldType) => void;
}

/**
 * Small "+ Add field" CTA that opens a dialog of field types. Using a
 * dialog (rather than a chakra Menu) lets us show the hint text under
 * each type clearly, especially on mobile.
 */
export function AddFieldMenu({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const hoverBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const subduedText = useColorModeValue("gray.600", "gray.400");

  const pick = (type: SchemaFieldType) => {
    onAdd(type);
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        px={4}
        onClick={() => setOpen(true)}
      >
        <LuPlus /> Add field
      </Button>

      <Dialog.Root
        open={open}
        onOpenChange={(d) => setOpen(d.open)}
        size="md"
        placement="center"
        motionPreset="slide-in-bottom"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner padding={4}>
            <Dialog.Content maxW="560px" w="full" mx={4} borderRadius="xl">
              <Dialog.Header px={6} pt={6} pb={2}>
                <Dialog.Title fontSize="lg" fontWeight={700}>
                  Pick a field type
                </Dialog.Title>
                <Dialog.CloseTrigger position="absolute" top={3} right={3} asChild>
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body px={6} py={4}>
                <VStack align="stretch" gap={1}>
                  {FIELD_TYPES.map((t) => (
                    <chakra.button
                      key={t.value}
                      onClick={() => pick(t.value)}
                      textAlign="left"
                      borderWidth={1}
                      borderColor={borderColor}
                      borderRadius="md"
                      px={4}
                      py={3}
                      _hover={{ bg: hoverBg }}
                      transition="background 0.15s"
                    >
                      <HStack justify="space-between">
                        <Box>
                          <Text fontWeight={600}>{t.label}</Text>
                          <Text fontSize="xs" color={subduedText}>
                            {t.hint}
                          </Text>
                        </Box>
                        <Text fontSize="xs" color={subduedText}>
                          {t.value}
                        </Text>
                      </HStack>
                    </chakra.button>
                  ))}
                </VStack>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
