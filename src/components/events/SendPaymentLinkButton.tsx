"use client";

import { useState } from "react";
import { Button, HStack, Text, VStack } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminApplicationDetail,
} from "@/lib/api/admin-applications-service";
import {
  RESET_LINK_CONFIRM,
  linkLifetimeLabel,
  openRegistrationLink,
} from "@/lib/events/payment-links";

interface Props {
  application: AdminApplicationDetail;
  /**
   * Called after a successful send with the refreshed application. The
   * parent page is responsible for updating its state from this — we
   * don't push directly to a store so the page owns its lifecycle.
   */
  onUpdated: (next: AdminApplicationDetail) => void;
}

/**
 * Admin-triggered "Send payment link" affordance for PAID events.
 *
 * Rendering rules (returns null otherwise):
 *   - Event is paid (price_cents > 0)
 *   - Event has been synced to Stripe (stripe_price_id present)
 *   - Application is in ACCEPTED status
 *
 * Same control handles first-send and re-send — the label adapts and the
 * "Re-send" path also clears the `payment_link_expired_at` breadcrumb on
 * the server side. With Payment Links, re-send emails the same open link
 * (or a new one if the event price changed); "Reset link" kills the open
 * link and emails a fresh one.
 *
 * On success the URL is copied to the clipboard so admins who want to ping
 * the applicant via Slack/SMS in addition to the auto-email have it without
 * an extra step.
 */
export function SendPaymentLinkButton({ application, onUpdated }: Props) {
  const [submitting, setSubmitting] = useState<"send" | "reset" | null>(null);

  const event = application.event;
  const isPaidEvent = (event?.price_cents ?? 0) > 0;
  const hasStripePrice = Boolean(event?.stripe_price_id);
  const isAccepted = application.status === "accepted";

  if (!isPaidEvent || !isAccepted) {
    return null;
  }

  const sentBefore = (application.payment.payment_link_sent_count ?? 0) > 0;
  const linkExpired = Boolean(application.payment.payment_link_expired_at);
  const openLink = openRegistrationLink(application.payments);
  const priceChanged = openLink !== undefined && openLink.amount_total_cents !== event?.price_cents;

  const label = sentBefore ? "Re-send payment link" : "Send payment link";

  const send = async (reset: boolean) => {
    if (!hasStripePrice) {
      toaster.error({
        title: "Event isn't set up in Stripe yet.",
        description:
          "Open the event and save it once to trigger the Stripe product/price sync, then try again.",
      });
      return;
    }
    if (reset && !window.confirm(RESET_LINK_CONFIRM)) return;

    setSubmitting(reset ? "reset" : "send");
    try {
      const result = await adminApplicationsService.sendPaymentLink(application.id, reset);

      // Best-effort clipboard copy — silently no-op if the browser denies
      // access (e.g. document not focused, non-secure context).
      try {
        await navigator.clipboard?.writeText(result.session_url);
      } catch {
        /* ignore */
      }

      const next = await adminApplicationsService.getApplication(application.id);
      onUpdated(next);

      toaster.success({
        title: reset ? "Payment link reset." : sentBefore ? "Payment link re-sent." : "Payment link sent.",
        description:
          "Applicant emailed. URL also copied to your clipboard if you want to share it elsewhere.",
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not send the payment link.";
      toaster.error({ title: message });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <VStack align="stretch" gap={1}>
      <HStack gap={2}>
        <Button
          colorPalette={linkExpired ? "orange" : "brand"}
          variant={linkExpired ? "solid" : sentBefore ? "outline" : "solid"}
          size="sm"
          onClick={() => send(false)}
          loading={submitting === "send"}
          disabled={submitting !== null}
          px={4}
        >
          {label}
        </Button>
        {openLink && (
          <Button
            variant="ghost"
            size="sm"
            colorPalette="gray"
            onClick={() => send(true)}
            loading={submitting === "reset"}
            disabled={submitting !== null}
          >
            Reset link
          </Button>
        )}
      </HStack>
      {openLink && (
        <Text fontSize="xs" color="fg.muted">
          {priceChanged
            ? "Event price changed — re-sending will email a new link at the current price."
            : linkLifetimeLabel(openLink)}
        </Text>
      )}
    </VStack>
  );
}
