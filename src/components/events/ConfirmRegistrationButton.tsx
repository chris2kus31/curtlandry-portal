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
  onUpdated: (next: AdminApplicationDetail) => void;
}

/**
 * Admin-triggered terminal confirm for FREE events (price_cents === 0).
 * Sibling control to {@link SendPaymentLinkButton}.
 *
 * Rendering rules (returns null otherwise):
 *   - Event is free (price_cents === 0)
 *   - Application is in ACCEPTED status
 *
 * The state machine handles the transition + email; this control is a
 * thin trigger that refreshes the page state on success.
 */
export function ConfirmRegistrationButton({ application, onUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const event = application.event;
  const isFreeEvent = (event?.price_cents ?? 0) === 0;
  const isAccepted = application.status === "accepted";

  if (!isFreeEvent || !isAccepted) {
    return null;
  }

  const handleClick = async () => {
    setSubmitting(true);
    try {
      await adminApplicationsService.confirmFreeRegistration(application.id);
      const next = await adminApplicationsService.getApplication(application.id);
      onUpdated(next);

      toaster.success({
        title: "Registration confirmed.",
        description: "Applicant has been emailed.",
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not confirm the registration.";
      toaster.error({ title: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button
      colorPalette="brand"
      size="sm"
      onClick={handleClick}
      loading={submitting}
      px={4}
    >
      Confirm registration
    </Button>
  );
}
