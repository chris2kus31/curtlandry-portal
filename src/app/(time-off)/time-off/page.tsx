"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
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
} from "react-icons/lu";
import {
  timeOffService,
  type TimeOffBalance,
  type TimeOffRequest,
  type TimeOffType,
} from "@/lib/api";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

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
      return { bg: "green.500", subtle: "green.500/10", text: "green.600", darkText: "green.400" };
    case "pending":
      return { bg: "amber.500", subtle: "amber.500/10", text: "amber.600", darkText: "amber.400" };
    case "denied":
      return { bg: "red.500", subtle: "red.500/10", text: "red.600", darkText: "red.400" };
    case "cancelled":
      return { bg: "gray.400", subtle: "gray.500/10", text: "gray.600", darkText: "gray.400" };
    default:
      return { bg: "gray.400", subtle: "gray.500/10", text: "gray.600", darkText: "gray.400" };
  }
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return new Date(startDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`;
}

function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

  const ptoType = types.find((t) => t.code === "PTO") || types[0];
  const ptoBalance = balances.find((b) => b.type.code === "PTO");

  // Calculate business days between dates
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const totalDays = calculateDays();
  const totalHours = totalDays * 8;
  const isFormValid = startDate && endDate && totalDays > 0;

  // Format date to YYYY-MM-DD for API
  const formatDateForApi = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!ptoType || !isFormValid || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      await timeOffService.createRequest({
        time_off_type_id: ptoType.id,
        start_date: formatDateForApi(startDate),
        end_date: formatDateForApi(endDate),
        total_hours: totalHours,
        notes: notes || undefined,
        submit: true,
      });

      toaster.create({
        title: "Request submitted! 🎉",
        description: "Your manager will be notified",
        type: "success",
      });

      handleReset();
      onRequestCreated();
    } catch (error) {
      toaster.create({
        title: "Failed to submit",
        description: error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
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
        <Box h="3px" bgGradient="to-r" gradientFrom="brand.500" gradientTo="cyan.500" />
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

            {/* Date Selection */}
            <Box p={{ base: 4, md: 5 }} bg={inputBg} borderRadius="xl">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                minDate={new Date()}
                disabled={isSubmitting}
              />
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
                <HStack justify="space-between">
                  <Text fontSize="sm" color={textSecondary}>
                    Total Time
                  </Text>
                  <HStack gap={2}>
                    <Badge colorPalette="brand" variant="subtle" px={2} py={1} borderRadius="md">
                      {totalDays} day{totalDays !== 1 ? "s" : ""}
                    </Badge>
                    <Badge colorPalette="gray" variant="subtle" px={2} py={1} borderRadius="md">
                      {totalHours} hours
                    </Badge>
                  </HStack>
                </HStack>
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
                Notes <Text as="span" fontWeight="normal" textTransform="none">(optional)</Text>
              </Text>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any details for your manager..."
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="xl"
                rows={3}
                resize="none"
                _focus={{ 
                  borderColor: "brand.500",
                  boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)"
                }}
                _hover={{ borderColor: inputHoverBorder }}
                px={4}
                py={3}
              />
            </Box>

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
                transform: isFormValid && !isSubmitting ? "translateY(-1px)" : "none",
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
          <Card.Root bg={cardBg} borderRadius="2xl" border="1px solid" borderColor={borderColor} overflow="hidden">
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
                    value={ptoBalance.balance > 0 ? ((ptoBalance.used + ptoBalance.pending) / ptoBalance.balance) * 100 : 0}
                    size="sm"
                  >
                    <Progress.Track bg={progressTrackBg} borderRadius="full" h="8px">
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
                    <Text fontSize="xs" color={textSecondary}>Used</Text>
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
                    <Text fontSize="xs" color={textSecondary}>Pending</Text>
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
                    <Text fontSize="xs" color={textSecondary}>Accrued</Text>
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
                    <Text fontSize="xs" color={textSecondary}>Carried Over</Text>
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
                      <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
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
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  textSecondary: string;
}) {
  return (
    <Box>
      <HStack gap={2} mb={3}>
        {icon}
        <Text fontSize="sm" fontWeight="semibold" color={textSecondary} textTransform="uppercase" letterSpacing="wide">
          {title}
        </Text>
        <Badge colorPalette="gray" variant="subtle" borderRadius="full" fontSize="xs">
          {count}
        </Badge>
      </HStack>
      <VStack gap={2} align="stretch">
        {children}
      </VStack>
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
  const canCancel = request.status === "pending" || request.status === "draft";
  const isUpcoming = new Date(request.start_date) >= new Date() && request.status === "approved";
  const statusTextColor = useColorModeValue(status.text, status.darkText);

  return (
    <HStack
      p={4}
      bg={cardBg}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      justify="space-between"
      transition="all 0.15s"
      _hover={{ bg: hoverBg, borderColor: hoverBorderColor, transform: "translateY(-1px)" }}
    >
      <HStack gap={4} flex={1}>
        <Box w="4px" h="44px" borderRadius="full" bg={status.bg} />
        <VStack align="start" gap={0.5} flex={1}>
          <HStack gap={2} flexWrap="wrap">
            <Text fontWeight="medium" color={textPrimary}>
              {formatDateRange(request.start_date, request.end_date)}
            </Text>
            {isUpcoming && (
              <Badge colorPalette="green" variant="subtle" fontSize="xs" borderRadius="full" px={2}>
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
          </HStack>
        </VStack>
      </HStack>

      {canCancel && (
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
      )}
    </HStack>
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
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const hoverBorderColor = useColorModeValue("gray.200", "gray.600");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.750");
  const emptyBg = useColorModeValue("gray.50", "gray.800");
  const cancelHoverBg = useColorModeValue("red.50", "red.950");

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const upcomingApproved = requests.filter(
    (r) => r.status === "approved" && new Date(r.start_date) >= new Date()
  );
  const pastRequests = requests.filter(
    (r) => r.status !== "pending" && (r.status !== "approved" || new Date(r.start_date) < new Date())
  );

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
      <Card.Root bg={cardBg} borderRadius="2xl" border="1px solid" borderColor={borderColor}>
        <Card.Body p={12}>
          <VStack gap={4}>
            <Flex p={5} borderRadius="full" bg={emptyBg} align="center" justify="center">
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

  return (
    <VStack gap={8} align="stretch">
      {pendingRequests.length > 0 && (
        <RequestSection 
          title="Pending" 
          icon={<LuCircleDashed size={16} color="var(--chakra-colors-amber-500)" />}
          count={pendingRequests.length} 
          textSecondary={textSecondary}
        >
          {pendingRequests.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              onCancel={onCancelRequest}
              cardBg={cardBg}
              borderColor={borderColor}
              hoverBorderColor={hoverBorderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              hoverBg={hoverBg}
              cancelHoverBg={cancelHoverBg}
            />
          ))}
        </RequestSection>
      )}
      {upcomingApproved.length > 0 && (
        <RequestSection 
          title="Upcoming" 
          icon={<LuCalendar size={16} color="var(--chakra-colors-green-500)" />}
          count={upcomingApproved.length} 
          textSecondary={textSecondary}
        >
          {upcomingApproved.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              onCancel={onCancelRequest}
              cardBg={cardBg}
              borderColor={borderColor}
              hoverBorderColor={hoverBorderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              hoverBg={hoverBg}
              cancelHoverBg={cancelHoverBg}
            />
          ))}
        </RequestSection>
      )}
      {pastRequests.length > 0 && (
        <RequestSection 
          title="History" 
          icon={<LuHistory size={16} color="var(--chakra-colors-gray-400)" />}
          count={pastRequests.length} 
          textSecondary={textSecondary}
        >
          {pastRequests.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              onCancel={onCancelRequest}
              cardBg={cardBg}
              borderColor={borderColor}
              hoverBorderColor={hoverBorderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              hoverBg={hoverBg}
              cancelHoverBg={cancelHoverBg}
            />
          ))}
        </RequestSection>
      )}
    </VStack>
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
      <Card.Root bg={cardBg} borderRadius="2xl" border="1px solid" borderColor={borderColor}>
        <Card.Body p={12}>
          <VStack gap={4}>
            <Flex p={5} borderRadius="full" bg={statBg} align="center" justify="center">
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
        const usagePercent = balance.balance > 0 ? ((balance.used + balance.pending) / balance.balance) * 100 : 0;

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
                    <Box w={3} h={3} borderRadius="full" bg={balance.type.color} />
                    <Text fontWeight="semibold" color={textPrimary}>
                      {balance.type.name}
                    </Text>
                  </HStack>
                  <Badge colorPalette="gray" variant="subtle" borderRadius="full">
                    {balance.year}
                  </Badge>
                </HStack>

                <Box textAlign="center" py={4}>
                  <Text fontSize="5xl" fontWeight="bold" color="brand.500" lineHeight={1}>
                    {balance.available}
                  </Text>
                  <Text fontSize="sm" color={textSecondary} mt={2}>
                    hours available ({Math.floor(balance.available / 8)} days)
                  </Text>
                </Box>

                <Box>
                  <Progress.Root value={usagePercent} size="sm">
                    <Progress.Track bg={statBg} borderRadius="full" h="8px">
                      <Progress.Range bg={balance.type.color} borderRadius="full" />
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
                    <Text fontSize="md" fontWeight="bold" color={textPrimary}>{balance.used}</Text>
                    <Text fontSize="2xs" color={textSecondary}>Used</Text>
                  </Box>
                  <Box p={2} bg={statBg} borderRadius="lg" textAlign="center">
                    <Text fontSize="md" fontWeight="bold" color="amber.500">{balance.pending}</Text>
                    <Text fontSize="2xs" color={textSecondary}>Pending</Text>
                  </Box>
                  <Box p={2} bg={statBg} borderRadius="lg" textAlign="center">
                    <Text fontSize="md" fontWeight="bold" color={textPrimary}>{balance.accrued_ytd}</Text>
                    <Text fontSize="2xs" color={textSecondary}>Accrued</Text>
                  </Box>
                  <Box p={2} bg={statBg} borderRadius="lg" textAlign="center">
                    <Text fontSize="md" fontWeight="bold" color={textPrimary}>{balance.carry_over}</Text>
                    <Text fontSize="2xs" color={textSecondary}>Carried</Text>
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
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTab, setActiveTab] = useState("request");

  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const tabBg = useColorModeValue("gray.100", "gray.800");
  const activeTabBg = useColorModeValue("white", "gray.700");

  // Fetch types and balances
  const fetchTypesAndBalances = useCallback(async () => {
    setIsLoading(true);
    try {
      const [typesData, balancesData] = await Promise.all([
        timeOffService.getTypes().catch(() => []),
        timeOffService.getBalances().catch(() => []),
      ]);
      setTypes(typesData);
      setBalances(balancesData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const requestsData = await timeOffService.getRequests({ per_page: 50 }).catch(() => ({ data: [] }));
      setRequests(requestsData.data || []);
      setPendingCount((requestsData.data || []).filter((r) => r.status === "pending").length);
      setRequestsLoaded(true);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTypesAndBalances();
  }, [fetchTypesAndBalances]);

  // Load requests when switching to that tab
  useEffect(() => {
    if (activeTab === "requests" && !requestsLoaded && !isLoadingRequests) {
      fetchRequests();
    }
  }, [activeTab, requestsLoaded, isLoadingRequests, fetchRequests]);

  // Refresh all data
  const refreshData = useCallback(() => {
    setRequestsLoaded(false);
    fetchTypesAndBalances();
    fetchRequests();
  }, [fetchTypesAndBalances, fetchRequests]);

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
        description: error instanceof Error ? error.message : "Please try again",
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
            <Heading as="h1" size={{ base: "xl", md: "2xl" }} color={textPrimary} fontWeight="bold">
              Time Off
            </Heading>
          </HStack>
          <Text color={textSecondary} fontSize={{ base: "sm", md: "md" }}>
            Request, track, and manage your time off
          </Text>
        </Box>

        {/* Tabs */}
        <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)} variant="enclosed">
          <Tabs.List 
            bg={tabBg} 
            p={1} 
            borderRadius="xl" 
            gap={1}
            overflowX="auto"
            css={{ '&::-webkit-scrollbar': { display: 'none' } }}
          >
            <Tabs.Trigger
              value="request"
              px={{ base: 4, md: 6 }}
              py={2.5}
              borderRadius="lg"
              fontWeight="medium"
              fontSize="sm"
              _selected={{ bg: activeTabBg, shadow: "sm" }}
              whiteSpace="nowrap"
            >
              <HStack gap={2}>
                <LuCalendarPlus size={16} />
                <Text>Request</Text>
              </HStack>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="requests"
              px={{ base: 4, md: 6 }}
              py={2.5}
              borderRadius="lg"
              fontWeight="medium"
              fontSize="sm"
              _selected={{ bg: activeTabBg, shadow: "sm" }}
              whiteSpace="nowrap"
            >
              <HStack gap={2}>
                <LuFileText size={16} />
                <Text>My Requests</Text>
                {pendingCount > 0 && (
                  <Badge bg="amber.500" color="white" borderRadius="full" fontSize="xs" px={1.5} minW="18px">
                    {pendingCount}
                  </Badge>
                )}
              </HStack>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="balances"
              px={{ base: 4, md: 6 }}
              py={2.5}
              borderRadius="lg"
              fontWeight="medium"
              fontSize="sm"
              _selected={{ bg: activeTabBg, shadow: "sm" }}
              whiteSpace="nowrap"
            >
              <HStack gap={2}>
                <LuWallet size={16} />
                <Text>Balances</Text>
              </HStack>
            </Tabs.Trigger>
          </Tabs.List>

          <Box mt={6}>
            <Tabs.Content value="request">
              <RequestTab
                types={types}
                balances={balances}
                isLoading={isLoading}
                onRequestCreated={refreshData}
              />
            </Tabs.Content>
            <Tabs.Content value="requests">
              <MyRequestsTab
                requests={requests}
                isLoading={isLoadingRequests}
                onCancelRequest={handleCancelRequest}
              />
            </Tabs.Content>
            <Tabs.Content value="balances">
              <BalancesTab balances={balances} isLoading={isLoading} />
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </VStack>
    </Box>
  );
}
