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
  SimpleGrid,
  Text,
  Textarea,
  VStack,
  chakra,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  GUEST_RELATIONSHIP_LABELS,
  type AdminApplicationDetail,
  type AdminApplicationGuest,
  type GuestPayload,
  type GuestPaymentRecipient,
  type GuestRelationship,
} from "@/lib/api/admin-applications-service";
import { apiErrorMessage, formatCurrency } from "./format";

interface Props {
  application: AdminApplicationDetail;
  /** null = add a new guest. */
  guest: AdminApplicationGuest | null;
  open: boolean;
  onClose: () => void;
  onSaved: (next: AdminApplicationDetail) => void;
}

/**
 * Add / edit a guest on an approved application. Price defaults to the event
 * price; any other amount requires an override reason (the API enforces the
 * same rule and records who overrode it).
 */
export function GuestFormModal({ application, guest, open, onClose, onSaved }: Props) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const inputBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const event = application.event;
  const eventPriceCents = event?.price_cents ?? 0;
  const currency = event?.currency ?? "USD";
  const isFreeEvent = eventPriceCents === 0;
  const isEdit = guest !== null;
  const priceLocked = isFreeEvent || (isEdit && guest.status !== "pending_payment");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState<GuestRelationship | "">("");
  const [recipient, setRecipient] = useState<GuestPaymentRecipient>("guest");
  const [priceInput, setPriceInput] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(guest?.first_name ?? "");
    setLastName(guest?.last_name ?? "");
    setEmail(guest?.email ?? "");
    setPhone(guest?.phone ?? "");
    setRelationship(guest?.relationship ?? "");
    setRecipient(guest?.payment_recipient ?? "guest");
    setPriceInput(centsToDollarsInput(guest?.price_cents ?? eventPriceCents));
    setReason(guest?.price_override_reason ?? "");
  }, [open, guest, eventPriceCents]);

  const hasEmail = email.trim() !== "";
  const effectiveRecipient: GuestPaymentRecipient = hasEmail ? recipient : "primary";
  const priceCents = parseDollarsToCents(priceInput);
  const priceValid = priceCents !== undefined;
  const isOverride = priceValid && priceCents !== eventPriceCents;
  const priceChanged = !isEdit || (priceValid && priceCents !== guest.price_cents);
  const reasonRequired = isOverride && priceChanged && !priceLocked;
  const emailValid = !hasEmail || /^\S+@\S+\.\S+$/.test(email.trim());

  const canSubmit =
    !submitting &&
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    emailValid &&
    (priceLocked || priceValid) &&
    (!reasonRequired || reason.trim() !== "");

  const handleSubmit = async () => {
    const payload: GuestPayload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: hasEmail ? email.trim() : null,
      phone: phone.trim() || null,
      relationship: relationship || null,
      payment_recipient: effectiveRecipient,
    };
    if (!priceLocked && priceValid && priceChanged) {
      payload.price_cents = priceCents;
      payload.price_override_reason = isOverride ? reason.trim() : null;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await adminApplicationsService.updateGuest(application.id, guest.id, payload);
        toaster.success({ title: "Guest updated." });
      } else {
        const result = await adminApplicationsService.addGuest(application.id, payload);
        if (result.over_capacity) {
          toaster.warning({
            title: "Guest added — event is now over capacity.",
            description: `Capacity ${result.capacity ?? "—"}, remaining ${result.capacity_remaining ?? 0}.`,
          });
        } else {
          toaster.success({
            title:
              result.guest.status === "confirmed"
                ? "Guest added and confirmed (no payment due)."
                : "Guest added. Send their payment link when ready.",
          });
        }
      }
      const next = await adminApplicationsService.getApplication(application.id);
      onSaved(next);
      onClose();
    } catch (err: unknown) {
      toaster.error({ title: apiErrorMessage(err, "Could not save guest.") });
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
          <Dialog.Content maxW="600px" w="full" mx={4} borderRadius="xl">
            <Dialog.Header px={6} pt={6} pb={2}>
              <Dialog.Title fontSize="lg" fontWeight={700}>
                {isEdit ? "Edit guest" : "Add guest"}
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={3} right={3} asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body px={6} py={4}>
              <VStack align="stretch" gap={4}>
                <Text fontSize="sm" color={subduedText}>
                  Guests are attached to this application — they never fill out their own
                  application form.
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                  <LabeledInput label="First name *" value={firstName} onChange={setFirstName} />
                  <LabeledInput label="Last name *" value={lastName} onChange={setLastName} />
                  <LabeledInput
                    label="Email (optional)"
                    value={email}
                    onChange={setEmail}
                    type="email"
                    invalid={!emailValid}
                  />
                  <LabeledInput label="Phone (optional)" value={phone} onChange={setPhone} type="tel" />
                </SimpleGrid>

                <Box>
                  <FieldLabel>Relationship</FieldLabel>
                  <Box
                    bg={inputBg}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={borderColor}
                    _focusWithin={{ borderColor: "brand.500" }}
                  >
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value as GuestRelationship | "")}
                      style={selectStyle}
                    >
                      <option value="">—</option>
                      {Object.entries(GUEST_RELATIONSHIP_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Box>
                </Box>

                {!isFreeEvent && (
                  <Box>
                    <FieldLabel>Payment emails go to</FieldLabel>
                    <VStack align="stretch" gap={1}>
                      <RadioRow
                        checked={effectiveRecipient === "guest"}
                        disabled={!hasEmail}
                        onChange={() => setRecipient("guest")}
                        label="The guest"
                        hint={
                          hasEmail
                            ? "Payment link and receipts go to the guest's own email."
                            : "Add an email to send the link to the guest directly."
                        }
                      />
                      <RadioRow
                        checked={effectiveRecipient === "primary"}
                        onChange={() => setRecipient("primary")}
                        label={`The applicant (${application.email ?? "primary"})`}
                        hint="The applicant pays for this guest from their own inbox."
                      />
                    </VStack>
                  </Box>
                )}

                <Box>
                  <FieldLabel>Price ({currency})</FieldLabel>
                  <Input
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    inputMode="decimal"
                    disabled={priceLocked}
                    px={4}
                  />
                  <Text fontSize="xs" color={subduedText} mt={1}>
                    {isFreeEvent
                      ? "Free event — guests are confirmed immediately."
                      : priceLocked
                        ? "Price can't change after the guest has paid or been confirmed."
                        : `Event price is ${formatCurrency(eventPriceCents, currency)}. Enter 0 to comp this guest.`}
                  </Text>
                </Box>

                {reasonRequired && (
                  <Box>
                    <FieldLabel>Reason for price override *</FieldLabel>
                    <Textarea
                      placeholder="e.g. Spouse rate approved by leadership"
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={1000}
                      px={4}
                    />
                    <Text fontSize="xs" color="orange.500" mt={1}>
                      {priceCents === 0
                        ? "This guest will be comped and confirmed without payment."
                        : `Overriding ${formatCurrency(eventPriceCents, currency)} → ${formatCurrency(priceCents ?? 0, currency)}.`}{" "}
                      Recorded in the activity log.
                    </Text>
                  </Box>
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer px={6} pb={6} pt={2} gap={3}>
              <Button variant="ghost" onClick={onClose} px={4}>
                Cancel
              </Button>
              <Button
                colorPalette="brand"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={submitting}
                px={4}
              >
                {isEdit ? "Save changes" : "Add guest"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/* -------------------------------------------------------------------------- */

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "transparent",
  color: "inherit",
  fontSize: "14px",
  cursor: "pointer",
  outline: "none",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  return (
    <Text fontSize="xs" color={subduedText} mb={1} textTransform="uppercase">
      {children}
    </Text>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  invalid = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  invalid?: boolean;
}) {
  return (
    <Box>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        borderColor={invalid ? "red.400" : undefined}
        px={4}
      />
    </Box>
  );
}

function RadioRow({
  checked,
  disabled = false,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  return (
    <chakra.label
      display="flex"
      alignItems="flex-start"
      gap={2}
      fontSize="sm"
      cursor={disabled ? "not-allowed" : "pointer"}
      opacity={disabled ? 0.6 : 1}
    >
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        style={{ marginTop: 3 }}
      />
      <HStack align="baseline" gap={2} flexWrap="wrap">
        <Text fontWeight={500}>{label}</Text>
        <Text fontSize="xs" color={subduedText}>
          {hint}
        </Text>
      </HStack>
    </chakra.label>
  );
}

function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseDollarsToCents(value: string): number | undefined {
  const trimmed = value.trim().replace(/[,$\s]/g, "");
  if (trimmed === "") return undefined;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return undefined;
  return Math.round(num * 100);
}