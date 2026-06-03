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
}

/**
 * Read-only activity feed. We translate raw activity-log event names to
 * human-friendly headlines and surface the most useful contextual fields
 * (e.g. from/to status, note excerpt).
 */
export function ApplicationTimeline({ entries }: Props) {
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
                {headlineFor(entry)}
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

function headlineFor(entry: AdminTimelineEntry): string {
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
  return null;
}

function labelFor(value: string): string {
  return STATUS_LABELS[value as ApplicationStatus] ?? value;
}
