import type { AdminApplicationPayment } from "@/lib/api/admin-applications-service";

export const RESET_LINK_CONFIRM =
  "Reset this payment link? The current link stops working immediately and a new one is emailed. " +
  "Use this if the link was forwarded to the wrong person or the amount changed.";

/** Open registration Payment Link (primary only, no guest items). */
export function openRegistrationLink(
  payments: AdminApplicationPayment[] | undefined,
): AdminApplicationPayment | undefined {
  return payments?.find(
    (p) => p.purpose === "registration" && p.link_active && p.items.every((i) => i.guest_id === null),
  );
}

/** Open Payment Link billing this guest. */
export function openGuestLink(
  payments: AdminApplicationPayment[] | undefined,
  guestId: string,
): AdminApplicationPayment | undefined {
  return payments?.find((p) => p.link_active && p.items.some((i) => i.guest_id === guestId));
}

export function linkLifetimeLabel(payment: AdminApplicationPayment): string {
  return payment.expires_at ? "Link open until the event starts" : "Link open until paid";
}
