"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Input,
  Portal,
  Stack,
  Text,
  Textarea,
  VStack,
  chakra,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminApplicationDetail,
} from "@/lib/api/admin-applications-service";

interface Props {
  application: AdminApplicationDetail | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (next: AdminApplicationDetail) => void;
}

type WindowState = "full" | "partial" | "closed" | "unknown";

interface RefundPreview {
  windowState: WindowState;
  /** Default refund amount in cents (policy-computed). */
  defaultCents: number;
  /** Max amount that could still be refunded (paid - already_refunded). */
  availableCents: number;
  /** Human label for the default ("full refund", "50% partial refund"). */
  defaultLabel: string;
}

/**
 * Refund dialog. Renders a policy-driven default + lets admins override
 * amount, bypass closed windows, and attach a reason that gets persisted
 * to Stripe refund metadata as admin_reason.
 *
 * Policy preview is computed client-side from the application detail so
 * admins see the math before clicking. The same math is enforced
 * authoritatively on the server (see IssueEventRefundAction.php).
 */
export function RefundModal({ application, open, onClose, onUpdated }: Props) {
  // All hooks must be called unconditionally at the top of the component —
  // rules-of-hooks. Even color-mode values that are only used after an
  // early return go up here.
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const panelBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const [amountInput, setAmountInput] = useState<string>("");
  const [overridePolicy, setOverridePolicy] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever the dialog opens for a fresh application.
  useEffect(() => {
    if (open) {
      setAmountInput("");
      setOverridePolicy(false);
      setReason("");
    }
  }, [open, application?.id]);

  const preview: RefundPreview | null = useMemo(() => {
    if (!application?.event || !application.payment.amount_paid_cents) {
      return null;
    }
    return computeRefundPreview(application);
  }, [application]);

  if (!application) return null;

  const currency = application.payment.paid_currency ?? application.event?.currency ?? "USD";

  // The actual amount that will be sent to the API:
  //   - If user typed an override, parse it
  //   - Otherwise, use the default (which is policy-driven, or full-available
  //     when override_policy_window is checked)
  const overrideCents = parseDollarsToCents(amountInput);
  const effectiveDefault = preview
    ? overridePolicy
      ? preview.availableCents
      : preview.defaultCents
    : 0;
  const amountToSendCents = overrideCents ?? effectiveDefault;

  const canSubmit =
    !submitting &&
    amountToSendCents > 0 &&
    (overrideCents === undefined || overrideCents <= (preview?.availableCents ?? 0));

  const handleSubmit = async () => {
    if (!preview) return;

    setSubmitting(true);
    try {
      const result = await adminApplicationsService.issueRefund(application.id, {
        amount_cents: overrideCents,
        override_policy_window: overridePolicy || undefined,
        reason: reason.trim() || undefined,
      });

      const next = await adminApplicationsService.getApplication(application.id);
      onUpdated(next);
      onClose();

      toaster.success({
        title: result.is_full_refund
          ? "Full refund issued."
          : `Refund of ${formatCurrency(result.amount_cents, currency)} issued.`,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not issue refund.";
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
                Issue refund
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={3} right={3} asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body px={6} py={4}>
              <VStack align="stretch" gap={4}>
                {/* Policy preview panel */}
                <Box bg={panelBg} p={4} borderRadius="md">
                  <Stack gap={2}>
                    <PreviewLine
                      label="Paid"
                      value={formatCurrency(
                        application.payment.amount_paid_cents ?? 0,
                        currency,
                      )}
                    />
                    {Boolean(application.payment.amount_refunded_cents) && (
                      <PreviewLine
                        label="Already refunded"
                        value={formatCurrency(
                          application.payment.amount_refunded_cents ?? 0,
                          currency,
                        )}
                      />
                    )}
                    {preview && (
                      <>
                        <PreviewLine
                          label="Available to refund"
                          value={formatCurrency(preview.availableCents, currency)}
                        />
                        <PreviewLine
                          label="Policy default"
                          value={preview.defaultLabel}
                          subtle={preview.windowState === "closed"}
                        />
                      </>
                    )}
                  </Stack>
                </Box>

                {preview?.windowState === "closed" && !overridePolicy && (
                  <Text fontSize="sm" color="orange.500">
                    The refund window has closed. Check the override below to issue a refund
                    anyway — it will be recorded in the activity log.
                  </Text>
                )}

                {/* Amount override */}
                <Box>
                  <Text fontSize="xs" color={subduedText} mb={1} textTransform="uppercase">
                    Amount (optional)
                  </Text>
                  <Input
                    placeholder={
                      preview
                        ? `Default: ${formatCurrency(effectiveDefault, currency)}`
                        : "Enter amount"
                    }
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    inputMode="decimal"
                    px={4}
                  />
                  <Text fontSize="xs" color={subduedText} mt={1}>
                    Leave blank to use the policy default. Enter a number in {currency} (e.g.
                    50 for ${50}).
                  </Text>
                </Box>

                {/* Bypass policy */}
                <chakra.label
                  display="flex"
                  alignItems="flex-start"
                  gap={2}
                  fontSize="sm"
                  cursor="pointer"
                >
                  <input
                    type="checkbox"
                    checked={overridePolicy}
                    onChange={(e) => setOverridePolicy(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <Box>
                    <Text fontWeight={500}>Override refund-window policy</Text>
                    <Text fontSize="xs" color={subduedText}>
                      Bypass the event&apos;s refund_full_until / refund_partial_until dates. Use
                      when leadership has approved an exception.
                    </Text>
                  </Box>
                </chakra.label>

                {/* Reason */}
                <Box>
                  <Text fontSize="xs" color={subduedText} mb={1} textTransform="uppercase">
                    Reason (recorded in Stripe + activity log)
                  </Text>
                  <Textarea
                    placeholder="Why are you issuing this refund?"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={1000}
                    px={4}
                  />
                </Box>

                {/* Effective summary */}
                <Box
                  borderTop="1px solid"
                  borderColor={borderColor}
                  pt={3}
                >
                  <PreviewLine
                    label="Will refund"
                    value={formatCurrency(amountToSendCents, currency)}
                    emphasize
                  />
                </Box>
              </VStack>
            </Dialog.Body>

            <Dialog.Footer px={6} pb={6} pt={2} gap={3}>
              <Button variant="ghost" onClick={onClose} px={4}>
                Cancel
              </Button>
              <Button
                colorPalette="red"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={submitting}
                px={4}
              >
                Issue refund
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function PreviewLine({
  label,
  value,
  emphasize,
  subtle,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  subtle?: boolean;
}) {
  return (
    <HStack justify="space-between">
      <Text
        fontSize={emphasize ? "sm" : "xs"}
        color={subtle ? "orange.500" : undefined}
        textTransform="uppercase"
        letterSpacing="wide"
        fontWeight={500}
      >
        {label}
      </Text>
      <Text
        fontSize={emphasize ? "md" : "sm"}
        fontWeight={emphasize ? 700 : 500}
        color={subtle ? "orange.500" : undefined}
      >
        {value}
      </Text>
    </HStack>
  );
}

function computeRefundPreview(application: AdminApplicationDetail): RefundPreview {
  const paid = application.payment.amount_paid_cents ?? 0;
  const already = application.payment.amount_refunded_cents ?? 0;
  const available = Math.max(0, paid - already);

  const event = application.event;
  if (!event) {
    return {
      windowState: "unknown",
      defaultCents: 0,
      availableCents: available,
      defaultLabel: "—",
    };
  }

  const today = startOfTodayLocal();
  const fullUntil = parseDateLocal(event.refund_full_until);
  const partialUntil = parseDateLocal(event.refund_partial_until);

  if (fullUntil && today <= fullUntil) {
    return {
      windowState: "full",
      defaultCents: available,
      availableCents: available,
      defaultLabel: `Full refund · ${formatCurrency(available, event.currency)}`,
    };
  }

  if (partialUntil && today <= partialUntil) {
    const pct = event.refund_partial_pct ?? 0;
    const partialMax = Math.round(paid * (pct / 100));
    const partial = Math.max(0, partialMax - already);
    return {
      windowState: "partial",
      defaultCents: partial,
      availableCents: available,
      defaultLabel:
        partial > 0
          ? `Partial refund (${pct}%) · ${formatCurrency(partial, event.currency)}`
          : "No partial available",
    };
  }

  return {
    windowState: "closed",
    defaultCents: 0,
    availableCents: available,
    defaultLabel: "Refund window closed",
  };
}

function formatCurrency(cents: number, currency: string): string {
  const dollars = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(dollars);
  } catch {
    return `${dollars.toFixed(2)} ${currency}`;
  }
}

function parseDollarsToCents(value: string): number | undefined {
  const trimmed = value.trim().replace(/[,$\s]/g, "");
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return Math.round(num * 100);
}

function startOfTodayLocal(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function parseDateLocal(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  // The API serializes dates as YYYY-MM-DD — parse as local midnight so
  // we compare apples to apples with startOfTodayLocal().
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => Number(p));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}
