"use client";

import { Badge, type BadgeProps } from "@chakra-ui/react";

/**
 * Orthogonal flag-style badge for applications whose Stripe Checkout
 * Session expired before the applicant paid. Rendered alongside the
 * primary StatusBadge so admins can scan the queue and spot stuck
 * payments without opening each card.
 *
 * The flag is non-blocking — application stays in ACCEPTED status,
 * admins re-send the link with one click and the badge clears.
 */
interface Props {
  /** ISO string of when the most recent payment link expired. */
  expiredAt: string;
  /**
   * If known, surface the re-send count so ops can tell "first expiry"
   * from "we've already tried 4 times — needs attention".
   */
  sentCount?: number;
  size?: BadgeProps["size"];
}

export function PaymentLinkExpiredBadge({ expiredAt, sentCount, size = "sm" }: Props) {
  const expired = new Date(expiredAt);
  const formatted = isNaN(expired.getTime())
    ? null
    : expired.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

  const label =
    sentCount !== undefined && sentCount > 1
      ? `Link expired · sent ${sentCount}×`
      : "Link expired";

  return (
    <Badge
      colorPalette="orange"
      variant="outline"
      size={size}
      textTransform="uppercase"
      letterSpacing="wide"
      fontWeight={600}
      px={3}
      title={formatted ? `Expired at ${formatted}` : undefined}
    >
      {label}
    </Badge>
  );
}
