"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  IconButton,
  Skeleton,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuArrowLeft, LuPencil, LuPlus, LuRefreshCw } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminEventSummary,
} from "@/lib/api/admin-applications-service";
import { useAuthStore } from "@/store/auth-store";

/**
 * Event management home — lists all events with a "New event" CTA. We
 * intentionally re-use the lightweight `listEvents` endpoint (it already
 * carries counts), so we don't need a new endpoint just to render this.
 */
export default function EventsManagePage() {
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const canManage = useAuthStore((s) => s.hasPermission("events.manage"));

  const surfaceBg = useColorModeValue("white", "gray.900");
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const load = async () => {
    setLoading(true);
    try {
      const list = await adminApplicationsService.listEvents();
      setEvents(list);
    } catch (err) {
      console.error(err);
      toaster.error({ title: "Failed to load events." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Box p={{ base: 4, md: 8 }}>
      <HStack mb={6} gap={3} align="center">
        <NextLink href="/events/applications" passHref>
          <IconButton aria-label="Back to applications" size="sm" variant="ghost">
            <LuArrowLeft />
          </IconButton>
        </NextLink>
        <Heading size="lg">Events</Heading>
        <Spacer />
        <IconButton aria-label="Refresh" size="sm" variant="outline" onClick={load}>
          <LuRefreshCw />
        </IconButton>
        {canManage && (
          <NextLink href="/events/manage/new" passHref>
            <Button colorPalette="brand" size="sm" px={4}>
              <LuPlus /> New event
            </Button>
          </NextLink>
        )}
      </HStack>

      {loading ? (
        <VStack align="stretch" gap={3}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="100px" borderRadius="lg" />
          ))}
        </VStack>
      ) : events.length === 0 ? (
        <Card.Root bg={surfaceBg} borderWidth={1} borderColor={borderColor}>
          <Card.Body p={8}>
            <Text color={subduedText} textAlign="center">
              No events yet.
            </Text>
            {canManage && (
              <Flex justify="center" mt={4}>
                <NextLink href="/events/manage/new" passHref>
                  <Button colorPalette="brand" size="sm" px={4}>
                    <LuPlus /> Create your first event
                  </Button>
                </NextLink>
              </Flex>
            )}
          </Card.Body>
        </Card.Root>
      ) : (
        <VStack align="stretch" gap={3}>
          {events.map((e) => (
            <Card.Root key={e.id} bg={surfaceBg} borderWidth={1} borderColor={borderColor}>
              <Card.Body p={5}>
                <Flex align="center" gap={4}>
                  <Box flex={1} minW={0}>
                    <HStack gap={2} mb={1}>
                      <Heading size="md" truncate>
                        {e.name}
                      </Heading>
                      <Text fontSize="xs" color={subduedText}>
                        · {e.site?.slug ?? "—"}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color={subduedText}>
                      {e.start_date ?? "—"} → {e.end_date ?? "—"} ·{" "}
                      <Box as="span" textTransform="uppercase" fontWeight={600}>
                        {e.application_status}
                      </Box>
                    </Text>
                    <Text fontSize="xs" color={subduedText} mt={1}>
                      {e.counts.total} application{e.counts.total === 1 ? "" : "s"}
                      {e.counts.needs_review > 0 && ` · ${e.counts.needs_review} need review`}
                      {e.capacity_remaining !== null &&
                        ` · ${e.capacity_remaining} seats remaining`}
                    </Text>
                  </Box>
                  {canManage && (
                    <NextLink href={`/events/manage/${e.id}/edit`} passHref>
                      <Button size="sm" variant="outline" px={4}>
                        <LuPencil /> Edit
                      </Button>
                    </NextLink>
                  )}
                </Flex>
              </Card.Body>
            </Card.Root>
          ))}
        </VStack>
      )}
    </Box>
  );
}
