"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Heading,
  HStack,
  Portal,
  Text,
  Textarea,
  VStack,
  Wrap,
  chakra,
} from "@chakra-ui/react";
import { LuUserPlus, LuUsers } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  GUEST_RELATIONSHIP_LABELS,
  type AdminApplicationDetail,
  type AdminApplicationGuest,
  type GuestStatus,
} from "@/lib/api/admin-applications-service";
import { GuestFormModal } from "./GuestFormModal";
import { apiErrorMessage, formatCurrency } from "./format";
import { RefundModal } from "./RefundModal";

const GUEST_STATUS_COLORS: Record<GuestStatus, string> = {
  pending_payment: "orange",
  paid: "green",
  confirmed: "teal",
  cancelled: "gray",
  refunded: "purple",
};

const GUEST_ALLOWED_PRIMARY_STATUSES = ["accepted", "paid", "confirmed"];

interface Props {
  application: AdminApplicationDetail;
  onUpdated: (next: AdminApplicationDetail) => void;
}

/**
 * "Party" block on the application detail page: the primary applicant plus
 * any guests (spouse, colleague, …) the ministry attached after approval.
 * Each guest has their own price, payment link and lifecycle.
 */
export function PartyPanel({ application, onUpdated }: Props) {
  const surfaceBg = useColorModeValue("white", "gray.900");
  const rowBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const subduedText = useColorModeValue("gray.600", "gray.400");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminApplicationGuest | null>(null);
  const [refunding, setRefunding] = useState<AdminApplicationGuest | null>(null);
  const [cancelling, setCancelling] = useState<AdminApplicationGuest | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const guests = application.guests ?? [];
  const canAddGuests = GUEST_ALLOWED_PRIMARY_STATUSES.includes(application.status);

  if (!canAddGuests && guests.length === 0) {
    return null;
  }

  const event = application.event;
  const currency = event?.currency ?? "USD";
  const activeGuests = guests.filter((g) =>
    ["pending_payment", "paid", "confirmed"].includes(g.status),
  );
  const capacity = event?.capacity ?? null;
  const filled = event?.capacity_filled ?? null;

  const handleSendLink = async (guest: AdminApplicationGuest) => {
    setSendingId(guest.id);
    try {
      const { session_url } = await adminApplicationsService.sendGuestPaymentLink(
        application.id,
        guest.id,
      );
      let copied = false;
      try {
        await navigator.clipboard.writeText(session_url);
        copied = true;
      } catch {
        // Clipboard may be blocked (non-HTTPS / permissions); the email still went out.
      }
      const sentTo =
        guest.payment_recipient === "guest" && guest.email ? guest.email : application.email;
      toaster.success({
        title: `Payment link emailed to ${sentTo ?? "the applicant"}.`,
        description: copied ? "Link also copied to your clipboard." : undefined,
      });
      onUpdated(await adminApplicationsService.getApplication(application.id));
    } catch (err: unknown) {
      toaster.error({ title: apiErrorMessage(err, "Could not create payment link.") });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Box bg={surfaceBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={5}>
      <Flex align="center" mb={4} gap={3} wrap="wrap">
        <HStack>
          <LuUsers />
          <Heading size="sm">Party</Heading>
        </HStack>
        <Text fontSize="sm" color={subduedText}>
          {1 + activeGuests.length} {1 + activeGuests.length === 1 ? "person" : "people"}
          {capacity ? ` · event ${filled ?? "—"}/${capacity} seats filled` : ""}
        </Text>
        <Box flex={1} />
        {canAddGuests && (
          <Button
            size="sm"
            px={4}
            variant="outline"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <LuUserPlus /> Add guest
          </Button>
        )}
      </Flex>

      <VStack align="stretch" gap={2}>
        {/* Primary applicant row */}
        <Box bg={rowBg} borderWidth={1} borderColor={borderColor} borderRadius="md" p={3}>
          <HStack justify="space-between" wrap="wrap" gap={2}>
            <Box>
              <Text fontWeight={600}>
                {[application.first_name, application.last_name].filter(Boolean).join(" ") ||
                  "Applicant"}{" "}
                <Text as="span" fontSize="xs" color={subduedText} fontWeight={400}>
                  (primary)
                </Text>
              </Text>
              <Text fontSize="xs" color={subduedText}>
                {application.email ?? "—"}
                {application.phone ? ` · ${application.phone}` : ""}
              </Text>
            </Box>
            <Text fontSize="sm" color={subduedText}>
              {formatCurrency(event?.price_cents ?? 0, currency)}
            </Text>
          </HStack>
        </Box>

        {guests.length === 0 && (
          <Text fontSize="sm" color={subduedText} py={2}>
            No guests yet. Add a spouse, colleague or family member the ministry approved to
            attend with this applicant.
          </Text>
        )}

        {guests.map((guest) => (
          <GuestRow
            key={guest.id}
            guest={guest}
            application={application}
            currency={currency}
            rowBg={rowBg}
            borderColor={borderColor}
            subduedText={subduedText}
            sending={sendingId === guest.id}
            onSendLink={() => handleSendLink(guest)}
            onEdit={() => {
              setEditing(guest);
              setFormOpen(true);
            }}
            onCancel={() => setCancelling(guest)}
            onRefund={() => setRefunding(guest)}
          />
        ))}
      </VStack>

      <GuestFormModal
        application={application}
        guest={editing}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onUpdated}
      />
      <RefundModal
        application={application}
        guest={refunding}
        open={refunding !== null}
        onClose={() => setRefunding(null)}
        onUpdated={onUpdated}
      />
      <CancelGuestDialog
        application={application}
        guest={cancelling}
        onClose={() => setCancelling(null)}
        onUpdated={onUpdated}
      />
    </Box>
  );
}

/* -------------------------------------------------------------------------- */

function GuestRow({
  guest,
  application,
  currency,
  rowBg,
  borderColor,
  subduedText,
  sending,
  onSendLink,
  onEdit,
  onCancel,
  onRefund,
}: {
  guest: AdminApplicationGuest;
  application: AdminApplicationDetail;
  currency: string;
  rowBg: string;
  borderColor: string;
  subduedText: string;
  sending: boolean;
  onSendLink: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onRefund: () => void;
}) {
  const isPending = guest.status === "pending_payment";
  const isTerminal = guest.status === "cancelled" || guest.status === "refunded";
  const primaryAllowsGuests = GUEST_ALLOWED_PRIMARY_STATUSES.includes(application.status);
  const hasProduct = Boolean(application.event?.stripe_product_id);
  const refundable =
    (guest.amount_paid_cents ?? 0) - (guest.amount_refunded_cents ?? 0) > 0 &&
    (guest.status === "paid" || guest.status === "refunded");

  const showSendLink = isPending && guest.price_cents > 0 && primaryAllowsGuests;
  const showCancel = isPending || guest.status === "confirmed";
  const showRefund = refundable && guest.status === "paid";
  const payerLabel =
    guest.payment_recipient === "guest" && guest.email ? "guest pays" : "applicant pays";

  return (
    <Box
      bg={rowBg}
      borderWidth={1}
      borderColor={borderColor}
      borderRadius="md"
      p={3}
      opacity={isTerminal ? 0.7 : 1}
    >
      <HStack justify="space-between" align="flex-start" wrap="wrap" gap={2}>
        <Box minW={0}>
          <HStack gap={2} wrap="wrap">
            <Text fontWeight={600}>
              {guest.first_name} {guest.last_name}
            </Text>
            {guest.relationship && (
              <Text fontSize="xs" color={subduedText}>
                {GUEST_RELATIONSHIP_LABELS[guest.relationship]}
              </Text>
            )}
            <Badge
              colorPalette={GUEST_STATUS_COLORS[guest.status]}
              variant="subtle"
              px={2}
              textTransform="uppercase"
            >
              {guest.status_label}
            </Badge>
            {guest.payment_link_expired_at && isPending && (
              <Badge colorPalette="red" variant="subtle" px={2}>
                Link expired
              </Badge>
            )}
          </HStack>
          <Text fontSize="xs" color={subduedText}>
            {guest.email ?? "No email"}
            {guest.phone ? ` · ${guest.phone}` : ""}
            {guest.price_cents > 0 ? ` · ${payerLabel}` : ""}
            {guest.payment_link_sent_count > 0 ? ` · link sent ${guest.payment_link_sent_count}×` : ""}
          </Text>
          {guest.price_overridden && (
            <Text fontSize="xs" color="orange.500" mt={1}>
              Price override{guest.price_overridden_by?.name ? ` by ${guest.price_overridden_by.name}` : ""}
              : {guest.price_override_reason ?? "—"}
            </Text>
          )}
        </Box>

        <VStack align="flex-end" gap={0}>
          <Text fontSize="sm" fontWeight={600}>
            {guest.price_cents === 0 ? "Comped" : formatCurrency(guest.price_cents, currency)}
          </Text>
          {(guest.amount_paid_cents ?? 0) > 0 && (
            <Text fontSize="xs" color={subduedText}>
              Paid {formatCurrency(guest.amount_paid_cents ?? 0, guest.paid_currency ?? currency)}
              {(guest.amount_refunded_cents ?? 0) > 0
                ? ` · refunded ${formatCurrency(guest.amount_refunded_cents ?? 0, guest.paid_currency ?? currency)}`
                : ""}
            </Text>
          )}
        </VStack>
      </HStack>

      {!isTerminal && (
        <Wrap mt={3} gap={2}>
          {showSendLink && (
            <Button
              size="xs"
              px={3}
              colorPalette="brand"
              onClick={onSendLink}
              loading={sending}
              disabled={!hasProduct}
              title={hasProduct ? undefined : "Event has no Stripe product yet — re-save the event."}
            >
              {guest.payment_link_sent_count > 0 ? "Re-send payment link" : "Send payment link"}
            </Button>
          )}
          <Button size="xs" px={3} variant="outline" onClick={onEdit}>
            Edit
          </Button>
          {showRefund && (
            <Button size="xs" px={3} variant="outline" colorPalette="red" onClick={onRefund}>
              Refund
            </Button>
          )}
          {showCancel && (
            <Button size="xs" px={3} variant="ghost" colorPalette="red" onClick={onCancel}>
              Cancel guest
            </Button>
          )}
        </Wrap>
      )}
    </Box>
  );
}

function CancelGuestDialog({
  application,
  guest,
  onClose,
  onUpdated,
}: {
  application: AdminApplicationDetail;
  guest: AdminApplicationGuest | null;
  onClose: () => void;
  onUpdated: (next: AdminApplicationDetail) => void;
}) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setNote("");
    setNotify(true);
    onClose();
  };

  const handleConfirm = async () => {
    if (!guest) return;
    setSubmitting(true);
    try {
      await adminApplicationsService.cancelGuest(application.id, guest.id, {
        notify,
        note: note.trim() || undefined,
      });
      toaster.success({ title: `${guest.first_name} ${guest.last_name} cancelled.` });
      onUpdated(await adminApplicationsService.getApplication(application.id));
      handleClose();
    } catch (err: unknown) {
      toaster.error({ title: apiErrorMessage(err, "Could not cancel guest.") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={guest !== null}
      onOpenChange={(d) => !d.open && handleClose()}
      size="sm"
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner padding={4}>
          <Dialog.Content maxW="480px" w="full" mx={4} borderRadius="xl">
            <Dialog.Header px={6} pt={6} pb={2}>
              <Dialog.Title fontSize="lg" fontWeight={700}>
                Cancel {guest ? `${guest.first_name} ${guest.last_name}` : "guest"}?
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={3} right={3} asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={6} py={4}>
              <VStack align="stretch" gap={3}>
                <Text fontSize="sm" color={subduedText}>
                  Frees their seat. Any open payment link stops working for them.
                </Text>
                <chakra.label display="flex" alignItems="center" gap={2} fontSize="sm" cursor="pointer">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                  />
                  Email a cancellation notice
                </chakra.label>
                <Textarea
                  placeholder={
                    notify
                      ? "Note to the guest (optional) — included in the email"
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
                Keep guest
              </Button>
              <Button colorPalette="red" onClick={handleConfirm} loading={submitting} px={4}>
                Cancel guest
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
