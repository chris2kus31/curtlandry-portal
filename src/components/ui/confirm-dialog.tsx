"use client";

import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Text,
} from "@chakra-ui/react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  /** Destructive styling for delete/remove actions. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Chakra-controlled confirm dialog (replaces window.confirm).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirming = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onCancel();
      }}
      size="sm"
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner padding={4}>
          <Dialog.Content borderRadius="xl" maxW="420px" w="full">
            <Dialog.Header px={6} pt={6} pb={2}>
              <Dialog.Title fontSize="lg" fontWeight={700}>
                {title}
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
            {description ? (
              <Dialog.Body px={6} py={3}>
                <Text fontSize="sm" color="fg.muted">
                  {description}
                </Text>
              </Dialog.Body>
            ) : null}
            <Dialog.Footer px={6} pb={6} pt={2} gap={3}>
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={confirming}
                px={4}
              >
                {cancelLabel}
              </Button>
              <Button
                colorPalette={destructive ? "red" : "brand"}
                onClick={onConfirm}
                loading={confirming}
                px={4}
              >
                {confirmLabel}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
