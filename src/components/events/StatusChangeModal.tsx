"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Input,
  Portal,
  Text,
  Textarea,
  VStack,
  chakra,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  STATUS_LABELS,
  type AdminApplicationDetail,
  type ApplicationStatus,
  type AllowedTransition,
} from "@/lib/api/admin-applications-service";
import { StatusBadge } from "./StatusBadge";

interface Props {
  application: AdminApplicationDetail | null;
  open: boolean;
  initialTo?: ApplicationStatus;
  onClose: () => void;
  onChanged: (next: AdminApplicationDetail) => void;
}

/**
 * Centralized status-transition dialog. Renders the legal next states from
 * the API (`allowed_transitions`) instead of duplicating the state-machine
 * matrix in the frontend.
 */
export function StatusChangeModal({
  application,
  open,
  initialTo,
  onClose,
  onChanged,
}: Props) {
  const subduedText = useColorModeValue("gray.600", "gray.400");

  const [to, setTo] = useState<ApplicationStatus | "">("");
  const [note, setNote] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(initialTo ?? "");
      setNote("");
      setPaymentUrl("");
      setSendEmail(true);
    }
  }, [open, initialTo]);

  if (!application) return null;

  const transitions: AllowedTransition[] = application.allowed_transitions ?? [];
  // Only the `accepted` transition makes payment URL relevant.
  const showPaymentUrl = to === "accepted";

  const handleSubmit = async () => {
    if (!to) return;
    setSubmitting(true);
    try {
      const next = await adminApplicationsService.changeStatus(application.id, {
        to,
        note: note.trim() || undefined,
        payment_url: paymentUrl.trim() || undefined,
        send_email: sendEmail,
      });
      onChanged(next);
      onClose();
      toaster.success({ title: `Status updated to ${STATUS_LABELS[to]}.` });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update status.";
      toaster.error({ title: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(d) => !d.open && onClose()}
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
                Change application status
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={3} right={3} asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={6} py={4}>
              <VStack align="stretch" gap={4}>
                <Box>
                  <Text fontSize="xs" color={subduedText} mb={1} textTransform="uppercase">
                    Current status
                  </Text>
                  <StatusBadge status={application.status} />
                </Box>

                <Box>
                  <Text fontSize="xs" color={subduedText} mb={2} textTransform="uppercase">
                    Move to
                  </Text>
                  <HStack wrap="wrap" gap={2}>
                    {transitions.map((t) => (
                      <Button
                        key={t.value}
                        size="sm"
                        px={4}
                        variant={to === t.value ? "solid" : "outline"}
                        colorPalette={to === t.value ? "brand" : "gray"}
                        onClick={() => setTo(t.value)}
                      >
                        {t.label}
                      </Button>
                    ))}
                    {transitions.length === 0 && (
                      <Text fontSize="sm" color={subduedText}>
                        No further transitions are possible from this status.
                      </Text>
                    )}
                  </HStack>
                </Box>

                {showPaymentUrl && (
                  <Box>
                    <Text fontSize="xs" color={subduedText} mb={1} textTransform="uppercase">
                      Payment link (manual override — optional)
                    </Text>
                    <Input
                      placeholder="https://buy.stripe.com/..."
                      value={paymentUrl}
                      onChange={(e) => setPaymentUrl(e.target.value)}
                      px={4}
                    />
                    <Text fontSize="xs" color={subduedText} mt={1.5}>
                      Leave blank for the standard flow. After acceptance, use the{" "}
                      <Text as="span" fontWeight={600}>
                        Send payment link
                      </Text>{" "}
                      button on the application detail page — it creates a Stripe
                      Checkout Session automatically. Only paste here if you need
                      to override with a custom URL (e.g. wire-transfer link).
                    </Text>
                  </Box>
                )}

                <Box>
                  <Text fontSize="xs" color={subduedText} mb={1} textTransform="uppercase">
                    Note to applicant (optional)
                  </Text>
                  <Textarea
                    placeholder="A personal line they'll see in the email."
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={2000}
                    px={4}
                  />
                </Box>

                <chakra.label display="flex" alignItems="center" gap={2} fontSize="sm">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                  />
                  Send the applicant an email about this change
                </chakra.label>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer px={6} pb={6} pt={2} gap={3}>
              <Button variant="ghost" onClick={onClose} px={4}>
                Cancel
              </Button>
              <Button
                colorPalette="brand"
                onClick={handleSubmit}
                disabled={!to}
                loading={submitting}
                px={4}
              >
                Update status
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
