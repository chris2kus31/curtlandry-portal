"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  Heading,
  HStack,
  Text,
  VStack,
  Textarea,
  Flex,
  Skeleton,
  Badge,
  Input,
  SimpleGrid,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuCalendarPlus,
  LuChevronDown,
  LuCircleCheck,
  LuCircleDashed,
  LuCircleX,
  LuSend,
} from "react-icons/lu";
import {
  timeOffService,
  type TimeOffBalance,
  type TimeOffRequest,
  type TimeOffType,
} from "@/lib/api";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { TimeOffCalendar } from "@/components/calendar";
import {
  getTimeOffViewPreference,
  setTimeOffViewPreference,
} from "@/lib/time-off-view-preference";

function hoursToDays(hours: number): number {
  return Math.max(0, Math.floor(hours / 8));
}

function formatDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusPlain(status: string): { label: string; color: string } {
  switch (status) {
    case "approved":
      return { label: "Approved", color: "green" };
    case "pending":
      return { label: "Waiting for approval", color: "orange" };
    case "denied":
      return { label: "Not approved", color: "red" };
    case "cancelled":
      return { label: "Cancelled", color: "gray" };
    default:
      return { label: status, color: "gray" };
  }
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <LuCircleCheck size={22} />;
  if (status === "pending") return <LuCircleDashed size={22} />;
  return <LuCircleX size={22} />;
}

/**
 * Default Time Off experience — clearer language and larger type.
 * Classic multi-tab UI remains at /time-off/classic.
 */
export default function TimeOffPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const [types, setTypes] = useState<TimeOffType[]>([]);
  const [balances, setBalances] = useState<TimeOffBalance[]>([]);
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [requestType, setRequestType] = useState<"full" | "partial">("full");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [notes, setNotes] = useState("");

  const pageBg = useColorModeValue("gray.50", "gray.950");
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const softBg = useColorModeValue("brand.50", "whiteAlpha.100");
  const typeIdleBg = useColorModeValue("gray.50", "gray.800");

  // Honor saved view preference when opening Time Off from the sidebar.
  useEffect(() => {
    if (getTimeOffViewPreference() === "classic") {
      router.replace("/time-off/classic");
      return;
    }
    setTimeOffViewPreference("simple");
    setReady(true);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typesData, balancesData, requestsData] = await Promise.all([
        timeOffService.getTypes().catch(() => []),
        timeOffService.getBalances().catch(() => []),
        timeOffService
          .getRequests({ per_page: 50 })
          .catch(() => ({ data: [] as TimeOffRequest[] })),
      ]);
      setTypes(typesData);
      setBalances(balancesData);
      setRequests(requestsData.data ?? []);
      const pto = typesData.find((t) => t.code.toUpperCase() === "PTO");
      if (pto) setSelectedTypeId(pto.id);
      else if (typesData[0]) setSelectedTypeId(typesData[0].id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, load]);

  const ptoBalance = useMemo(
    () => balances.find((b) => b.type.code.toUpperCase() === "PTO"),
    [balances],
  );

  const daysAvailable = ptoBalance ? hoursToDays(ptoBalance.available) : 0;
  const daysUsed = ptoBalance ? hoursToDays(ptoBalance.used) : 0;
  const daysPending = ptoBalance ? hoursToDays(ptoBalance.pending) : 0;

  const selectedType =
    types.find((t) => t.id === selectedTypeId) ?? types[0] ?? null;

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }, [startDate, endDate]);

  const partialHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diffMinutes = endMinutes - startMinutes;
    return diffMinutes > 0 ? Math.round((diffMinutes / 60) * 100) / 100 : 0;
  }, [startTime, endTime]);

  const totalHours = useMemo(
    () => (requestType === "partial" ? partialHours : totalDays * 8),
    [requestType, partialHours, totalDays],
  );

  const canSubmit =
    !!selectedType &&
    !submitting &&
    (requestType === "full"
      ? !!startDate && !!endDate && totalDays > 0
      : !!startDate && partialHours > 0 && partialHours <= 8);

  const handleSubmit = async () => {
    if (!canSubmit || !selectedType || !startDate) return;
    setSubmitting(true);
    try {
      const toIso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const effectiveEnd = requestType === "partial" ? startDate : endDate;
      if (!effectiveEnd) return;

      await timeOffService.createRequest({
        time_off_type_id: selectedType.id,
        start_date: toIso(startDate),
        end_date: toIso(effectiveEnd),
        total_hours: totalHours,
        notes: notes.trim() || undefined,
        submit: true,
        ...(requestType === "partial"
          ? { start_time: startTime, end_time: endTime }
          : {}),
      });

      toaster.create({
        title: "Request sent",
        description: "Your manager will review it.",
        type: "success",
      });
      setShowForm(false);
      setRequestType("full");
      setStartDate(null);
      setEndDate(null);
      setStartTime("09:00");
      setEndTime("13:00");
      setNotes("");
      await load();
    } catch (error) {
      toaster.create({
        title: "Could not send request",
        description: error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const upcoming = requests.filter(
    (r) =>
      (r.status === "pending" || r.status === "approved") &&
      r.start_date >= new Date().toISOString().slice(0, 10),
  );
  const past = requests.filter(
    (r) =>
      !(
        (r.status === "pending" || r.status === "approved") &&
        r.start_date >= new Date().toISOString().slice(0, 10)
      ),
  );

  if (!ready) {
    return (
      <Box bg={pageBg} minH="100%" px={6} py={10}>
        <Skeleton height="220px" borderRadius="2xl" maxW="720px" mx="auto" />
      </Box>
    );
  }

  return (
    <Box bg={pageBg} minH="100%" mx={{ base: -4, md: -6 }} px={{ base: 4, md: 6 }} py={6}>
      <VStack align="stretch" gap={10} maxW="1100px" mx="auto">
        <VStack align="stretch" gap={8} maxW="720px" w="full" mx="auto">
        {/* Nav */}
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <Text fontSize="md" color={textSecondary}>
            Paid time off, sick leave, and other days away from work.
          </Text>
          <Box
            as="button"
            onClick={() => {
              setTimeOffViewPreference("classic");
              router.push("/time-off/classic");
            }}
            fontSize="sm"
            fontWeight="medium"
            color={textSecondary}
            textDecoration="underline"
            textUnderlineOffset="3px"
            _hover={{ color: textPrimary }}
          >
            Classic view
          </Box>
        </HStack>

        {/* Title */}
        <Box>
          <Heading
            as="h1"
            fontSize={{ base: "3xl", md: "4xl" }}
            color={textPrimary}
            fontWeight="bold"
            lineHeight="1.15"
          >
            Your time off
          </Heading>
          <Text fontSize="lg" color={textSecondary} mt={2}>
            See how many days you have, then request time away.
          </Text>
        </Box>

        {/* Big balance */}
        {loading ? (
          <Skeleton height="220px" borderRadius="2xl" />
        ) : (
          <Card.Root
            bg={cardBg}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="2xl"
            overflow="hidden"
          >
            <Box bg={softBg} px={6} py={8} textAlign="center">
              <Text fontSize="lg" color={textSecondary} mb={2}>
                Days you can take
              </Text>
              <Text
                fontSize={{ base: "6xl", md: "7xl" }}
                fontWeight="bold"
                color="brand.500"
                lineHeight="1"
              >
                {daysAvailable}
              </Text>
              <Text fontSize="xl" color={textPrimary} mt={3} fontWeight="medium">
                {daysAvailable === 1 ? "day" : "days"} available
              </Text>
              {ptoBalance && (
                <Text fontSize="md" color={textSecondary} mt={2}>
                  That&apos;s about {ptoBalance.available} hours of paid time off
                </Text>
              )}
            </Box>
            <Card.Body px={6} py={5}>
              <HStack
                justify="space-around"
                gap={4}
                flexWrap="wrap"
                textAlign="center"
              >
                <Box>
                  <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                    {daysUsed}
                  </Text>
                  <Text fontSize="md" color={textSecondary}>
                    Days already used
                  </Text>
                </Box>
                <Box w="1px" h="40px" bg={borderColor} display={{ base: "none", sm: "block" }} />
                <Box>
                  <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                    {daysPending}
                  </Text>
                  <Text fontSize="md" color={textSecondary}>
                    Days waiting for approval
                  </Text>
                </Box>
              </HStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Primary action */}
        {!showForm ? (
          <Box
            as="button"
            onClick={() => setShowForm(true)}
            w="full"
            py={5}
            px={6}
            borderRadius="2xl"
            bg="brand.500"
            color="white"
            fontSize="xl"
            fontWeight="bold"
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={3}
            _hover={{ bg: "brand.600" }}
            transition="background 0.15s"
          >
            <LuCalendarPlus size={24} />
            Request time off
          </Box>
        ) : (
          <Card.Root
            bg={cardBg}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="2xl"
          >
            <Card.Body p={{ base: 5, md: 7 }}>
              <VStack align="stretch" gap={6}>
                <Heading as="h2" fontSize="2xl" color={textPrimary}>
                  Request time off
                </Heading>

                <Box>
                  <Text fontSize="lg" fontWeight="semibold" color={textPrimary} mb={3}>
                    What kind of time off?
                  </Text>
                  <VStack align="stretch" gap={3}>
                    {types.map((type) => {
                      const selected = selectedTypeId === type.id;
                      return (
                        <Box
                          key={type.id}
                          as="button"
                          type="button"
                          onClick={() => setSelectedTypeId(type.id)}
                          textAlign="left"
                          p={4}
                          borderRadius="xl"
                          border="2px solid"
                          borderColor={selected ? "brand.500" : borderColor}
                          bg={selected ? softBg : typeIdleBg}
                          _hover={{ borderColor: "brand.400" }}
                        >
                          <Text fontSize="lg" fontWeight="semibold" color={textPrimary}>
                            {type.name}
                          </Text>
                          {type.description && (
                            <Text fontSize="md" color={textSecondary} mt={1}>
                              {type.description}
                            </Text>
                          )}
                        </Box>
                      );
                    })}
                  </VStack>
                </Box>

                <Box>
                  <Text fontSize="lg" fontWeight="semibold" color={textPrimary} mb={3}>
                    Full day or part of a day?
                  </Text>
                  <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                    <Box
                      as="button"
                      type="button"
                      onClick={() => setRequestType("full")}
                      textAlign="left"
                      p={4}
                      borderRadius="xl"
                      border="2px solid"
                      borderColor={requestType === "full" ? "brand.500" : borderColor}
                      bg={requestType === "full" ? softBg : typeIdleBg}
                      _hover={{ borderColor: "brand.400" }}
                    >
                      <Text fontSize="lg" fontWeight="semibold" color={textPrimary}>
                        Full day(s)
                      </Text>
                      <Text fontSize="md" color={textSecondary} mt={1}>
                        Take one or more whole workdays off
                      </Text>
                    </Box>
                    <Box
                      as="button"
                      type="button"
                      onClick={() => {
                        setRequestType("partial");
                        if (startDate) setEndDate(startDate);
                      }}
                      textAlign="left"
                      p={4}
                      borderRadius="xl"
                      border="2px solid"
                      borderColor={
                        requestType === "partial" ? "brand.500" : borderColor
                      }
                      bg={requestType === "partial" ? softBg : typeIdleBg}
                      _hover={{ borderColor: "brand.400" }}
                    >
                      <Text fontSize="lg" fontWeight="semibold" color={textPrimary}>
                        Part of a day
                      </Text>
                      <Text fontSize="md" color={textSecondary} mt={1}>
                        Take a half day or a few hours
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Box>

                <Box>
                  <Text fontSize="lg" fontWeight="semibold" color={textPrimary} mb={3}>
                    {requestType === "full" ? "Which days?" : "Which day?"}
                  </Text>
                  {requestType === "full" ? (
                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onStartDateChange={setStartDate}
                      onEndDateChange={setEndDate}
                      showDuration
                    />
                  ) : (
                    <VStack align="stretch" gap={4}>
                      <DateRangePicker
                        startDate={startDate}
                        endDate={startDate}
                        onStartDateChange={(date) => {
                          setStartDate(date);
                          setEndDate(date);
                        }}
                        onEndDateChange={() => {}}
                        singleDate
                      />
                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                        <Box>
                          <Text
                            fontSize="md"
                            fontWeight="semibold"
                            color={textPrimary}
                            mb={2}
                          >
                            Start time
                          </Text>
                          <Input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            fontSize="lg"
                            borderRadius="xl"
                            border="1px solid"
                            borderColor={borderColor}
                            bg={typeIdleBg}
                            px={4}
                            py={3}
                            h="auto"
                            _focus={{ borderColor: "brand.500" }}
                          />
                        </Box>
                        <Box>
                          <Text
                            fontSize="md"
                            fontWeight="semibold"
                            color={textPrimary}
                            mb={2}
                          >
                            End time
                          </Text>
                          <Input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            fontSize="lg"
                            borderRadius="xl"
                            border="1px solid"
                            borderColor={borderColor}
                            bg={typeIdleBg}
                            px={4}
                            py={3}
                            h="auto"
                            _focus={{ borderColor: "brand.500" }}
                          />
                        </Box>
                      </SimpleGrid>
                    </VStack>
                  )}
                  {requestType === "full" && totalDays > 0 && (
                    <Text fontSize="lg" color={textPrimary} mt={3} fontWeight="medium">
                      You are requesting{" "}
                      <Text as="span" color="brand.500" fontWeight="bold">
                        {totalDays} {totalDays === 1 ? "workday" : "workdays"}
                      </Text>
                      {" "}({totalHours} hours)
                    </Text>
                  )}
                  {requestType === "partial" && partialHours > 0 && partialHours <= 8 && (
                    <Text fontSize="lg" color={textPrimary} mt={3} fontWeight="medium">
                      You are requesting{" "}
                      <Text as="span" color="brand.500" fontWeight="bold">
                        {partialHours} {partialHours === 1 ? "hour" : "hours"}
                      </Text>
                      {" "}on that day
                    </Text>
                  )}
                  {requestType === "partial" && partialHours > 8 && (
                    <Text fontSize="md" color="red.500" mt={3}>
                      Part of a day can be at most 8 hours. For a full day, choose
                      “Full day(s)” instead.
                    </Text>
                  )}
                  {requestType === "partial" &&
                    startTime &&
                    endTime &&
                    partialHours <= 0 && (
                      <Text fontSize="md" color="red.500" mt={3}>
                        End time must be after start time.
                      </Text>
                    )}
                </Box>

                <Box>
                  <Text fontSize="lg" fontWeight="semibold" color={textPrimary} mb={2}>
                    Note for your manager (optional)
                  </Text>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Example: Family trip"
                    rows={3}
                    fontSize="lg"
                    borderRadius="xl"
                    borderColor={borderColor}
                    bg={typeIdleBg}
                    px={4}
                    py={3}
                    _focus={{ borderColor: "brand.500" }}
                  />
                </Box>

                <HStack gap={3} flexWrap="wrap">
                  <Box
                    as="button"
                    flex="1"
                    minW="140px"
                    py={4}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={borderColor}
                    fontSize="lg"
                    fontWeight="semibold"
                    color={textPrimary}
                    onClick={() => {
                      setShowForm(false);
                      setRequestType("full");
                      setStartDate(null);
                      setEndDate(null);
                      setStartTime("09:00");
                      setEndTime("13:00");
                      setNotes("");
                    }}
                    _hover={{ bg: typeIdleBg }}
                  >
                    Cancel
                  </Box>
                  <Box
                    as="button"
                    flex="1"
                    minW="180px"
                    py={4}
                    borderRadius="xl"
                    bg={canSubmit ? "brand.500" : "gray.300"}
                    color="white"
                    fontSize="lg"
                    fontWeight="bold"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    gap={2}
                    cursor={canSubmit ? "pointer" : "not-allowed"}
                    onClick={canSubmit ? handleSubmit : undefined}
                    _hover={canSubmit ? { bg: "brand.600" } : undefined}
                  >
                    <LuSend size={20} />
                    {submitting ? "Sending…" : "Send request"}
                  </Box>
                </HStack>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Requests */}
        <Box>
          <Heading as="h2" fontSize="2xl" color={textPrimary} mb={4}>
            Your requests
          </Heading>

          {loading ? (
            <VStack gap={3} align="stretch">
              <Skeleton height="88px" borderRadius="xl" />
              <Skeleton height="88px" borderRadius="xl" />
            </VStack>
          ) : requests.length === 0 ? (
            <Card.Root bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
              <Card.Body p={6}>
                <Text fontSize="lg" color={textSecondary}>
                  You have not requested any time off yet.
                </Text>
              </Card.Body>
            </Card.Root>
          ) : (
            <VStack align="stretch" gap={6}>
              {upcoming.length > 0 && (
                <Box>
                  <Text fontSize="lg" fontWeight="semibold" color={textSecondary} mb={3}>
                    Coming up
                  </Text>
                  <VStack align="stretch" gap={3}>
                    {upcoming.map((req) => (
                      <RequestRow
                        key={req.id}
                        request={req}
                        borderColor={borderColor}
                        cardBg={cardBg}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        softBg={softBg}
                      />
                    ))}
                  </VStack>
                </Box>
              )}
              {past.length > 0 && (
                <Box>
                  <Text fontSize="lg" fontWeight="semibold" color={textSecondary} mb={3}>
                    Earlier requests
                  </Text>
                  <Text fontSize="md" color={textSecondary} mb={3}>
                    Tap a request to see why it was approved or denied.
                  </Text>
                  <VStack align="stretch" gap={3}>
                    {past.map((req) => (
                      <RequestRow
                        key={req.id}
                        request={req}
                        borderColor={borderColor}
                        cardBg={cardBg}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        softBg={softBg}
                      />
                    ))}
                  </VStack>
                </Box>
              )}
            </VStack>
          )}
        </Box>
        </VStack>

        {/* Company calendar */}
        <Box>
          <Heading as="h2" fontSize="2xl" color={textPrimary} mb={2}>
            Company time off
          </Heading>
          <Text fontSize="lg" color={textSecondary} mb={4}>
            See who else is out so you can plan around the team.
          </Text>
          <TimeOffCalendar title="Company Time Off" />
        </Box>
      </VStack>
    </Box>
  );
}

function RequestRow({
  request,
  borderColor,
  cardBg,
  textPrimary,
  textSecondary,
  softBg,
}: {
  request: TimeOffRequest;
  borderColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  softBg: string;
}) {
  const [open, setOpen] = useState(false);
  const status = statusPlain(request.status);
  const days = hoursToDays(request.total_hours);

  const reviewer =
    request.reviewed_by?.name ||
    request.approver?.name ||
    request.cancelled_by?.name ||
    null;
  const decisionNote = request.review_notes || request.cancellation_reason || null;
  const decidedAt =
    request.reviewed_at || request.approved_at || request.cancelled_at || null;

  const decisionHeadline =
    request.status === "approved"
      ? "Why it was approved"
      : request.status === "denied"
        ? "Why it was not approved"
        : request.status === "cancelled"
          ? "Cancellation details"
          : request.status === "pending"
            ? "Status details"
            : "Request details";

  return (
    <Box
      borderRadius="xl"
      border="1px solid"
      borderColor={open ? "brand.400" : borderColor}
      bg={cardBg}
      overflow="hidden"
      transition="border-color 0.15s"
    >
      <Flex
        as="button"
        type="button"
        w="full"
        textAlign="left"
        align={{ base: "flex-start", sm: "center" }}
        direction={{ base: "column", sm: "row" }}
        gap={4}
        p={5}
        cursor="pointer"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        _hover={{ bg: softBg }}
      >
        <Box color={`${status.color}.500`} flexShrink={0} mt={0.5}>
          <StatusIcon status={request.status} />
        </Box>
        <Box flex={1} minW={0}>
          <Text fontSize="lg" fontWeight="semibold" color={textPrimary}>
            {request.type.name}
          </Text>
          <Text fontSize="md" color={textSecondary} mt={1}>
            {formatDate(request.start_date)}
            {request.end_date !== request.start_date
              ? ` – ${formatDate(request.end_date)}`
              : ""}
          </Text>
          <Text fontSize="md" color={textSecondary}>
            {days} {days === 1 ? "day" : "days"} ({request.total_hours} hours)
          </Text>
        </Box>
        <HStack gap={2} flexShrink={0} align="center">
          <Badge
            colorPalette={status.color}
            fontSize="md"
            px={3}
            py={1.5}
            borderRadius="lg"
            whiteSpace="normal"
            textAlign="center"
          >
            {status.label}
          </Badge>
          <Box
            color={textSecondary}
            transform={open ? "rotate(180deg)" : "rotate(0deg)"}
            transition="transform 0.15s"
          >
            <LuChevronDown size={22} />
          </Box>
        </HStack>
      </Flex>

      {open && (
        <Box
          px={5}
          pb={5}
          pt={0}
          borderTop="1px solid"
          borderColor={borderColor}
          bg={softBg}
        >
          <VStack align="stretch" gap={4} pt={4}>
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color={textSecondary} mb={1}>
                {decisionHeadline}
              </Text>
              {decisionNote ? (
                <Text fontSize="lg" color={textPrimary} whiteSpace="pre-wrap">
                  {decisionNote}
                </Text>
              ) : request.status === "pending" ? (
                <Text fontSize="lg" color={textSecondary}>
                  This request is still waiting for a manager to review it.
                </Text>
              ) : request.status === "approved" ? (
                <Text fontSize="lg" color={textSecondary}>
                  Approved
                  {reviewer ? ` by ${reviewer}` : ""}. No extra note was added.
                </Text>
              ) : (
                <Text fontSize="lg" color={textSecondary}>
                  No written reason was saved for this request.
                </Text>
              )}
            </Box>

            {reviewer && (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color={textSecondary} mb={1}>
                  Reviewed by
                </Text>
                <Text fontSize="lg" color={textPrimary}>
                  {reviewer}
                  {decidedAt ? ` · ${formatTimestamp(decidedAt)}` : ""}
                </Text>
              </Box>
            )}

            {request.notes && (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color={textSecondary} mb={1}>
                  Your note
                </Text>
                <Text fontSize="lg" color={textPrimary} whiteSpace="pre-wrap">
                  {request.notes}
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      )}
    </Box>
  );
}
