"use client";

import { Box, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { LuActivity } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import {
  STATUS_LABELS,
  type AdminTimelineEntry,
  type ApplicationStatus,
} from "@/lib/api/admin-applications-service";

interface Props {
  entries: AdminTimelineEntry[];
  /** guest_id → display name, so guest events say who they're about. */
  guestNames?: Record<string, string>;
}

/**
 * Read-only activity feed. We translate raw activity-log event names to
 * human-friendly headlines and surface the most useful contextual fields
 * (e.g. from/to status, note excerpt).
 */
export function ApplicationTimeline({ entries, guestNames = {} }: Props) {
  const cardBg = useColorModeValue("white", "gray.900");
  const noteBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const subduedText = useColorModeValue("gray.600", "gray.400");

  return (
    <Box bg={cardBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={4}>
      <HStack mb={4}>
        <LuActivity />
        <Heading size="sm">Activity</Heading>
      </HStack>

      {entries.length === 0 ? (
        <Text fontSize="sm" color={subduedText}>
          Nothing to show yet.
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {entries.map((entry) => (
            <Box
              key={entry.id}
              bg={noteBg}
              borderWidth={1}
              borderColor={borderColor}
              borderRadius="md"
              p={3}
            >
              <Text fontSize="sm" fontWeight={600}>
                {headlineFor(entry, guestNames)}
              </Text>
              {detailFor(entry) && (
                <Text fontSize="sm" color={subduedText} whiteSpace="pre-wrap">
                  {detailFor(entry)}
                </Text>
              )}
              <Text fontSize="xs" color={subduedText} mt={1}>
                {entry.causer?.name ?? "System"} ·{" "}
                {entry.created_at ? new Date(entry.created_at).toLocaleString() : "—"}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}

function headlineFor(entry: AdminTimelineEntry, guestNames: Record<string, string>): string {
  const guestId = entry.properties.guest_id as string | undefined;
  const guest = (guestId && guestNames[guestId]) || "guest";
  switch (entry.event) {
    case "status_changed": {
      const from = (entry.properties.from as string | undefined) ?? "";
      const to = (entry.properties.to as string | undefined) ?? "";
      return `Status changed${from ? ` from ${labelFor(from)}` : ""}${to ? ` to ${labelFor(to)}` : ""}`;
    }
    case "note_added":
      return "Internal note added";
    case "admin_email_sent":
      return "Email sent to applicant";
    case "submitted":
      return "Application submitted";
    case "withdrawn":
      return "Application withdrawn by applicant";
    case "guest_added":
      return `Guest added: ${guest}`;
    case "guest_updated":
      return `Guest updated: ${guest}`;
    case "guest_status_changed": {
      const to = (entry.properties.to as string | undefined) ?? "";
      return `Guest ${guest} → ${GUEST_STATUS_LABELS[to] ?? to}`;
    }
    case "guest_payment_link_sent":
      return `Payment link sent for ${guest}`;
    case "guest_refund_issued":
      return `Refund issued for ${guest}`;
    case "guest_payment_unmatched":
      return `Action needed: payment received for ${guest} who is no longer pending — refund in Stripe`;
    default:
      return entry.description ?? entry.event ?? "Event";
  }
}

function detailFor(entry: AdminTimelineEntry): string | null {
  if (entry.event === "status_changed") {
    return (entry.properties.note as string | undefined) || null;
  }
  if (entry.event === "note_added") {
    return (entry.properties.note_excerpt as string | undefined) || null;
  }
  if (entry.event === "admin_email_sent") {
    const subject = (entry.properties.subject as string | undefined) ?? "";
    const excerpt = (entry.properties.body_excerpt as string | undefined) ?? "";
    return subject ? `Subject: ${subject}\n\n${excerpt}` : excerpt;
  }
  if (entry.event === "guest_updated") {
    const change = entry.properties.price_change as
      | { from?: number; to?: number; reason?: string | null }
      | undefined;
    if (change && change.from !== undefined && change.to !== undefined) {
      return `Price ${centsLabel(change.from)} → ${centsLabel(change.to)}${change.reason ? `: ${change.reason}` : ""}`;
    }
    return null;
  }
  if (entry.event === "guest_added") {
    const reason = entry.properties.price_override_reason as string | undefined;
    return reason ? `Price override: ${reason}` : null;
  }
  if (entry.event === "guest_status_changed") {
    const note = entry.properties.note as string | undefined;
    const reason = (entry.properties.reason as string | undefined) ?? "";
    if (note) return note;
    if (reason.startsWith("primary_")) {
      return `Automatic: applicant moved to ${labelFor(reason.slice("primary_".length))}`;
    }
    return null;
  }
  if (entry.event === "guest_refund_issued") {
    return (entry.properties.reason as string | undefined) || null;
  }
  if (entry.event === "guest_payment_unmatched") {
    const cents = entry.properties.amount_cents as number | undefined;
    return cents !== undefined ? `Amount: ${centsLabel(cents)}` : null;
  }
  return null;
}

const GUEST_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function centsLabel(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function labelFor(value: string): string {
  return STATUS_LABELS[value as ApplicationStatus] ?? value;
}
