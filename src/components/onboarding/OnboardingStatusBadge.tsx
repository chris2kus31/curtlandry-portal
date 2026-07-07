"use client";

import { Badge } from "@chakra-ui/react";

interface OnboardingStatusBadgeProps {
  label: string | null | undefined;
  color: string | null | undefined;
  size?: "sm" | "md" | "lg";
}

// Maps backend status colors (e.g. "blue", "orange") to Chakra color palettes.
const COLOR_TO_PALETTE: Record<string, string> = {
  blue: "blue",
  cyan: "cyan",
  teal: "teal",
  green: "green",
  orange: "orange",
  yellow: "yellow",
  red: "red",
  purple: "purple",
  gray: "gray",
  grey: "gray",
};

export function OnboardingStatusBadge({
  label,
  color,
  size = "sm",
}: OnboardingStatusBadgeProps) {
  const palette = (color && COLOR_TO_PALETTE[color]) || "gray";

  return (
    <Badge
      colorPalette={palette}
      variant="subtle"
      size={size}
      borderRadius="full"
      px={3}
      py={1}
      textTransform="capitalize"
    >
      {label ?? "—"}
    </Badge>
  );
}
