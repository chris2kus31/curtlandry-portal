"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Heading,
  HStack,
  Input,
  Portal,
  Text,
  Textarea,
  VStack,
  Wrap,
  chakra,
} from "@chakra-ui/react";
import { LuCirclePlus, LuHandCoins } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminApplicationDetail,
  type AdminApplicationPayment,
} from "@/lib/api/admin-applications-service";
import { apiErrorMessage, formatCurrency } from "./format";
import { PAYMENT_STATUS_COLORS } from "./PaymentHistory";
import { RefundModal } from "./RefundModal";

const BILLABLE_STATUSES = ["accepted", "paid", "confirmed"];
const COLLECTED_STATUSES = ["paid", "partially_refunded", "refunded"];
const MIN_AMOUNT_CENTS = 50;

interface Props {
  application: AdminApplicationDetail;
  onUpdated: (next: AdminApplicationDetail) => void;
}

/**
 * Extra amounts billed to the primary applicant on top of registration
 * (e.g. collecting the difference after a price correction). Each one has
 * its own Stripe payment link, status, refund and audit trail, and never
 * changes the application's status or registration payment.
 */
export function AdditionalPaymentsPanel({ application, onUpdated }: Props) {
  const surfaceBg = useColorModeValue("white", "gray.900");
  const rowBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const subduedText = useColorModeValue("gray.600", "gray.400");

  const [requestOpen, setRequestOpen] = useState(false);
  const [cancelling, setCancelling] = useState<AdminApplicationPayment | null>(null);
  const [refunding, setRefunding] = useState<AdminApplicationPayment | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const adjustments = (application.payments ?? []).filter((p) => p.is_adjustment);
  const hasProduct = Boolean(application.event?.stripe_product_id);
  const canRequest = BILLABLE_STATUSES.includes(application.status) && hasProduct;

  if (!canRequest && adjustments.length === 0) {
    return null;
  }

  const currency = application.event?.currency ?? "USD";
  const registrationNet =
    (application.payment.amount_paid_cents ?? 0) - (application.payment.amount_refunded_cents ?? 0);
  const additionalNet = adjustments
    .filter((p) => COLLECTED_STATUSES.includes(p.status))
    .reduce((sum, p) => sum + (p.amount_paid_cents ?? 0) - (p.amount_refunded_cents ?? 0), 0);

  const refresh = async () => onUpdated(await adminApplicationsService.getApplication(application.id));

  const handleResend = async (payment: AdminApplicationPayment) => {
    setResendingId(payment.id);
    try {
      const { session_url } = await adminApplicationsService.resendAdjustment(application.id, payment.id);
      const copied = await copyToClipboard(session_url);
      toaster.success({
        title: `New payment link emailed to ${application.email ?? "the applicant"}.`,
        description: copied ? "The previous link no longer works. New link copied to your clipboard." : "The previous link no longer works.",
      });
      await refresh();
    } catch (err: unknown) {
      toaster.error({ title: apiErrorMessage(err, "Could not re-send the payment link.") });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <Box bg={surfaceBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={4}>
      <Flex align="center" mb={3} gap={2} wrap="wrap">
        <HStack>
          <LuHandCoins />
          <Heading size="sm">Additional payments</Heading>
        </HStack>
        <Box flex={1} />
        {canRequest && (
          <Button size="xs" px={3} variant="outline" onClick={() => setRequestOpen(true)}>
            <LuCirclePlus /> Request payment
          </Button>
        )}
      </Flex>

      {additionalNet > 0 && (
        <VStack align="stretch" gap={1} mb={3}>
          <SummaryLine label="Registration" value={formatCurrency(registrationNet, currency)} />
          <SummaryLine label="Additional" value={formatCurrency(additionalNet, currency)} />
          <SummaryLine
            label="Total collected"
            value={formatCurrency(registrationNet + additionalNet, currency)}
            emphasize
          />
        </VStack>
      )}

      {adjustments.length === 0 ? (
        <Text fontSize="sm" color={subduedText}>
          Bill the applicant an extra amount (e.g. a price correction). They get their own payment
          link; their registration isn&apos;t affected.
        </Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {adjustments.map((p) => {
            const unpaid = p.status === "pending" || p.status === "expired";
            const refundable =
              (p.status === "paid" || p.status === "partially_refunded") &&
              (p.amount_paid_cents ?? 0) - (p.amount_refunded_cents ?? 0) > 0;
            const inactive = p.status === "cancelled" || p.status === "refunded";

            return (
              <Box
                key={p.id}
                bg={rowBg}
                borderWidth={1}
                borderColor={borderColor}
                borderRadius="md"
                p={3}
                opacity={inactive ? 0.7 : 1}
              >
                <HStack justify="space-between" align="flex-start" gap={2}>
                  <Text fontSize="sm" fontWeight={600}>
                    {formatCurrency(p.amount_total_cents, p.currency)}
                  </Text>
                  <Badge
                    colorPalette={PAYMENT_STATUS_COLORS[p.status]}
                    variant="subtle"
                    px={2}
                    textTransform="uppercase"
                  >
                    {p.status_label}
                  </Badge>
                </HStack>
                {p.reason && (
                  <Text fontSize="xs" mt={1} whiteSpace="pre-wrap">
                    {p.reason}
                  </Text>
                )}
                {p.note && (
                  <Text fontSize="xs" color={subduedText} mt={1} whiteSpace="pre-wrap">
                    Note to applicant: {p.note}
                  </Text>
                )}
                <Text fontSize="xs" color={subduedText} mt={1}>
                  {p.created_by?.name ? `Requested by ${p.created_by.name}` : "Requested"}
                  {p.created_at ? ` · ${new Date(p.created_at).toLocaleDateString()}` : ""}
                  {p.link_sent_count > 1 ? ` · link sent ${p.link_sent_count}×` : ""}
                  {p.paid_at ? ` · paid ${new Date(p.paid_at).toLocaleDateString()}` : ""}
                  {(p.amount_refunded_cents ?? 0) > 0
                    ? ` · refunded ${formatCurrency(p.amount_refunded_cents ?? 0, p.currency)}`
                    : ""}
                </Text>

                {(unpaid || refundable) && (
                  <Wrap mt={2} gap={2}>
                    {unpaid && (
                      <Button
                        size="xs"
                        px={3}
                        colorPalette="brand"
                        onClick={() => handleResend(p)}
                        loading={resendingId === p.id}
                        disabled={!canRequest}
                        title={canRequest ? undefined : "The applicant can't be billed in their current status."}
                      >
                        Re-send link
                      </Button>
                    )}
                    {p.status === "pending" && p.checkout_url && (
                      <Button
                        size="xs"
                        px={3}
                        variant="outline"
                        onClick={async () => {
                          const copied = await copyToClipboard(p.checkout_url ?? "");
                          toaster.create({
                            type: copied ? "success" : "error",
                            title: copied ? "Payment link copied." : "Could not copy the link.",
                          });
                        }}
                      >
                        Copy link
                      </Button>
                    )}
                    {refundable && (
                      <Button size="xs" px={3} variant="outline" colorPalette="red" onClick={() => setRefunding(p)}>
                        Refund
                      </Button>
                    )}
                    {unpaid && (
                      <Button size="xs" px={3} variant="ghost" colorPalette="red" onClick={() => setCancelling(p)}>
                        Cancel
                      </Button>
                    )}
                  </Wrap>
                )}
              </Box>
            );
          })}
        </VStack>
      )}

      <RequestPaymentDialog
        application={application}
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onUpdated={onUpdated}
      />
      <CancelAdjustmentDialog
        application={application}
        payment={cancelling}
        onClose={() => setCancelling(null)}
        onUpdated={onUpdated}
      />
      <RefundModal
        application={application}
        adjustment={refunding}
        open={refunding !== null}
        onClose={() => setRefunding(null)}
        onUpdated={onUpdated}
      />
    </Box>
  );
}

/* -------------------------------------------------------------------------- */

function RequestPaymentDialog({
  application,
  open,
  onClose,
  onUpdated,
}: {
  application: AdminApplicationDetail;
  open: boolean;
  onClose: () => void;
  onUpdated: (next: AdminApplicationDetail) => void;
}) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const currency = application.event?.currency ?? "USD";

  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmountInput("");
    setReason("");
    setNote("");
  }, [open]);

  const amountCents = parseDollarsToCents(amountInput);
  const amountValid = amountCents !== undefined && amountCents >= MIN_AMOUNT_CENTS;
  const canSubmit = !submitting && amountValid && reason.trim() !== "";

  const handleSubmit = async () => {
    if (!amountValid || amountCents === undefined) return;
    setSubmitting(true);
    try {
      const { session_url } = await adminApplicationsService.requestAdjustment(application.id, {
        amount_cents: amountCents,
        reason: reason.trim(),
        note: note.trim() || null,
      });
      const copied = await copyToClipboard(session_url);
      toaster.success({
        title: `Payment link for ${formatCurrency(amountCents, currency)} emailed to ${application.email ?? "the applicant"}.`,
        description: copied ? "Link also copied to your clipboard." : undefined,
      });
      onUpdated(await adminApplicationsService.getApplication(application.id));
      onClose();
    } catch (err: unknown) {
      toaster.error({ title: apiErrorMessage(err, "Could not request the payment.") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(d) => !d.open && onClose()} size="md" placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner padding={4}>
          <Dialog.Content maxW="520px" w="full" mx={4} borderRadius="xl">
            <Dialog.Header px={6} pt={6} pb={2}>
              <Dialog.Title fontSize="lg" fontWeight={700}>
                Request additional payment
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={3} right={3} asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={6} py={4}>
              <VStack align="stretch" gap={4}>
                <Text fontSize="sm" color={subduedText}>
                  Emails {application.email ?? "the applicant"} a secure payment link for this
                  amount. Their registration and existing payment stay as they are.
                </Text>

                <Box>
                  <FieldLabel>Amount ({currency}) *</FieldLabel>
                  <Input
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g. 1200"
                    px={4}
                  />
                  {amountInput.trim() !== "" && !amountValid && (
                    <Text fontSize="xs" color="red.500" mt={1}>
                      Enter an amount of at least {formatCurrency(MIN_AMOUNT_CENTS, currency)}.
                    </Text>
                  )}
                </Box>

                <Box>
                  <FieldLabel>Reason * (internal — shown in the portal and activity log)</FieldLabel>
                  <Textarea
                    placeholder="e.g. Event price corrected from $1,200 to $1,800 per person × 2, per Tucker"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={1000}
                    px={4}
                  />
                </Box>

                <Box>
                  <FieldLabel>Note to applicant (optional — included in the email)</FieldLabel>
                  <Textarea
                    placeholder="e.g. This covers the corrected registration rate. Thank you for your patience!"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={1000}
                    px={4}
                  />
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer px={6} pb={6} pt={2} gap={3}>
              <Button variant="ghost" onClick={onClose} px={4}>
                Cancel
              </Button>
              <Button colorPalette="brand" onClick={handleSubmit} disabled={!canSubmit} loading={submitting} px={4}>
                {amountValid && amountCents !== undefined
                  ? `Send ${formatCurrency(amountCents, currency)} payment link`
                  : "Send payment link"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function CancelAdjustmentDialog({
  application,
  payment,
  onClose,
  onUpdated,
}: {
  application: AdminApplicationDetail;
  payment: AdminApplicationPayment | null;
  onClose: () => void;
  onUpdated: (next: AdminApplicationDetail) => void;
}) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setNote("");
    setNotify(false);
    onClose();
  };

  const handleConfirm = async () => {
    if (!payment) return;
    setSubmitting(true);
    try {
      await adminApplicationsService.cancelAdjustment(application.id, payment.id, {
        notify,
        note: note.trim() || undefined,
      });
      toaster.success({ title: "Additional payment cancelled." });
      onUpdated(await adminApplicationsService.getApplication(application.id));
      handleClose();
    } catch (err: unknown) {
      toaster.error({ title: apiErrorMessage(err, "Could not cancel the payment.") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={payment !== null} onOpenChange={(d) => !d.open && handleClose()} size="sm" placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner padding={4}>
          <Dialog.Content maxW="480px" w="full" mx={4} borderRadius="xl">
            <Dialog.Header px={6} pt={6} pb={2}>
              <Dialog.Title fontSize="lg" fontWeight={700}>
                Cancel {payment ? formatCurrency(payment.amount_total_cents, payment.currency) : ""} payment request?
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={3} right={3} asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={6} py={4}>
              <VStack align="stretch" gap={3}>
                <Text fontSize="sm" color={subduedText}>
                  The payment link stops working. The request stays in the history as Cancelled.
                </Text>
                <chakra.label display="flex" alignItems="center" gap={2} fontSize="sm" cursor="pointer">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                  Email the applicant that this request was withdrawn
                </chakra.label>
                <Textarea
                  placeholder={
                    notify
                      ? "Note to the applicant (optional) — included in the email"
                      : "Note (optional) — saved to the activity log"
                  }
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  px={4}
                />
              </VStack>
            </Dialog.Body>
            <Dialog.Footer px={6} pb={6} pt={2} gap={3}>
              <Button variant="ghost" onClick={handleClose} px={4}>
                Keep it
              </Button>
              <Button colorPalette="red" onClick={handleConfirm} loading={submitting} px={4}>
                Cancel request
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/* -------------------------------------------------------------------------- */

function SummaryLine({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  return (
    <Flex justify="space-between">
      <Text fontSize="xs" color={subduedText} textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight={emphasize ? 700 : 500}>
        {value}
      </Text>
    </Flex>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  return (
    <Text fontSize="xs" color={subduedText} mb={1} textTransform="uppercase">
      {children}
    </Text>
  );
}

async function copyToClipboard(value: string): Promise<boolean> {
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Clipboard may be blocked (non-HTTPS / permissions); the email still went out.
    return false;
  }
}

function parseDollarsToCents(value: string): number | undefined {
  const trimmed = value.trim().replace(/[,$\s]/g, "");
  if (trimmed === "") return undefined;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return Math.round(num * 100);
}
