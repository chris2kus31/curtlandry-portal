"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Heading,
  HStack,
  Text,
  VStack,
  Card,
  Skeleton,
  Input,
  Flex,
  Stack,
  Spacer,
  IconButton,
  Badge,
  chakra,
} from "@chakra-ui/react";
import {
  LuMail,
  LuRefreshCw,
  LuSearch,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminEventSummary,
  type PaginatedResponse,
} from "@/lib/api/admin-applications-service";
import {
  adminEventInterestService,
  type EventInterestSummary,
} from "@/lib/api/admin-event-interest-service";

const Select = chakra("select");

/**
 * Event-interest queue — read-only browsing surface for the
 * "Prefer to stay informed?" form on the public sites.
 *
 *  - Polls /events to populate the event filter dropdown.
 *  - Debounces the search input so we don't spam the blind-index lookup
 *    on every keystroke.
 *  - Pagination + filter state lives in local state; reloading starts fresh.
 */
export default function EventInterestPage() {
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [page, setPage] = useState<PaginatedResponse<EventInterestSummary> | null>(
    null,
  );

  const [eventId, setEventId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setLoading] = useState(true);

  const surfaceBg = useColorModeValue("white", "gray.900");
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const rowHoverBg = useColorModeValue("gray.50", "gray.800");

  // Bootstrap: events list for the filter dropdown.
  useEffect(() => {
    (async () => {
      try {
        const eventsList = await adminApplicationsService.listEvents();
        setEvents(eventsList);
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

  // Reset to page 1 whenever a filter changes — the previous page index
  // may be out of range under the new filter set.
  useEffect(() => {
    setCurrentPage(1);
  }, [eventId, debouncedSearch]);

  const fetchInterest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminEventInterestService.listEventInterest({
        event_id: eventId || undefined,
        search: debouncedSearch || undefined,
        page: currentPage,
        per_page: 25,
      });
      setPage(res);
    } catch (err) {
      console.error(err);
      toaster.error({ title: "Failed to load interest signups." });
    } finally {
      setLoading(false);
    }
  }, [eventId, debouncedSearch, currentPage]);

  useEffect(() => {
    fetchInterest();
  }, [fetchInterest]);

  return (
    <Box p={{ base: 4, md: 8 }}>
      <HStack mb={6} gap={3}>
        <LuMail size={24} />
        <Heading size="lg">Interest Signups</Heading>
        <Spacer />
        <IconButton
          aria-label="Refresh"
          variant="outline"
          size="sm"
          onClick={() => fetchInterest()}
        >
          <LuRefreshCw />
        </IconButton>
      </HStack>

      {/* Filters */}
      <Card.Root bg={surfaceBg} borderWidth={1} borderColor={borderColor} mb={5}>
        <Card.Body>
          <Stack direction={{ base: "column", md: "row" }} gap={3} align="stretch">
            <Box position="relative" flex={1}>
              <Box
                position="absolute"
                top="50%"
                left={3}
                transform="translateY(-50%)"
                color={subduedText}
              >
                <LuSearch size={16} />
              </Box>
              <Input
                pl={9}
                pr={4}
                placeholder="Search by exact email address…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>
            <Select
              value={eventId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setEventId(e.target.value)
              }
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
                No interest signups yet. People who submit the &ldquo;Prefer
                to stay informed?&rdquo; form will appear here.
              </Text>
            </Box>
          ) : (
            <VStack align="stretch" gap={0}>
              {/* Header row — matches the spacing of the data rows below. */}
              <Flex
                px={4}
                py={2}
                align="center"
                gap={4}
                borderBottomWidth={1}
                borderBottomColor={borderColor}
                bg={rowHoverBg}
                display={{ base: "none", md: "flex" }}
              >
                <Box w="140px" flexShrink={0}>
                  <Text fontSize="xs" color={subduedText} textTransform="uppercase" letterSpacing="wide">
                    Date
                  </Text>
                </Box>
                <Box w="180px" flexShrink={0}>
                  <Text fontSize="xs" color={subduedText} textTransform="uppercase" letterSpacing="wide">
                    Event
                  </Text>
                </Box>
                <Box flex={1} minW={0}>
                  <Text fontSize="xs" color={subduedText} textTransform="uppercase" letterSpacing="wide">
                    Email
                  </Text>
                </Box>
                <Box w="140px" flexShrink={0}>
                  <Text fontSize="xs" color={subduedText} textTransform="uppercase" letterSpacing="wide">
                    Source
                  </Text>
                </Box>
                <Box w="120px" flexShrink={0}>
                  <Text fontSize="xs" color={subduedText} textTransform="uppercase" letterSpacing="wide">
                    IP Address
                  </Text>
                </Box>
              </Flex>

              {page?.data.map((row) => (
                <Flex
                  key={row.id}
                  px={4}
                  py={3}
                  align="center"
                  gap={4}
                  borderBottomWidth={1}
                  borderBottomColor={borderColor}
                  _hover={{ bg: rowHoverBg }}
                  direction={{ base: "column", md: "row" }}
                  alignItems={{ base: "stretch", md: "center" }}
                >
                  <Box w={{ base: "auto", md: "140px" }} flexShrink={0}>
                    <Text fontSize="sm">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </Text>
                  </Box>
                  <Box w={{ base: "auto", md: "180px" }} flexShrink={0}>
                    {row.event_name ? (
                      <Badge
                        colorPalette="blue"
                        variant="subtle"
                        size="sm"
                        textTransform="none"
                        fontWeight={600}
                        px={3}
                      >
                        {row.event_name}
                      </Badge>
                    ) : (
                      <Text fontSize="sm" color={subduedText}>
                        —
                      </Text>
                    )}
                  </Box>
                  <Box flex={1} minW={0}>
                    <Text fontSize="sm" fontWeight={500} truncate>
                      {row.email ?? "—"}
                    </Text>
                  </Box>
                  <Box w={{ base: "auto", md: "140px" }} flexShrink={0}>
                    <Text fontSize="sm" color={subduedText} truncate>
                      {row.source ?? "—"}
                    </Text>
                  </Box>
                  <Box w={{ base: "auto", md: "120px" }} flexShrink={0}>
                    <Text fontSize="xs" color={subduedText} fontFamily="mono">
                      {row.ip_address ?? "—"}
                    </Text>
                  </Box>
                </Flex>
              ))}
            </VStack>
          )}

          {/* Pagination */}
          {page && page.meta.last_page > 1 && (
            <Flex
              p={3}
              align="center"
              gap={2}
              borderTopWidth={1}
              borderTopColor={borderColor}
            >
              <Text fontSize="xs" color={subduedText}>
                Page {page.meta.current_page} of {page.meta.last_page} ·{" "}
                {page.meta.total} total
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(page.meta.last_page, p + 1))
                }
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
