"use client";

import { Badge } from "@chakra-ui/react";
import {
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/api/admin-applications-service";

const COLORS: Record<ApplicationStatus, string> = {
  draft: "gray",
  submitted: "blue",
  info_requested: "purple",
  accepted: "green",
  paid: "teal",
  // Free-event terminal-locked state. Distinct from paid (teal) so admins
  // can scan the queue and tell paid vs free-confirmed apart at a glance.
  confirmed: "cyan",
  waitlisted: "orange",
  declined: "red",
  cancelled: "gray",
  refunded: "pink",
  expired: "gray",
};

interface Props {
  status: ApplicationStatus;
  size?: "xs" | "sm" | "md" | "lg";
}

/**
 * Visual treatment of an application status. We use Chakra `colorPalette` so
 * the badge picks up consistent dark/light tokens. `submitted` is the most
 * common queue state — colored blue to read as "actionable".
 */
export function StatusBadge({ status, size = "sm" }: Props) {
  return (
    <Badge
      colorPalette={COLORS[status] ?? "gray"}
      variant="subtle"
      size={size}
      textTransform="uppercase"
      letterSpacing="wide"
      fontWeight={600}
      px={4}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
