"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Heading,
  HStack,
  Text,
  VStack,
  SimpleGrid,
  Card,
  Skeleton,
  Input,
  Button,
  Flex,
  Stack,
  Spacer,
  IconButton,
  chakra,
} from "@chakra-ui/react";
import {
  LuClipboardList,
  LuRefreshCw,
  LuSearch,
  LuChevronLeft,
  LuChevronRight,
  LuSettings,
} from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminApplicationStats,
  type AdminApplicationSummary,
  type AdminEventSummary,
  type ApplicationStatus,
  type PaginatedResponse,
} from "@/lib/api/admin-applications-service";
import { StatusBadge } from "@/components/events/StatusBadge";

const QUICK_FILTERS: { value: "" | ApplicationStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "submitted", label: "Needs Review" },
  { value: "info_requested", label: "Info Requested" },
  { value: "accepted", label: "Accepted" },
  { value: "paid", label: "Paid" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "declined", label: "Declined" },
];

const Select = chakra("select");

/**
 * Applications queue — the landing surface for reviewers. Heavy lifting:
 *  - Polls /events + /events/applications/stats to populate the filter
 *    dropdown and the dashboard cards.
 *  - Debounces the search box so we don't spam the API on every keystroke.
 *  - Status pills act as quick filters that swap the `status` query param.
 *
 * Status pill state and event filter state live in URL-shaped local state
 * for simplicity; if the user reloads they start fresh. Persisting filters
 * to the URL is a small follow-up if we end up wanting deep links.
 */
export default function ApplicationsQueuePage() {
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [stats, setStats] = useState<AdminApplicationStats | null>(null);
  const [page, setPage] = useState<PaginatedResponse<AdminApplicationSummary> | null>(
    null,
  );

  const [eventId, setEventId] = useState<string>("");
  const [status, setStatus] = useState<"" | ApplicationStatus>("submitted");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setLoading] = useState(true);

  const canManageEvents = useAuthStore((s) => s.hasPermission("events.manage"));

  const surfaceBg = useColorModeValue("white", "gray.900");
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const rowHoverBg = useColorModeValue("gray.50", "gray.800");

  // Bootstrap: events + first stats snapshot.
  useEffect(() => {
    (async () => {
      try {
        const [eventsList, statsRes] = await Promise.all([
          adminApplicationsService.listEvents(),
          adminApplicationsService.getStats(),
        ]);
        setEvents(eventsList);
        setStats(statsRes);
      } catch (err) {
        console.error(err);
        toaster.error({ title: "Failed to load events." });
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Re-load whenever a filter changes. Resets to page 1 to avoid asking
  // for "page 4 of accepted" when the current filter set might have
  // fewer pages than that.
  useEffect(() => {
    setCurrentPage(1);
  }, [eventId, status, debouncedSearch]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApplicationsService.listApplications({
        event_id: eventId || undefined,
        status: status || undefined,
        q: debouncedSearch || undefined,
        page: currentPage,
        per_page: 25,
      });
      setPage(res);
      // Refresh stats with the same event scope so the cards reflect filters.
      const statsRes = await adminApplicationsService.getStats(eventId || undefined);
      setStats(statsRes);
    } catch (err) {
      console.error(err);
      toaster.error({ title: "Failed to load applications." });
    } finally {
      setLoading(false);
    }
  }, [eventId, status, debouncedSearch, currentPage]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { key: "needs_review", label: "Needs Review", value: stats.needs_review, tone: "blue" },
      { key: "info_requested", label: "Info Requested", value: stats.info_requested, tone: "purple" },
      { key: "accepted", label: "Accepted", value: stats.accepted, tone: "green" },
      { key: "paid", label: "Paid", value: stats.paid, tone: "teal" },
      { key: "waitlisted", label: "Waitlisted", value: stats.waitlisted, tone: "orange" },
      { key: "total", label: "Total", value: stats.total, tone: "gray" },
    ];
  }, [stats]);

  return (
    <Box p={{ base: 4, md: 8 }}>
      <HStack mb={6} gap={3}>
        <LuClipboardList size={24} />
        <Heading size="lg">Event Applications</Heading>
        <Spacer />
        {canManageEvents && (
          <NextLink href="/events/manage" passHref>
            <Button size="sm" variant="outline" px={4}>
              <LuSettings /> Manage events
            </Button>
          </NextLink>
        )}
        <IconButton
          aria-label="Refresh"
          variant="outline"
          size="sm"
          onClick={() => fetchQueue()}
        >
          <LuRefreshCw />
        </IconButton>
      </HStack>

      {/* Dashboard cards */}
      <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap={3} mb={6}>
        {stats
          ? statCards.map((c) => (
              <Card.Root
                key={c.key}
                bg={surfaceBg}
                borderWidth={1}
                borderColor={borderColor}
              >
                <Card.Body p={4}>
                  <Text
                    fontSize="xs"
                    color={subduedText}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    {c.label}
                  </Text>
                  <Heading size="2xl" mt={1}>
                    {c.value}
                  </Heading>
                </Card.Body>
              </Card.Root>
            ))
          : Array.from({ length: 6 }).map((_, i) => (
              <Card.Root
                key={`stat-skel-${i}`}
                bg={surfaceBg}
                borderWidth={1}
                borderColor={borderColor}
              >
                <Card.Body p={4}>
                  <Skeleton height="12px" mb={2} />
                  <Skeleton height="24px" width="40px" />
                </Card.Body>
              </Card.Root>
            ))}
      </SimpleGrid>

      {/* Filters */}
      <Card.Root bg={surfaceBg} borderWidth={1} borderColor={borderColor} mb={5}>
        <Card.Body>
          <Stack direction={{ base: "column", md: "row" }} gap={3} align="stretch">
            <Box position="relative" flex={1}>
              <Box position="absolute" top="50%" left={3} transform="translateY(-50%)" color={subduedText}>
                <LuSearch size={16} />
              </Box>
              <Input
                pl={9}
                pr={4}
                placeholder="Search by reference number or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>
            <Select
              value={eventId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEventId(e.target.value)}
              borderWidth={1}
              borderColor={borderColor}
              borderRadius="md"
              px={4}
              py={2}
              fontSize="sm"
              bg={surfaceBg}
              minW="200px"
            >
              <option value="">All Events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Stack>

          {/* Status pills */}
          <HStack mt={4} gap={2} wrap="wrap">
            {QUICK_FILTERS.map((f) => {
              const active = status === f.value;
              return (
                <Button
                  key={f.label}
                  size="xs"
                  px={4}
                  variant={active ? "solid" : "outline"}
                  colorPalette={active ? "brand" : "gray"}
                  onClick={() => setStatus(f.value)}
                >
                  {f.label}
                </Button>
              );
            })}
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Queue */}
      <Card.Root bg={surfaceBg} borderWidth={1} borderColor={borderColor}>
        <Card.Body p={0}>
          {isLoading && !page ? (
            <VStack p={4} gap={3} align="stretch">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height="56px" borderRadius="md" />
              ))}
            </VStack>
          ) : page?.data.length === 0 ? (
            <Box p={8} textAlign="center">
              <Text fontSize="sm" color={subduedText}>
                No applications match the current filters.
              </Text>
            </Box>
          ) : (
            <VStack align="stretch" gap={0}>
              {page?.data.map((app) => (
                <NextLink
                  key={app.id}
                  href={`/events/applications/${app.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <Flex
                    px={4}
                    py={3}
                    align="center"
                    gap={4}
                    borderBottomWidth={1}
                    borderBottomColor={borderColor}
                    cursor="pointer"
                    _hover={{ bg: rowHoverBg }}
                  >
                    <Box w="110px" flexShrink={0}>
                      <StatusBadge status={app.status} />
                    </Box>
                    <Box flex={1} minW={0}>
                      <Text fontWeight={600}>
                        {(app.first_name ?? "Unknown") + " " + (app.last_name ?? "")}
                      </Text>
                      <Text fontSize="sm" color={subduedText} truncate>
                        {app.email ?? "—"} · {app.event?.name ?? "—"}
                      </Text>
                    </Box>
                    <Box display={{ base: "none", md: "block" }}>
                      <Text fontSize="xs" color={subduedText}>
                        {app.reference_number}
                      </Text>
                      <Text fontSize="xs" color={subduedText}>
                        {app.submitted_at
                          ? new Date(app.submitted_at).toLocaleDateString()
                          : "—"}
                      </Text>
                    </Box>
                  </Flex>
                </NextLink>
              ))}
            </VStack>
          )}

          {/* Pagination */}
          {page && page.meta.last_page > 1 && (
            <Flex p={3} align="center" gap={2} borderTopWidth={1} borderTopColor={borderColor}>
              <Text fontSize="xs" color={subduedText}>
                Page {page.meta.current_page} of {page.meta.last_page} · {page.meta.total} total
              </Text>
              <Spacer />
              <IconButton
                aria-label="Previous page"
                size="xs"
                variant="outline"
                disabled={page.meta.current_page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <LuChevronLeft />
              </IconButton>
              <IconButton
                aria-label="Next page"
                size="xs"
                variant="outline"
                disabled={page.meta.current_page >= page.meta.last_page}
                onClick={() => setCurrentPage((p) => Math.min(page.meta.last_page, p + 1))}
              >
                <LuChevronRight />
              </IconButton>
            </Flex>
          )}
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
