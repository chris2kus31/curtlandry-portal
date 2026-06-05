"use client";

import { useState } from "react";
import { Button } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminApplicationDetail,
} from "@/lib/api/admin-applications-service";

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
 * the server side. The copy on the button reflects the most recent state.
 *
 * On success the freshly-minted Stripe Checkout URL is copied to the
 * clipboard so admins who want to ping the applicant via Slack/SMS in
 * addition to the auto-email have it without an extra step.
 */
export function SendPaymentLinkButton({ application, onUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const event = application.event;
  const isPaidEvent = (event?.price_cents ?? 0) > 0;
  const hasStripePrice = Boolean(event?.stripe_price_id);
  const isAccepted = application.status === "accepted";

  if (!isPaidEvent || !isAccepted) {
    return null;
  }

  const sentBefore = (application.payment.payment_link_sent_count ?? 0) > 0;
  const linkExpired = Boolean(application.payment.payment_link_expired_at);

  const label = sentBefore ? "Re-send payment link" : "Send payment link";

  const handleClick = async () => {
    if (!hasStripePrice) {
      toaster.error({
        title: "Event isn't set up in Stripe yet.",
        description:
          "Open the event and save it once to trigger the Stripe product/price sync, then try again.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminApplicationsService.sendPaymentLink(application.id);

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
        title: sentBefore
          ? "Payment link re-sent."
          : "Payment link sent.",
        description:
          "Applicant emailed. URL also copied to your clipboard if you want to share it elsewhere.",
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not send the payment link.";
      toaster.error({ title: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button
      colorPalette={linkExpired ? "orange" : "brand"}
      variant={linkExpired ? "solid" : sentBefore ? "outline" : "solid"}
      size="sm"
      onClick={handleClick}
      loading={submitting}
      px={4}
    >
      {label}
    </Button>
  );
}
