"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Card,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
  Tabs,
  Badge,
  Skeleton,
  Textarea,
  Progress,
  IconButton,
  SimpleGrid,
  Flex,
  Input,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import {
  LuCalendar,
  LuClock,
  LuFileText,
  LuCircleCheck,
  LuCircleDashed,
  LuCircleX,
  LuSend,
  LuX,
  LuCalendarDays,
  LuTrendingUp,
  LuCalendarPlus,
  LuHistory,
  LuWallet,
  LuRotateCcw,
  LuCalendarClock,
  LuCircleAlert,
  LuChevronDown,
  LuChevronRight,
} from "react-icons/lu";
import {
  timeOffService,
  type TimeOffBalance,
  type TimeOffRequest,
  type TimeOffType,
} from "@/lib/api";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { TimeOffCalendar } from "@/components/calendar";

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusIcon(status: string, size = 16) {
  switch (status) {
    case "approved":
      return <LuCircleCheck size={size} />;
    case "pending":
      return <LuCircleDashed size={size} />;
    case "denied":
    case "cancelled":
      return <LuCircleX size={size} />;
    default:
      return <LuCircleDashed size={size} />;
  }
}

function getStatusStyles(status: string) {
  switch (status) {
    case "approved":
      return {
        bg: "green.500",
        subtle: "green.500/10",
        text: "green.600",
        darkText: "green.400",
      };
    case "pending":
      return {
        bg: "amber.500",
        subtle: "amber.500/10",
        text: "amber.600",
        darkText: "amber.400",
      };
    case "denied":
      return {
        bg: "red.500",
        subtle: "red.500/10",
        text: "red.600",
        darkText: "red.400",
      };
    case "cancelled":
      return {
        bg: "gray.400",
        subtle: "gray.500/10",
        text: "gray.600",
        darkText: "gray.400",
      };
    default:
      return {
        bg: "gray.400",
        subtle: "gray.500/10",
        text: "gray.600",
        darkText: "gray.400",
      };
  }
}

/**
 * Parse a date string (YYYY-MM-DD) as local time to avoid timezone shifts.
 * new Date("2026-01-30") interprets as UTC, causing day shift in local timezone.
 * This function ensures the date is interpreted as local midnight.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateShort(dateStr: string) {
  return parseLocalDate(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return parseLocalDate(startDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`;
}

function getRelativeTime(dateStr: string) {
  const date = parseLocalDate(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  return formatDateShort(dateStr);
}

// ============================================================================
// Request Tab Component
// ============================================================================

function RequestTab({
  types,
  balances,
  isLoading,
  onRequestCreated,
}: {
  types: TimeOffType[];
  balances: TimeOffBalance[];
  isLoading: boolean;
  onRequestCreated: () => void;
}) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestType, setRequestType] = useState<"full" | "partial">("full");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "gray.900");
  const progressTrackBg = useColorModeValue("gray.100", "gray.700");
  const statBg = useColorModeValue("gray.50", "gray.750");
  const summaryBg = useColorModeValue("brand.50", "brand.950");
  const summaryBorder = useColorModeValue("brand.100", "brand.900");
  const inputHoverBorder = useColorModeValue("gray.300", "gray.600");
  const disabledBg = useColorModeValue("gray.100", "gray.800");
  const disabledColor = useColorModeValue("gray.400", "gray.500");
  const accrualInfoBg = useColorModeValue("brand.50", "brand.950");
  const accrualInfoBorder = useColorModeValue("brand.100", "brand.900");
  const amberBorderColor = useColorModeValue("amber.200", "amber.800");
  const trendingColor = useColorModeValue("#00bc8b", "#4ade80");
  const cancelHoverBg = useColorModeValue("red.50", "red.950");
  const partialInputBg = useColorModeValue("white", "gray.800");
  const selectedTypeBg = useColorModeValue("brand.50", "brand.900");
  const selectedTypeColor = useColorModeValue("brand.600", "brand.200");

  // Sort types by sort_order for display
  const sortedTypes = useMemo(
    () => [...types].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [types],
  );

  // Get the default PTO type
  const defaultPtoType = useMemo(
    () => types.find((t) => t.code.toUpperCase() === "PTO"),
    [types],
  );

  // Set default selection to PTO when types load
  useEffect(() => {
    if (defaultPtoType && selectedTypeId === null) {
      setSelectedTypeId(defaultPtoType.id);
    }
  }, [defaultPtoType, selectedTypeId]);

  // Memoize selected type
  const selectedType = useMemo(
    () => types.find((t) => t.id === selectedTypeId) || defaultPtoType || types[0],
    [types, selectedTypeId, defaultPtoType],
  );

  // Check if selected type uses accrual (only PTO does)
  const usesAccrual = selectedType?.uses_accrual ?? false;

  // Check if selected type requires documentation (notes required)
  const requiresNotes = selectedType?.requires_documentation ?? false;

  // Get PTO balance (only relevant for PTO type)
  const ptoBalance = useMemo(
    () => balances.find((b) => b.type.code.toUpperCase() === "PTO"),
    [balances],
  );

  // Memoize business days calculation
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

  // Memoize partial hours calculation
  const partialHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diffMinutes = endMinutes - startMinutes;
    return diffMinutes > 0 ? Math.round((diffMinutes / 60) * 100) / 100 : 0;
  }, [startTime, endTime]);

  // Memoize total hours
  const totalHours = useMemo(
    () => (requestType === "partial" ? partialHours : totalDays * 8),
    [requestType, partialHours, totalDays],
  );

  // Memoize validation
  const { isPartialValid, isFullDayValid, isFormValid, notesError } = useMemo(() => {
    const partialValid =
      requestType === "partial" &&
      startDate &&
      partialHours > 0 &&
      partialHours <= 8;
    const fullDayValid =
      requestType === "full" && startDate && endDate && totalDays > 0;
    const dateValid = partialValid || fullDayValid;
    
    // Check if notes are required but missing
    const notesRequired = requiresNotes && !notes.trim();
    const notesErrorMsg = notesRequired ? "A note explaining the reason is required for this leave type." : null;
    
    return {
      isPartialValid: partialValid,
      isFullDayValid: fullDayValid,
      isFormValid: dateValid && !notesRequired && selectedType !== null,
      notesError: notesErrorMsg,
    };
  }, [requestType, startDate, endDate, partialHours, totalDays, requiresNotes, notes, selectedType]);

  // Format date to YYYY-MM-DD for API (use local date to avoid timezone shift)
  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    setNotes("");
    setRequestType("full");
    setStartTime("09:00");
    setEndTime("17:00");
    setSubmitError(null);
    // Reset to default PTO type
    if (defaultPtoType) {
      setSelectedTypeId(defaultPtoType.id);
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || !isFormValid || !startDate) return;

    // For partial day, end date = start date
    const effectiveEndDate = requestType === "partial" ? startDate : endDate;
    if (!effectiveEndDate) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await timeOffService.createRequest({
        time_off_type_id: selectedType.id,
        start_date: formatDateForApi(startDate),
        end_date: formatDateForApi(effectiveEndDate),
        // Include time for partial day requests
        ...(requestType === "partial" && {
          start_time: startTime,
          end_time: endTime,
        }),
        notes: notes || undefined,
        submit: true,
      });

      toaster.create({
        title: "Request submitted!",
        description: "Your manager will be notified",
        type: "success",
      });

      handleReset();
      onRequestCreated();
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      const errorMessage =
        apiError?.message || "Failed to submit request. Please try again.";
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Grid templateColumns={{ base: "1fr", lg: "1fr 380px" }} gap={6}>
      {/* Left: Request Form */}
      <Card.Root
        bg={cardBg}
        borderRadius="2xl"
        border="1px solid"
        borderColor={borderColor}
        overflow="hidden"
      >
        <Box
          h="3px"
          bgGradient="to-r"
          gradientFrom="brand.500"
          gradientTo="cyan.500"
        />
        <Card.Body p={{ base: 5, md: 6 }}>
          <VStack gap={6} align="stretch">
            {/* Header */}
            <HStack justify="space-between">
              <HStack gap={3}>
                <Flex
                  p={2.5}
                  borderRadius="xl"
                  bgGradient="to-br"
                  gradientFrom="brand.500"
                  gradientTo="cyan.500"
                  align="center"
                  justify="center"
                >
                  <LuCalendarPlus size={22} color="white" />
                </Flex>
                <Box>
                  <Text fontWeight="semibold" color={textPrimary} fontSize="lg">
                    New Request
                  </Text>
                  <Text fontSize="sm" color={textSecondary}>
                    Select your dates below
                  </Text>
                </Box>
              </HStack>
              {(startDate || endDate || notes) && (
                <IconButton
                  aria-label="Reset form"
                  onClick={handleReset}
                  variant="ghost"
                  size="sm"
                  color={textSecondary}
                  _hover={{ color: "red.500", bg: cancelHoverBg }}
                  borderRadius="lg"
                  disabled={isSubmitting}
                >
                  <LuRotateCcw size={18} />
                </IconButton>
              )}
            </HStack>

            {/* Leave Type Selection */}
            <Box>
              <Text
                fontSize="xs"
                color={textSecondary}
                mb={3}
                fontWeight="semibold"
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Leave Type
              </Text>
              <Box 
                position="relative"
                bg={cardBg}
                borderRadius="lg"
                border="2px solid"
                borderColor={borderColor}
                _hover={{ borderColor: inputHoverBorder }}
                _focusWithin={{ borderColor: "brand.500", boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)" }}
              >
                <select
                  value={selectedTypeId || ""}
                  onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="leave-type-select"
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 12px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "transparent",
                    color: "inherit",
                    fontWeight: 500,
                    fontSize: "14px",
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                    outline: "none",
                  }}
                >
                  {sortedTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <Box
                  position="absolute"
                  right={3}
                  top="50%"
                  transform="translateY(-50%)"
                  pointerEvents="none"
                  color={textSecondary}
                >
                  <LuChevronDown size={18} />
                </Box>
              </Box>
              {selectedType && !usesAccrual && (
                <Text fontSize="xs" color={textSecondary} mt={2}>
                  {selectedType.description}
                </Text>
              )}
            </Box>

            {/* Request Type Selection (Full Day / Partial) */}
            <Box>
              <Text
                fontSize="xs"
                color={textSecondary}
                mb={3}
                fontWeight="semibold"
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Duration Type
              </Text>
              <HStack gap={2}>
                <Box
                  onClick={() => {
                    setRequestType("full");
                  }}
                  px={4}
                  py={2.5}
                  borderRadius="lg"
                  border="2px solid"
                  borderColor={
                    requestType === "full" ? "brand.500" : borderColor
                  }
                  bg={requestType === "full" ? selectedTypeBg : "transparent"}
                  color={
                    requestType === "full" ? selectedTypeColor : textSecondary
                  }
                  fontWeight="medium"
                  fontSize="sm"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ borderColor: "brand.400" }}
                  display="flex"
                  alignItems="center"
                  gap={2}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setRequestType("full");
                    }
                  }}
                >
                  <LuCalendarDays size={16} />
                  Full Day(s)
                </Box>
                <Box
                  onClick={() => {
                    setRequestType("partial");
                    setEndDate(null);
                  }}
                  px={4}
                  py={2.5}
                  borderRadius="lg"
                  border="2px solid"
                  borderColor={
                    requestType === "partial" ? "brand.500" : borderColor
                  }
                  bg={
                    requestType === "partial" ? selectedTypeBg : "transparent"
                  }
                  color={
                    requestType === "partial"
                      ? selectedTypeColor
                      : textSecondary
                  }
                  fontWeight="medium"
                  fontSize="sm"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ borderColor: "brand.400" }}
                  display="flex"
                  alignItems="center"
                  gap={2}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setRequestType("partial");
                      setEndDate(null);
                    }
                  }}
                >
                  <LuCalendarClock size={16} />
                  Partial Day
                </Box>
              </HStack>
            </Box>

            {/* Date Selection */}
            <Box p={{ base: 4, md: 5 }} bg={inputBg} borderRadius="xl">
              {requestType === "full" ? (
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  minDate={new Date()}
                  disabled={isSubmitting}
                />
              ) : (
                <VStack gap={4} align="stretch">
                  <Box>
                    <Text
                      fontSize="xs"
                      color={textSecondary}
                      mb={2}
                      fontWeight="medium"
                    >
                      Date
                    </Text>
                    <DateRangePicker
                      startDate={startDate}
                      endDate={startDate}
                      onStartDateChange={(date) => {
                        setStartDate(date);
                        setEndDate(date);
                      }}
                      onEndDateChange={() => {}}
                      minDate={new Date()}
                      disabled={isSubmitting}
                      singleDate
                    />
                  </Box>
                  <HStack gap={4}>
                    <Box flex={1}>
                      <Text
                        fontSize="xs"
                        color={textSecondary}
                        mb={2}
                        fontWeight="medium"
                      >
                        Start Time
                      </Text>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        bg={partialInputBg}
                        border="1px solid"
                        borderColor={borderColor}
                        borderRadius="xl"
                        _focus={{
                          borderColor: "brand.500",
                          boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
                        }}
                        _hover={{ borderColor: inputHoverBorder }}
                        px={4}
                        py={3}
                        h="auto"
                        disabled={isSubmitting}
                      />
                    </Box>
                    <Box flex={1}>
                      <Text
                        fontSize="xs"
                        color={textSecondary}
                        mb={2}
                        fontWeight="medium"
                      >
                        End Time
                      </Text>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        bg={partialInputBg}
                        border="1px solid"
                        borderColor={borderColor}
                        borderRadius="xl"
                        _focus={{
                          borderColor: "brand.500",
                          boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
                        }}
                        _hover={{ borderColor: inputHoverBorder }}
                        px={4}
                        py={3}
                        h="auto"
                        disabled={isSubmitting}
                      />
                    </Box>
                  </HStack>
                  {partialHours > 0 && (
                    <Box
                      p={3}
                      bg={summaryBg}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={summaryBorder}
                    >
                      <HStack justify="space-between">
                        <Text fontSize="sm" color={textSecondary}>
                          Duration
                        </Text>
                        <Text fontWeight="semibold" color={textPrimary}>
                          {partialHours} hour{partialHours !== 1 ? "s" : ""}
                        </Text>
                      </HStack>
                    </Box>
                  )}
                  {partialHours > 8 && (
                    <Text fontSize="xs" color="red.500">
                      Maximum 8 hours per day. Please adjust your times.
                    </Text>
                  )}
                </VStack>
              )}
            </Box>

            {/* Summary */}
            {isFormValid && (
              <Box
                p={4}
                bg={summaryBg}
                borderRadius="xl"
                border="1px solid"
                borderColor={summaryBorder}
              >
                <VStack gap={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color={textSecondary}>
                      Total Time
                    </Text>
                    <HStack gap={2}>
                      {requestType === "full" && (
                        <Badge
                          colorPalette="brand"
                          variant="subtle"
                          px={2}
                          py={1}
                          borderRadius="md"
                        >
                          {totalDays} day{totalDays !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      <Badge
                        colorPalette="gray"
                        variant="subtle"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        {totalHours} hour{totalHours !== 1 ? "s" : ""}
                      </Badge>
                    </HStack>
                  </HStack>
                  {requestType === "partial" && startTime && endTime && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color={textSecondary}>
                        Time Block
                      </Text>
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color={textPrimary}
                      >
                        {new Date(`2000-01-01T${startTime}`).toLocaleTimeString(
                          "en-US",
                          { hour: "numeric", minute: "2-digit", hour12: true },
                        )}
                        {" - "}
                        {new Date(`2000-01-01T${endTime}`).toLocaleTimeString(
                          "en-US",
                          { hour: "numeric", minute: "2-digit", hour12: true },
                        )}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </Box>
            )}

            {/* Notes */}
            <Box>
              <Text
                fontSize="xs"
                color={textSecondary}
                mb={2}
                fontWeight="semibold"
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Notes{" "}
                <Text as="span" fontWeight="normal" textTransform="none">
                  {requiresNotes ? "(required)" : "(optional)"}
                </Text>
              </Text>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={requiresNotes 
                  ? "Please explain the reason for this leave request..."
                  : "Any details for your manager..."
                }
                bg={inputBg}
                border="1px solid"
                borderColor={notesError ? "red.400" : borderColor}
                borderRadius="xl"
                rows={3}
                resize="none"
                _focus={{
                  borderColor: notesError ? "red.500" : "brand.500",
                  boxShadow: notesError 
                    ? "0 0 0 1px var(--chakra-colors-red-500)"
                    : "0 0 0 1px var(--chakra-colors-brand-500)",
                }}
                _hover={{ borderColor: notesError ? "red.400" : inputHoverBorder }}
                px={4}
                py={3}
              />
              {notesError && (
                <Text fontSize="xs" color="red.500" mt={1}>
                  {notesError}
                </Text>
              )}
            </Box>

            {/* Error Message */}
            {submitError && (
              <Box
                p={4}
                bg="red.50"
                border="1px solid"
                borderColor="red.200"
                borderRadius="xl"
                _dark={{
                  bg: "red.950",
                  borderColor: "red.800",
                }}
              >
                <HStack gap={3} align="start">
                  <Box color="red.500" mt={0.5}>
                    <LuCircleAlert size={20} />
                  </Box>
                  <VStack align="start" gap={1} flex={1}>
                    <Text
                      fontWeight="semibold"
                      color="red.700"
                      _dark={{ color: "red.300" }}
                    >
                      Unable to Submit Request
                    </Text>
                    <Text
                      fontSize="sm"
                      color="red.600"
                      _dark={{ color: "red.400" }}
                    >
                      {submitError}
                    </Text>
                  </VStack>
                  <Box
                    as="button"
                    onClick={() => setSubmitError(null)}
                    color="red.400"
                    _hover={{ color: "red.600" }}
                    p={1}
                  >
                    <LuX size={16} />
                  </Box>
                </HStack>
              </Box>
            )}

            {/* Submit */}
            <Box
              as="button"
              onClick={!isFormValid || isSubmitting ? undefined : handleSubmit}
              aria-disabled={!isFormValid || isSubmitting}
              w="full"
              py={4}
              bgGradient={!isFormValid ? undefined : "to-r"}
              gradientFrom={!isFormValid ? undefined : "brand.500"}
              gradientTo={!isFormValid ? undefined : "cyan.500"}
              bg={!isFormValid ? disabledBg : undefined}
              color={!isFormValid ? disabledColor : "white"}
              fontWeight="semibold"
              borderRadius="xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={2}
              cursor={!isFormValid || isSubmitting ? "not-allowed" : "pointer"}
              opacity={isSubmitting ? 0.7 : 1}
              _hover={{
                opacity: isFormValid && !isSubmitting ? 0.9 : 1,
                transform:
                  isFormValid && !isSubmitting ? "translateY(-1px)" : "none",
              }}
              transition="all 0.2s"
              shadow={isFormValid ? "lg" : "none"}
            >
              <LuSend size={18} />
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Right: Balance Overview */}
      <VStack gap={4} align="stretch">
        {isLoading ? (
          <Card.Root
            bg={cardBg}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            overflow="hidden"
          >
            <Skeleton height="60px" />
            <Card.Body p={6}>
              <VStack gap={4}>
                <Skeleton height="80px" width="100%" borderRadius="lg" />
                <Skeleton height="60px" width="100%" borderRadius="lg" />
                <Grid templateColumns="repeat(2, 1fr)" gap={3} w="full">
                  <Skeleton height="70px" borderRadius="lg" />
                  <Skeleton height="70px" borderRadius="lg" />
                  <Skeleton height="70px" borderRadius="lg" />
                  <Skeleton height="70px" borderRadius="lg" />
                </Grid>
              </VStack>
            </Card.Body>
          </Card.Root>
        ) : ptoBalance ? (
          <Card.Root
            bg={cardBg}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            overflow="hidden"
          >
            <Box
              px={5}
              py={4}
              bgGradient="to-r"
              gradientFrom="brand.500"
              gradientTo="teal.400"
            >
              <HStack justify="space-between">
                <HStack gap={2}>
                  <LuWallet size={18} color="white" />
                  <Text fontWeight="semibold" color="white" fontSize="sm">
                    Your PTO Balance
                  </Text>
                </HStack>
                <Badge
                  bg="whiteAlpha.200"
                  color="white"
                  borderRadius="full"
                  px={2}
                >
                  {ptoBalance.year}
                </Badge>
              </HStack>
            </Box>

            <Card.Body p={5}>
              <VStack gap={5} align="stretch">
                {/* Main Balance Display */}
                <Box textAlign="center" py={3}>
                  <Text
                    fontSize="5xl"
                    fontWeight="bold"
                    bgGradient="to-r"
                    gradientFrom="brand.500"
                    gradientTo="cyan.500"
                    bgClip="text"
                    lineHeight={1}
                  >
                    {ptoBalance.available}
                  </Text>
                  <Text fontSize="sm" color={textSecondary} mt={2}>
                    hours available
                  </Text>
                  <Badge
                    colorPalette="gray"
                    variant="subtle"
                    mt={1}
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {Math.floor(ptoBalance.available / 8)} days
                  </Badge>
                </Box>

                {/* Progress Bar */}
                <Box>
                  <Progress.Root
                    value={
                      ptoBalance.balance > 0
                        ? ((ptoBalance.used + ptoBalance.pending) /
                            ptoBalance.balance) *
                          100
                        : 0
                    }
                    size="sm"
                  >
                    <Progress.Track
                      bg={progressTrackBg}
                      borderRadius="full"
                      h="8px"
                    >
                      <Progress.Range
                        bgGradient="to-r"
                        gradientFrom="brand.500"
                        gradientTo="cyan.500"
                        borderRadius="full"
                      />
                    </Progress.Track>
                  </Progress.Root>
                  <HStack justify="space-between" mt={2}>
                    <Text fontSize="xs" color={textSecondary}>
                      {ptoBalance.used + ptoBalance.pending} hrs used
                    </Text>
                    <Text fontSize="xs" color={textSecondary}>
                      {ptoBalance.balance} hrs total
                    </Text>
                  </HStack>
                </Box>

                {/* Stats Grid */}
                <SimpleGrid columns={2} gap={3}>
                  <Box
                    p={3}
                    bg={statBg}
                    borderRadius="xl"
                    textAlign="center"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                      {ptoBalance.used}
                    </Text>
                    <Text fontSize="xs" color={textSecondary}>
                      Used
                    </Text>
                  </Box>
                  <Box
                    p={3}
                    bg={statBg}
                    borderRadius="xl"
                    textAlign="center"
                    border="1px solid"
                    borderColor={amberBorderColor}
                  >
                    <Text fontSize="xl" fontWeight="bold" color="amber.500">
                      {ptoBalance.pending}
                    </Text>
                    <Text fontSize="xs" color={textSecondary}>
                      Pending
                    </Text>
                  </Box>
                  <Box
                    p={3}
                    bg={statBg}
                    borderRadius="xl"
                    textAlign="center"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <HStack justify="center" gap={1}>
                      <LuTrendingUp size={14} color={trendingColor} />
                      <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                        {ptoBalance.accrued_ytd}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color={textSecondary}>
                      Accrued
                    </Text>
                  </Box>
                  <Box
                    p={3}
                    bg={statBg}
                    borderRadius="xl"
                    textAlign="center"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                      {ptoBalance.carry_over}
                    </Text>
                    <Text fontSize="xs" color={textSecondary}>
                      Carried Over
                    </Text>
                  </Box>
                </SimpleGrid>

                {/* Accrual Rate Info */}
                {ptoBalance.tier && (
                  <Box
                    p={3}
                    bg={accrualInfoBg}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={accrualInfoBorder}
                  >
                    <HStack justify="space-between">
                      <Text fontSize="xs" color={textSecondary}>
                        Accrual Rate
                      </Text>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color={textPrimary}
                      >
                        {ptoBalance.tier.accrual_rate} hrs/period
                      </Text>
                    </HStack>
                  </Box>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        ) : (
          <Card.Root
            bg={cardBg}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            p={8}
          >
            <Card.Body p={0}>
              <VStack gap={4}>
                <Flex
                  p={4}
                  borderRadius="full"
                  bg={statBg}
                  align="center"
                  justify="center"
                >
                  <LuClock size={32} color="var(--chakra-colors-gray-400)" />
                </Flex>
                <VStack gap={1}>
                  <Text fontWeight="medium" color={textPrimary}>
                    No balance configured
                  </Text>
                  <Text fontSize="sm" color={textSecondary} textAlign="center">
                    Contact HR to set up your PTO balance
                  </Text>
                </VStack>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </Grid>
  );
}

// ============================================================================
// My Requests Tab Component
// ============================================================================

function RequestSection({
  title,
  icon,
  count,
  children,
  textSecondary,
  defaultExpanded = true,
  collapsible = false,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  textSecondary: string;
  defaultExpanded?: boolean;
  collapsible?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const headerHoverBg = useColorModeValue("gray.100", "gray.750");

  return (
    <Box>
      <HStack
        gap={2}
        mb={isExpanded ? 3 : 0}
        py={2}
        px={3}
        mx={-3}
        borderRadius="lg"
        cursor={collapsible ? "pointer" : "default"}
        bg={collapsible ? headerBg : "transparent"}
        _hover={collapsible ? { bg: headerHoverBg } : {}}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
        transition="all 0.2s"
      >
        {collapsible && (
          <Box
            transition="transform 0.2s"
            transform={isExpanded ? "rotate(0deg)" : "rotate(-90deg)"}
          >
            <LuChevronDown size={16} color="var(--chakra-colors-gray-400)" />
          </Box>
        )}
        {icon}
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color={textSecondary}
          textTransform="uppercase"
          letterSpacing="wide"
        >
          {title}
        </Text>
        <Badge
          colorPalette="gray"
          variant="subtle"
          borderRadius="full"
          fontSize="xs"
        >
          {count}
        </Badge>
        {collapsible && !isExpanded && (
          <Text fontSize="xs" color={textSecondary} ml="auto">
            Click to expand
          </Text>
        )}
      </HStack>
      <Box
        overflow="hidden"
        transition="all 0.3s ease-in-out"
        maxHeight={isExpanded ? "5000px" : "0"}
        opacity={isExpanded ? 1 : 0}
      >
        <VStack gap={2} align="stretch">
          {children}
        </VStack>
      </Box>
    </Box>
  );
}

function RequestRow({
  request,
  onCancel,
  cardBg,
  borderColor,
  hoverBorderColor,
  textPrimary,
  textSecondary,
  hoverBg,
  cancelHoverBg,
}: {
  request: TimeOffRequest;
  onCancel: (id: number) => void;
  cardBg: string;
  borderColor: string;
  hoverBorderColor: string;
  textPrimary: string;
  textSecondary: string;
  hoverBg: string;
  cancelHoverBg: string;
}) {
  const status = getStatusStyles(request.status);
  const isUpcoming = parseLocalDate(request.start_date) >= new Date();
  // Can cancel: pending/draft requests OR approved requests that haven't started yet
  const canCancel = 
    request.status === "pending" || 
    request.status === "draft" ||
    (request.status === "approved" && isUpcoming);
  const isUpcomingApproved = isUpcoming && request.status === "approved";
  const statusTextColor = useColorModeValue(status.text, status.darkText);

  // Check if there are notes to display
  const hasReviewNotes = request.review_notes && (request.status === "approved" || request.status === "denied");
  const hasCancellationNotes = request.cancellation_reason && request.status === "cancelled";

  return (
    <Box
      p={4}
      bg={cardBg}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      transition="all 0.15s"
      _hover={{
        bg: hoverBg,
        borderColor: hoverBorderColor,
        transform: "translateY(-1px)",
      }}
    >
      <HStack justify="space-between">
        <HStack gap={4} flex={1}>
          <Box w="4px" h="44px" borderRadius="full" bg={status.bg} alignSelf="start" />
          <VStack align="start" gap={0.5} flex={1}>
            <HStack gap={2} flexWrap="wrap">
              <Text fontWeight="medium" color={textPrimary}>
                {formatDateRange(request.start_date, request.end_date)}
              </Text>
              {isUpcomingApproved && (
                <Badge
                  colorPalette="green"
                  variant="subtle"
                  fontSize="xs"
                  borderRadius="full"
                  px={2}
                >
                  {getRelativeTime(request.start_date)}
                </Badge>
              )}
            </HStack>
            <HStack gap={3} fontSize="sm" color={textSecondary} flexWrap="wrap">
              <Text>{request.total_hours} hours</Text>
              <Text display={{ base: "none", sm: "block" }}>•</Text>
              <HStack gap={1} color={statusTextColor}>
                {getStatusIcon(request.status, 14)}
                <Text textTransform="capitalize">{request.status}</Text>
              </HStack>
              {request.reviewed_by && (
                <>
                  <Text display={{ base: "none", md: "block" }}>•</Text>
                  <Text display={{ base: "none", md: "block" }}>
                    by {request.reviewed_by.name}
                  </Text>
                </>
              )}
            </HStack>
          </VStack>
        </HStack>

        {canCancel && (
          <Tooltip
            content={
              isUpcomingApproved
                ? "Cancel this approved request (hours will be restored)"
                : "Cancel this request"
            }
          >
            <IconButton
              aria-label="Cancel"
              onClick={() => onCancel(request.id)}
              variant="ghost"
              size="sm"
              color="gray.400"
              _hover={{ color: "red.500", bg: cancelHoverBg }}
              borderRadius="lg"
            >
              <LuX size={16} />
            </IconButton>
          </Tooltip>
        )}
      </HStack>

      {/* Display review notes for approved/denied requests */}
      {hasReviewNotes && (
        <Box
          mt={3}
          ml={8}
          p={3}
          bg={request.status === "approved" ? "green.50" : "red.50"}
          _dark={{ bg: request.status === "approved" ? "green.950" : "red.950" }}
          borderRadius="lg"
          borderLeft="3px solid"
          borderLeftColor={request.status === "approved" ? "green.400" : "red.400"}
        >
          <Text
            fontSize="xs"
            fontWeight="medium"
            color={request.status === "approved" ? "green.600" : "red.600"}
            _dark={{ color: request.status === "approved" ? "green.400" : "red.400" }}
            mb={1}
          >
            {request.status === "approved" ? "Approval" : "Denial"} Notes
          </Text>
          <Text fontSize="sm" color={textPrimary}>
            {request.review_notes}
          </Text>
        </Box>
      )}

      {/* Display cancellation reason */}
      {hasCancellationNotes && (
        <Box
          mt={3}
          ml={8}
          p={3}
          bg="gray.50"
          _dark={{ bg: "gray.900" }}
          borderRadius="lg"
          borderLeft="3px solid"
          borderLeftColor="gray.400"
        >
          <Text
            fontSize="xs"
            fontWeight="medium"
            color="gray.600"
            _dark={{ color: "gray.400" }}
            mb={1}
          >
            Cancellation Reason
          </Text>
          <Text fontSize="sm" color={textPrimary}>
            {request.cancellation_reason}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Compact history item for the collapsible history section
function HistoryItem({
  request,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  hoverBg,
}: {
  request: TimeOffRequest;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  hoverBg: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = getStatusStyles(request.status);
  const statusTextColor = useColorModeValue(status.text, status.darkText);
  const hasNotes = request.review_notes || request.cancellation_reason;

  return (
    <Box
      bg={cardBg}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ bg: hoverBg }}
    >
      {/* Compact row - always visible */}
      <HStack
        p={3}
        gap={4}
        cursor={hasNotes ? "pointer" : "default"}
        onClick={hasNotes ? () => setIsExpanded(!isExpanded) : undefined}
      >
        {/* Status indicator */}
        <Box w="3px" h="32px" borderRadius="full" bg={status.bg} flexShrink={0} />
        
        {/* Date */}
        <Box minW="90px">
          <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
            {formatDateShort(request.start_date)}
          </Text>
        </Box>
        
        {/* Hours */}
        <Box minW="60px" display={{ base: "none", sm: "block" }}>
          <Text fontSize="sm" color={textSecondary}>
            {request.total_hours}h
          </Text>
        </Box>
        
        {/* Status */}
        <HStack gap={1} color={statusTextColor} flex={1}>
          {getStatusIcon(request.status, 14)}
          <Text fontSize="sm" textTransform="capitalize">
            {request.status}
          </Text>
        </HStack>
        
        {/* Reviewer */}
        {request.reviewed_by && (
          <Text fontSize="xs" color={textSecondary} display={{ base: "none", md: "block" }}>
            by {request.reviewed_by.name}
          </Text>
        )}
        
        {/* Expand indicator if has notes */}
        {hasNotes && (
          <Box
            transition="transform 0.2s"
            transform={isExpanded ? "rotate(180deg)" : "rotate(0deg)"}
          >
            <LuChevronDown size={14} color="var(--chakra-colors-gray-400)" />
          </Box>
        )}
      </HStack>
      
      {/* Expandable notes section */}
      {hasNotes && (
        <Box
          overflow="hidden"
          transition="all 0.2s ease-in-out"
          maxHeight={isExpanded ? "200px" : "0"}
          opacity={isExpanded ? 1 : 0}
        >
          <Box
            mx={3}
            mb={3}
            p={3}
            bg={request.status === "approved" ? "green.50" : request.status === "denied" ? "red.50" : "gray.50"}
            _dark={{
              bg: request.status === "approved" ? "green.950" : request.status === "denied" ? "red.950" : "gray.900",
            }}
            borderRadius="md"
            borderLeft="3px solid"
            borderLeftColor={
              request.status === "approved" ? "green.400" : request.status === "denied" ? "red.400" : "gray.400"
            }
          >
            <Text
              fontSize="xs"
              fontWeight="medium"
              color={
                request.status === "approved" ? "green.600" : request.status === "denied" ? "red.600" : "gray.600"
              }
              _dark={{
                color: request.status === "approved" ? "green.400" : request.status === "denied" ? "red.400" : "gray.400",
              }}
              mb={1}
            >
              {request.status === "approved" ? "Approval" : request.status === "denied" ? "Denial" : "Cancellation"} Notes
            </Text>
            <Text fontSize="sm" color={textPrimary}>
              {request.review_notes || request.cancellation_reason}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// History list with year grouping
function HistoryList({
  requests,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  hoverBg,
}: {
  requests: TimeOffRequest[];
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  hoverBg: string;
}) {
  // Group by year
  const groupedByYear = useMemo(() => {
    const groups: Record<number, TimeOffRequest[]> = {};
    requests.forEach((r) => {
      const year = parseLocalDate(r.start_date).getFullYear();
      if (!groups[year]) groups[year] = [];
      groups[year].push(r);
    });
    // Sort years descending
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, reqs]) => ({
        year: Number(year),
        requests: reqs.sort((a, b) => 
          parseLocalDate(b.start_date).getTime() - parseLocalDate(a.start_date).getTime()
        ),
      }));
  }, [requests]);

  return (
    <VStack gap={4} align="stretch">
      {groupedByYear.map(({ year, requests: yearRequests }) => (
        <Box key={year}>
          {/* Year header - only show if multiple years */}
          {groupedByYear.length > 1 && (
            <HStack gap={2} mb={2}>
              <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>
                {year}
              </Text>
              <Box flex={1} h="1px" bg={borderColor} />
              <Text fontSize="xs" color={textSecondary}>
                {yearRequests.length} request{yearRequests.length !== 1 ? "s" : ""}
              </Text>
            </HStack>
          )}
          <VStack gap={1} align="stretch">
            {yearRequests.map((r) => (
              <HistoryItem
                key={r.id}
                request={r}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                hoverBg={hoverBg}
              />
            ))}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
}

function MyRequestsTab({
  requests,
  isLoading,
  onCancelRequest,
}: {
  requests: TimeOffRequest[];
  isLoading: boolean;
  onCancelRequest: (id: number) => void;
}) {
  const [isPastExpanded, setIsPastExpanded] = useState(false);
  
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.750");
  const hoverBgActive = useColorModeValue("gray.100", "gray.700");
  const emptyBg = useColorModeValue("gray.50", "gray.800");
  const cancelHoverBg = useColorModeValue("red.50", "red.950");
  const dividerColor = useColorModeValue("gray.200", "gray.700");
  const sectionHeaderBg = useColorModeValue("gray.50", "gray.850");

  // Get today at midnight for proper comparison
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Split into: pending, upcoming (approved future), past
  const { pendingRequests, upcomingRequests, pastRequests } = useMemo(() => {
    const pending: TimeOffRequest[] = [];
    const upcoming: TimeOffRequest[] = [];
    const past: TimeOffRequest[] = [];

    requests.forEach((r) => {
      const startDate = parseLocalDate(r.start_date);
      const isInFuture = startDate >= today;

      if (r.status === "pending") {
        pending.push(r);
      } else if (r.status === "approved" && isInFuture) {
        upcoming.push(r);
      } else {
        past.push(r);
      }
    });

    // Sort by date ascending (soonest first)
    pending.sort((a, b) => 
      parseLocalDate(a.start_date).getTime() - parseLocalDate(b.start_date).getTime()
    );
    upcoming.sort((a, b) => 
      parseLocalDate(a.start_date).getTime() - parseLocalDate(b.start_date).getTime()
    );
    // Sort past by date descending (most recent first)
    past.sort((a, b) => 
      parseLocalDate(b.start_date).getTime() - parseLocalDate(a.start_date).getTime()
    );

    return { pendingRequests: pending, upcomingRequests: upcoming, pastRequests: past };
  }, [requests, today]);

  // Auto-expand past if there are no pending/upcoming
  const shouldShowPast = isPastExpanded || (pendingRequests.length === 0 && upcomingRequests.length === 0);

  if (isLoading) {
    return (
      <VStack gap={3} align="stretch">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="80px" borderRadius="xl" />
        ))}
      </VStack>
    );
  }

  if (requests.length === 0) {
    return (
      <Card.Root
        bg={cardBg}
        borderRadius="2xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <Card.Body p={12}>
          <VStack gap={4}>
            <Flex
              p={5}
              borderRadius="full"
              bg={emptyBg}
              align="center"
              justify="center"
            >
              <LuCalendarDays size={40} color="var(--chakra-colors-gray-400)" />
            </Flex>
            <VStack gap={1}>
              <Text fontWeight="semibold" color={textPrimary}>
                No requests yet
              </Text>
              <Text fontSize="sm" color={textSecondary}>
                Submit your first time-off request
              </Text>
            </VStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    );
  }

  // Render a single request row
  const renderRequestRow = (r: TimeOffRequest, showCancel: boolean = false) => {
    const status = getStatusStyles(r.status);
    const statusTextColor = r.status === "pending" ? "amber.500" : "green.500";
    const relativeTime = getRelativeTime(r.start_date);
    const typeName = r.type?.name || "PTO";

    return (
      <HStack
        key={r.id}
        p={3}
        bg={hoverBg}
        borderRadius="lg"
        gap={{ base: 2, md: 3 }}
        _hover={{ bg: hoverBgActive }}
        transition="all 0.15s"
        flexWrap={{ base: "wrap", md: "nowrap" }}
      >
        {/* Status indicator */}
        <Box
          w="4px"
          alignSelf="stretch"
          borderRadius="full"
          bg={status.bg}
          minH="40px"
          display={{ base: "none", sm: "block" }}
        />

        {/* Date and relative time */}
        <VStack align="start" gap={0} minW={{ base: "100px", md: "120px" }}>
          <Text fontWeight="medium" color={textPrimary} fontSize="sm">
            {formatDateRange(r.start_date, r.end_date)}
          </Text>
          <Text fontSize="xs" color={textSecondary}>
            {relativeTime}
          </Text>
        </VStack>

        {/* Type */}
        <Badge 
          colorPalette="gray" 
          variant="subtle" 
          fontSize="xs"
          display={{ base: "none", sm: "flex" }}
        >
          {typeName}
        </Badge>

        {/* Hours */}
        <Text fontSize="sm" color={textSecondary} minW="40px">
          {r.total_hours}h
        </Text>

        {/* Status */}
        <HStack gap={1} flex={1}>
          {getStatusIcon(r.status, 14)}
          <Text
            fontSize="sm"
            fontWeight="medium"
            color={statusTextColor}
            textTransform="capitalize"
          >
            {r.status}
          </Text>
        </HStack>

        {/* Reviewer (if approved) */}
        {r.reviewed_by && (
          <Text fontSize="xs" color={textSecondary} display={{ base: "none", lg: "block" }}>
            by {r.reviewed_by.name}
          </Text>
        )}

        {/* Cancel button */}
        {showCancel && (
          <Tooltip
            content={
              r.status === "approved"
                ? "Cancel (hours will be restored)"
                : "Cancel request"
            }
          >
            <IconButton
              aria-label="Cancel"
              onClick={() => onCancelRequest(r.id)}
              variant="ghost"
              size="sm"
              color="gray.400"
              _hover={{ color: "red.500", bg: cancelHoverBg }}
              borderRadius="lg"
            >
              <LuX size={16} />
            </IconButton>
          </Tooltip>
        )}
      </HStack>
    );
  };

  // Render a compact past row
  const renderPastRow = (r: TimeOffRequest) => {
    const status = getStatusStyles(r.status);
    const typeName = r.type?.name || "PTO";

    return (
      <HStack
        key={r.id}
        py={2}
        px={3}
        borderRadius="md"
        gap={{ base: 2, md: 3 }}
        opacity={0.85}
        _hover={{ opacity: 1, bg: hoverBg }}
        transition="all 0.15s"
      >
        {/* Status indicator */}
        <Box w="3px" h="24px" borderRadius="full" bg={status.bg} flexShrink={0} />

        {/* Date */}
        <Text fontSize="sm" color={textPrimary} minW={{ base: "70px", md: "80px" }}>
          {formatDateShort(r.start_date)}
        </Text>

        {/* Type */}
        <Text fontSize="xs" color={textSecondary} display={{ base: "none", sm: "block" }} minW="60px">
          {typeName}
        </Text>

        {/* Hours */}
        <Text fontSize="sm" color={textSecondary} minW="35px">
          {r.total_hours}h
        </Text>

        {/* Status */}
        <HStack gap={1} flex={1}>
          <Box color={status.text} _dark={{ color: status.darkText }}>
            {getStatusIcon(r.status, 12)}
          </Box>
          <Text 
            fontSize="sm" 
            textTransform="capitalize"
            color={status.text}
            _dark={{ color: status.darkText }}
          >
            {r.status}
          </Text>
        </HStack>

        {/* Reviewer */}
        {r.reviewed_by && (
          <Text fontSize="xs" color={textSecondary} display={{ base: "none", lg: "block" }}>
            by {r.reviewed_by.name}
          </Text>
        )}
      </HStack>
    );
  };

  return (
    <Card.Root
      bg={cardBg}
      borderRadius="2xl"
      border="1px solid"
      borderColor={borderColor}
      overflow="hidden"
    >
      <Card.Body p={0}>
        {/* PENDING Section */}
        {pendingRequests.length > 0 && (
          <>
            <Box p={5} pb={4}>
              <HStack gap={2} mb={4}>
                <Box w={2} h={2} borderRadius="full" bg="amber.500" />
                <Text fontWeight="semibold" color={textPrimary} fontSize="sm">
                  Pending Approval
                </Text>
                <Badge colorPalette="amber" variant="subtle" borderRadius="full" fontSize="xs">
                  {pendingRequests.length}
                </Badge>
              </HStack>
              <VStack gap={2} align="stretch">
                {pendingRequests.map((r) => renderRequestRow(r, true))}
              </VStack>
            </Box>
            <Box h="1px" bg={dividerColor} mx={5} />
          </>
        )}

        {/* UPCOMING Section */}
        <Box p={5} pb={upcomingRequests.length > 0 ? 4 : 5}>
          <HStack gap={2} mb={upcomingRequests.length > 0 ? 4 : 0}>
            <Box
              w={2}
              h={2}
              borderRadius="full"
              bg={upcomingRequests.length > 0 ? "green.500" : "gray.300"}
            />
            <Text fontWeight="semibold" color={textPrimary} fontSize="sm">
              Upcoming
            </Text>
            {upcomingRequests.length > 0 && (
              <Badge colorPalette="green" variant="subtle" borderRadius="full" fontSize="xs">
                {upcomingRequests.length}
              </Badge>
            )}
          </HStack>

          {upcomingRequests.length === 0 ? (
            <Text fontSize="sm" color={textSecondary} ml={4}>
              No upcoming approved time off
            </Text>
          ) : (
            <VStack gap={2} align="stretch">
              {upcomingRequests.map((r) => renderRequestRow(r, true))}
            </VStack>
          )}
        </Box>

        {/* Divider */}
        <Box h="1px" bg={dividerColor} mx={5} />

        {/* PAST Section - Collapsible */}
        <Box>
          {/* Header - clickable */}
          <HStack
            gap={2}
            p={5}
            py={4}
            cursor="pointer"
            onClick={() => setIsPastExpanded(!isPastExpanded)}
            _hover={{ bg: sectionHeaderBg }}
            transition="all 0.15s"
          >
            <Box
              transition="transform 0.2s"
              transform={shouldShowPast ? "rotate(0deg)" : "rotate(-90deg)"}
            >
              <LuChevronDown size={16} color="var(--chakra-colors-gray-400)" />
            </Box>
            <Box w={2} h={2} borderRadius="full" bg="gray.400" />
            <Text fontWeight="semibold" color={textPrimary} fontSize="sm">
              Past
            </Text>
            {pastRequests.length > 0 && (
              <Text fontSize="sm" color={textSecondary}>
                ({pastRequests.length})
              </Text>
            )}
            {!shouldShowPast && pastRequests.length > 0 && (
              <Text fontSize="xs" color={textSecondary} ml="auto">
                Click to expand
              </Text>
            )}
          </HStack>

          {/* Collapsible content */}
          <Box
            overflow="hidden"
            transition="all 0.3s ease-in-out"
            maxHeight={shouldShowPast ? "2000px" : "0"}
            opacity={shouldShowPast ? 1 : 0}
          >
            <Box px={5} pb={5}>
              {pastRequests.length === 0 ? (
                <Text fontSize="sm" color={textSecondary} ml={4}>
                  No past requests
                </Text>
              ) : (
                <VStack gap={1} align="stretch">
                  {pastRequests.map((r) => renderPastRow(r))}
                </VStack>
              )}
            </Box>
          </Box>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}

// ============================================================================
// Balances Tab Component
// ============================================================================

function BalancesTab({
  balances,
  isLoading,
}: {
  balances: TimeOffBalance[];
  isLoading: boolean;
}) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const statBg = useColorModeValue("gray.50", "gray.750");

  if (isLoading) {
    return (
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
        {[1, 2].map((i) => (
          <Skeleton key={i} height="350px" borderRadius="2xl" />
        ))}
      </Grid>
    );
  }

  if (balances.length === 0) {
    return (
      <Card.Root
        bg={cardBg}
        borderRadius="2xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <Card.Body p={12}>
          <VStack gap={4}>
            <Flex
              p={5}
              borderRadius="full"
              bg={statBg}
              align="center"
              justify="center"
            >
              <LuClock size={40} color="var(--chakra-colors-gray-400)" />
            </Flex>
            <VStack gap={1}>
              <Text fontWeight="semibold" color={textPrimary}>
                No balances configured
              </Text>
              <Text fontSize="sm" color={textSecondary}>
                Contact HR to set up your time-off balances
              </Text>
            </VStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
      {balances.map((balance) => {
        const usagePercent =
          balance.balance > 0
            ? ((balance.used + balance.pending) / balance.balance) * 100
            : 0;

        return (
          <Card.Root
            key={balance.type.id}
            bg={cardBg}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            overflow="hidden"
          >
            <Box h="4px" bg={balance.type.color} />
            <Card.Body p={6}>
              <VStack align="stretch" gap={5}>
                <HStack justify="space-between">
                  <HStack gap={2}>
                    <Box
                      w={3}
                      h={3}
                      borderRadius="full"
                      bg={balance.type.color}
                    />
                    <Text fontWeight="semibold" color={textPrimary}>
                      {balance.type.name}
                    </Text>
                  </HStack>
                  <Badge
                    colorPalette="gray"
                    variant="subtle"
                    borderRadius="full"
                  >
                    {balance.year}
                  </Badge>
                </HStack>

                <Box textAlign="center" py={4}>
                  <Text
                    fontSize="5xl"
                    fontWeight="bold"
                    color="brand.500"
                    lineHeight={1}
                  >
                    {balance.available}
                  </Text>
                  <Text fontSize="sm" color={textSecondary} mt={2}>
                    hours available ({Math.floor(balance.available / 8)} days)
                  </Text>
                </Box>

                <Box>
                  <Progress.Root value={usagePercent} size="sm">
                    <Progress.Track bg={statBg} borderRadius="full" h="8px">
                      <Progress.Range
                        bg={balance.type.color}
                        borderRadius="full"
                      />
                    </Progress.Track>
                  </Progress.Root>
                  <HStack justify="space-between" mt={2}>
                    <Text fontSize="xs" color={textSecondary}>
                      {Math.round(usagePercent)}% used
                    </Text>
                    <Text fontSize="xs" color={textSecondary}>
                      {balance.balance} total
                    </Text>
                  </HStack>
                </Box>

                <SimpleGrid columns={4} gap={2}>
                  <Box p={2} bg={statBg} borderRadius="lg" textAlign="center">
                    <Text fontSize="md" fontWeight="bold" color={textPrimary}>
                      {balance.used}
                    </Text>
                    <Text fontSize="2xs" color={textSecondary}>
                      Used
                    </Text>
                  </Box>
                  <Box p={2} bg={statBg} borderRadius="lg" textAlign="center">
                    <Text fontSize="md" fontWeight="bold" color="amber.500">
                      {balance.pending}
                    </Text>
                    <Text fontSize="2xs" color={textSecondary}>
                      Pending
                    </Text>
                  </Box>
                  <Box p={2} bg={statBg} borderRadius="lg" textAlign="center">
                    <Text fontSize="md" fontWeight="bold" color={textPrimary}>
                      {balance.accrued_ytd}
                    </Text>
                    <Text fontSize="2xs" color={textSecondary}>
                      Accrued
                    </Text>
                  </Box>
                  <Box p={2} bg={statBg} borderRadius="lg" textAlign="center">
                    <Text fontSize="md" fontWeight="bold" color={textPrimary}>
                      {balance.carry_over}
                    </Text>
                    <Text fontSize="2xs" color={textSecondary}>
                      Carried
                    </Text>
                  </Box>
                </SimpleGrid>
              </VStack>
            </Card.Body>
          </Card.Root>
        );
      })}
    </Grid>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function TimeOffPage() {
  const [types, setTypes] = useState<TimeOffType[]>([]);
  const [balances, setBalances] = useState<TimeOffBalance[]>([]);
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTab, setActiveTab] = useState("request");

  // Track loading states for each tab
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Track which tabs have been loaded
  const [requestTabLoaded, setRequestTabLoaded] = useState(false);
  const [requestsTabLoaded, setRequestsTabLoaded] = useState(false);
  const [balancesTabLoaded, setBalancesTabLoaded] = useState(false);

  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const tabBg = useColorModeValue("gray.100", "gray.800");
  const activeTabBg = useColorModeValue("white", "gray.700");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Fetch types and balances (for Request tab)
  const fetchRequestTabData = useCallback(async () => {
    if (requestTabLoaded) return;
    setIsLoadingRequest(true);
    try {
      const [typesData, balancesData] = await Promise.all([
        timeOffService.getTypes().catch(() => []),
        timeOffService.getBalances().catch(() => []),
      ]);
      setTypes(typesData);
      setBalances(balancesData);
      setRequestTabLoaded(true);
    } finally {
      setIsLoadingRequest(false);
    }
  }, [requestTabLoaded]);

  // Fetch requests (for My Requests tab)
  const fetchRequestsTabData = useCallback(async () => {
    if (requestsTabLoaded) return;
    setIsLoadingRequests(true);
    try {
      const requestsData = await timeOffService
        .getRequests({ per_page: 50 })
        .catch(() => ({ data: [] }));
      setRequests(requestsData.data || []);
      setPendingCount(
        (requestsData.data || []).filter((r) => r.status === "pending").length,
      );
      setRequestsTabLoaded(true);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [requestsTabLoaded]);

  // Fetch balances (for Balances tab - only if not already loaded from Request tab)
  const fetchBalancesTabData = useCallback(async () => {
    if (balancesTabLoaded || requestTabLoaded) {
      setBalancesTabLoaded(true);
      return;
    }
    setIsLoadingBalances(true);
    try {
      const balancesData = await timeOffService.getBalances().catch(() => []);
      setBalances(balancesData);
      setBalancesTabLoaded(true);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [balancesTabLoaded, requestTabLoaded]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "request" && !requestTabLoaded && !isLoadingRequest) {
      fetchRequestTabData();
    } else if (
      activeTab === "requests" &&
      !requestsTabLoaded &&
      !isLoadingRequests
    ) {
      fetchRequestsTabData();
    } else if (
      activeTab === "balances" &&
      !balancesTabLoaded &&
      !isLoadingBalances
    ) {
      fetchBalancesTabData();
    }
    // Calendar tab fetches its own data internally
  }, [
    activeTab,
    requestTabLoaded,
    requestsTabLoaded,
    balancesTabLoaded,
    isLoadingRequest,
    isLoadingRequests,
    isLoadingBalances,
    fetchRequestTabData,
    fetchRequestsTabData,
    fetchBalancesTabData,
  ]);

  // Refresh all data (after submitting a request)
  const refreshData = useCallback(async () => {
    // Reset loaded flags so data will be re-fetched
    setRequestTabLoaded(false);
    setRequestsTabLoaded(false);
    setBalancesTabLoaded(false);

    // Force re-fetch the request tab data and requests data
    setIsLoadingRequest(true);
    setIsLoadingRequests(true);
    try {
      const [typesData, balancesData, requestsData] = await Promise.all([
        timeOffService.getTypes().catch(() => []),
        timeOffService.getBalances().catch(() => []),
        timeOffService
          .getRequests({ per_page: 50 })
          .catch(() => ({ data: [] })),
      ]);
      setTypes(typesData);
      setBalances(balancesData);
      setRequests(requestsData.data || []);
      setPendingCount(
        (requestsData.data || []).filter((r) => r.status === "pending").length,
      );
      setRequestTabLoaded(true);
      setRequestsTabLoaded(true);
      setBalancesTabLoaded(true);
    } finally {
      setIsLoadingRequest(false);
      setIsLoadingRequests(false);
    }
  }, []);

  const handleCancelRequest = async (id: number) => {
    try {
      await timeOffService.cancelRequest(id);
      toaster.create({
        title: "Request cancelled",
        type: "success",
      });
      refreshData();
    } catch (error) {
      toaster.create({
        title: "Failed to cancel",
        description:
          error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    }
  };

  return (
    <Box maxW="1400px" mx="auto">
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Box>
          <HStack gap={3} mb={1}>
            <Flex
              p={2}
              borderRadius="lg"
              bgGradient="to-br"
              gradientFrom="brand.500"
              gradientTo="cyan.500"
              align="center"
              justify="center"
              display={{ base: "none", md: "flex" }}
            >
              <LuCalendarDays size={24} color="white" />
            </Flex>
            <Heading
              as="h1"
              size={{ base: "xl", md: "2xl" }}
              color={textPrimary}
              fontWeight="bold"
            >
              Time Off
            </Heading>
          </HStack>
          <Text color={textSecondary} fontSize={{ base: "sm", md: "md" }}>
            Request, track, and manage your time off
          </Text>
        </Box>

        {/* Mobile Dropdown */}
        <Box display={{ base: "block", md: "none" }}>
          <Box
            position="relative"
            bg={cardBg}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
          >
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 44px 14px 16px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: "transparent",
                color: "inherit",
                fontWeight: 600,
                fontSize: "15px",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                outline: "none",
              }}
            >
              <option value="request">
                New Request
              </option>
              <option value="requests">
                My Requests {pendingCount > 0 ? `(${pendingCount} pending)` : ""}
              </option>
              <option value="balances">Balances</option>
              <option value="calendar">Calendar</option>
            </select>
            <Box
              position="absolute"
              right={4}
              top="50%"
              transform="translateY(-50%)"
              pointerEvents="none"
              color={textSecondary}
            >
              <LuChevronDown size={20} />
            </Box>
          </Box>
        </Box>

        {/* Desktop Tabs */}
        <Box display={{ base: "none", md: "block" }}>
          <Tabs.Root
            value={activeTab}
            onValueChange={(e) => setActiveTab(e.value)}
            variant="enclosed"
          >
            <Tabs.List
              bg={tabBg}
              p={1}
              borderRadius="xl"
              gap={1}
            >
              <Tabs.Trigger
                value="request"
                px={6}
                py={2.5}
                borderRadius="lg"
                fontWeight="medium"
                fontSize="sm"
                _selected={{ bg: activeTabBg, shadow: "sm" }}
              >
                <HStack gap={2}>
                  <LuCalendarPlus size={16} />
                  <Text>Request</Text>
                </HStack>
              </Tabs.Trigger>
              <Tabs.Trigger
                value="requests"
                px={6}
                py={2.5}
                borderRadius="lg"
                fontWeight="medium"
                fontSize="sm"
                _selected={{ bg: activeTabBg, shadow: "sm" }}
              >
                <HStack gap={2}>
                  <LuFileText size={16} />
                  <Text>My Requests</Text>
                  {pendingCount > 0 && (
                    <Box
                      bg="amber.500"
                      color="white"
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="bold"
                      px={1.5}
                      minW="18px"
                      textAlign="center"
                      lineHeight="18px"
                    >
                      {pendingCount}
                    </Box>
                  )}
                </HStack>
              </Tabs.Trigger>
              <Tabs.Trigger
                value="balances"
                px={6}
                py={2.5}
                borderRadius="lg"
                fontWeight="medium"
                fontSize="sm"
                _selected={{ bg: activeTabBg, shadow: "sm" }}
              >
                <HStack gap={2}>
                  <LuWallet size={16} />
                  <Text>Balances</Text>
                </HStack>
              </Tabs.Trigger>
              <Tabs.Trigger
                value="calendar"
                px={6}
                py={2.5}
                borderRadius="lg"
                fontWeight="medium"
                fontSize="sm"
                _selected={{ bg: activeTabBg, shadow: "sm" }}
              >
                <HStack gap={2}>
                  <LuCalendar size={16} />
                  <Text>Calendar</Text>
                </HStack>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </Box>

        {/* Tab Content */}
        <Box>
          {activeTab === "request" && (
            <RequestTab
              types={types}
              balances={balances}
              isLoading={isLoadingRequest || !requestTabLoaded}
              onRequestCreated={refreshData}
            />
          )}
          {activeTab === "requests" && (
            <MyRequestsTab
              requests={requests}
              isLoading={isLoadingRequests || !requestsTabLoaded}
              onCancelRequest={handleCancelRequest}
            />
          )}
          {activeTab === "balances" && (
            <BalancesTab
              balances={balances}
              isLoading={
                isLoadingBalances || (!balancesTabLoaded && !requestTabLoaded)
              }
            />
          )}
          {activeTab === "calendar" && (
            <TimeOffCalendar title="Company Time Off" />
          )}
        </Box>
      </VStack>
    </Box>
  );
}
