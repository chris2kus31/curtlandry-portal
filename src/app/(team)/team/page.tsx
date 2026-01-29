"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Card,
  Heading,
  HStack,
  Text,
  VStack,
  Badge,
  Skeleton,
  Tabs,
  IconButton,
  Textarea,
  SimpleGrid,
  Flex,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { Tooltip } from "@/components/ui/tooltip";
import { toaster } from "@/components/ui/toaster";
import {
  LuCheck,
  LuX,
  LuClock,
  LuUsers,
  LuCircleCheck,
  LuCircleDashed,
  LuCircleX,
  LuMessageSquare,
  LuCalendar,
  LuUserX,
} from "react-icons/lu";
import { approvalService, type ApprovalTimeOffRequest } from "@/lib/api";
import { TimeOffCalendar } from "@/components/calendar";

// Use the type from approval service
type TimeOffRequest = ApprovalTimeOffRequest;

// Types - TeamMember is used locally for RequestCard user property
interface TeamMember {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  avatar_url?: string;
  department?: string;
  job_title?: string;
}

// ColorProps and other local types
interface ColorProps {
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  borderColor: string;
  inputBg: string;
  cancelBg: string;
  cancelHoverBg: string;
}

// Helper functions
function getStatusIcon(status: string) {
  switch (status) {
    case "approved":
      return <LuCircleCheck size={16} />;
    case "pending":
      return <LuCircleDashed size={16} />;
    case "denied":
    case "cancelled":
      return <LuCircleX size={16} />;
    default:
      return <LuCircleDashed size={16} />;
  }
}

function getStatusColors(status: string, isLight: boolean) {
  switch (status) {
    case "approved":
      return {
        bg: isLight ? "green.100" : "green.900",
        color: isLight ? "green.700" : "green.200",
      };
    case "pending":
      return {
        bg: isLight ? "amber.100" : "amber.900",
        color: isLight ? "amber.700" : "amber.200",
      };
    case "denied":
      return {
        bg: isLight ? "red.100" : "red.900",
        color: isLight ? "red.700" : "red.200",
      };
    case "cancelled":
      return {
        bg: isLight ? "gray.100" : "gray.800",
        color: isLight ? "gray.600" : "gray.400",
      };
    default:
      return {
        bg: isLight ? "gray.100" : "gray.800",
        color: isLight ? "gray.600" : "gray.400",
      };
  }
}

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  if (startDate === endDate) {
    return start.toLocaleDateString("en-US", { ...options, year: "numeric" });
  }

  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", { ...options, year: "numeric" })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Get status label with context (e.g., "Cancelled by Employee")
function getStatusLabel(request: TimeOffRequest): string {
  if (request.status === "cancelled") {
    if (request.cancelled_by) {
      // Check if cancelled by the same user who requested
      if (request.cancelled_by.id === request.user.id) {
        return "Cancelled by Employee";
      }
      return `Cancelled by ${request.cancelled_by.name}`;
    }
    return "Cancelled";
  }
  if (request.status === "approved" && request.reviewed_by) {
    return "Approved";
  }
  if (request.status === "denied" && request.reviewed_by) {
    return "Denied";
  }
  return request.status.charAt(0).toUpperCase() + request.status.slice(1);
}

// Request Card Component - better UI with cards
function RequestCard({
  request,
  onApprove,
  onDeny,
  isPending,
  colors,
  isLight,
}: {
  request: TimeOffRequest;
  onApprove: (id: number, notes?: string) => void;
  onDeny: (id: number, notes?: string) => void;
  isPending: boolean;
  colors: ColorProps;
  isLight: boolean;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const status = getStatusColors(request.status, isLight);

  const handleApprove = async () => {
    setIsProcessing(true);
    await onApprove(request.id, approvalNotes || undefined);
    setIsProcessing(false);
    setShowNotes(false);
    setApprovalNotes("");
  };

  const handleDeny = async () => {
    setIsProcessing(true);
    await onDeny(request.id, approvalNotes || undefined);
    setIsProcessing(false);
    setShowNotes(false);
    setApprovalNotes("");
  };

  return (
    <Card.Root
      bg={colors.cardBg}
      borderRadius="xl"
      border="1px solid"
      borderColor={colors.borderColor}
      overflow="hidden"
    >
      {/* Color indicator bar */}
      <Box h="3px" bg={request.type.color} />

      <Card.Body p={4}>
        <VStack align="stretch" gap={4}>
          {/* Header: Employee + Status */}
          <Flex
            justify="space-between"
            align={{ base: "start", sm: "center" }}
            direction={{ base: "column", sm: "row" }}
            gap={2}
          >
            <HStack gap={3}>
              <Box>
                <Text fontWeight="semibold" color={colors.textPrimary}>
                  {request.user.first_name} {request.user.last_name}
                </Text>
                <Text fontSize="sm" color={colors.textSecondary}>
                  {request.user.job_title ||
                    request.user.department ||
                    request.user.email}
                </Text>
              </Box>
            </HStack>
            <Badge
              bg={status.bg}
              color={status.color}
              px={3}
              py={1}
              borderRadius="full"
              fontSize="xs"
              fontWeight="medium"
            >
              <HStack gap={1.5}>
                {request.status === "cancelled" &&
                request.cancelled_by?.id === request.user.id ? (
                  <LuUserX size={14} />
                ) : (
                  getStatusIcon(request.status)
                )}
                <Text>{getStatusLabel(request)}</Text>
              </HStack>
            </Badge>
          </Flex>

          {/* Details Grid */}
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
            <Box>
              <Text fontSize="xs" color={colors.textSecondary} mb={1}>
                Type
              </Text>
              <HStack gap={2}>
                <Box
                  w={2}
                  h={2}
                  borderRadius="full"
                  bg={request.type.color}
                  flexShrink={0}
                />
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color={colors.textPrimary}
                >
                  {request.type.name}
                </Text>
              </HStack>
            </Box>
            <Box>
              <Text fontSize="xs" color={colors.textSecondary} mb={1}>
                Dates
              </Text>
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={colors.textPrimary}
              >
                {formatDateRange(request.start_date, request.end_date)}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color={colors.textSecondary} mb={1}>
                Duration
              </Text>
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={colors.textPrimary}
              >
                {request.total_hours} hours
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color={colors.textSecondary} mb={1}>
                Submitted
              </Text>
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={colors.textPrimary}
              >
                {formatDate(request.submitted_at || request.created_at)}
              </Text>
            </Box>
          </SimpleGrid>

          {/* Reason if exists */}
          {request.reason && (
            <Box p={3} bg={colors.inputBg} borderRadius="lg">
              <Text fontSize="xs" color={colors.textSecondary} mb={1}>
                Reason
              </Text>
              <Text fontSize="sm" color={colors.textPrimary}>
                {request.reason}
              </Text>
            </Box>
          )}

          {/* Review/Cancellation notes */}
          {request.status === "cancelled" && request.cancellation_reason && (
            <Box p={3} bg="red.50" borderRadius="lg" _dark={{ bg: "red.950" }}>
              <Text
                fontSize="xs"
                color="red.600"
                _dark={{ color: "red.400" }}
                mb={1}
              >
                Cancellation Reason
              </Text>
              <Text fontSize="sm" color="red.700" _dark={{ color: "red.300" }}>
                {request.cancellation_reason}
              </Text>
            </Box>
          )}

          {(request.status === "approved" || request.status === "denied") &&
            request.review_notes && (
              <Box p={3} bg={colors.inputBg} borderRadius="lg">
                <Text fontSize="xs" color={colors.textSecondary} mb={1}>
                  {request.status === "approved" ? "Approval" : "Denial"} Notes
                </Text>
                <Text fontSize="sm" color={colors.textPrimary}>
                  {request.review_notes}
                </Text>
              </Box>
            )}

          {/* Notes Input (for pending approval) */}
          {showNotes && (
            <Box p={3} bg={colors.inputBg} borderRadius="lg">
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={colors.textPrimary}
                mb={2}
              >
                Add a note (optional)
              </Text>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Enter any notes for this decision..."
                size="sm"
                rows={2}
                borderRadius="lg"
                bg={colors.cardBg}
              />
            </Box>
          )}

          {/* Actions */}
          {isPending && request.status === "pending" && (
            <Flex justify="flex-end" gap={2} flexWrap="wrap">
              <Tooltip content="Add a note to your decision">
                <IconButton
                  aria-label="Add notes"
                  size="sm"
                  variant={showNotes ? "solid" : "ghost"}
                  colorPalette={showNotes ? "brand" : "gray"}
                  onClick={() => setShowNotes(!showNotes)}
                  borderRadius="lg"
                >
                  <LuMessageSquare size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip content="Deny this request">
                <Box
                  as="button"
                  onClick={isProcessing ? undefined : handleDeny}
                  aria-disabled={isProcessing}
                  px={4}
                  py={2}
                  bg="red.500"
                  color="white"
                  borderRadius="lg"
                  fontSize="sm"
                  fontWeight="medium"
                  opacity={isProcessing ? 0.7 : 1}
                  cursor={isProcessing ? "not-allowed" : "pointer"}
                  _hover={{ bg: isProcessing ? "red.500" : "red.600" }}
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <LuX size={16} />
                  Deny
                </Box>
              </Tooltip>
              <Tooltip content="Approve this request">
                <Box
                  as="button"
                  onClick={isProcessing ? undefined : handleApprove}
                  aria-disabled={isProcessing}
                  px={4}
                  py={2}
                  bg="green.500"
                  color="white"
                  borderRadius="lg"
                  fontSize="sm"
                  fontWeight="medium"
                  opacity={isProcessing ? 0.7 : 1}
                  cursor={isProcessing ? "not-allowed" : "pointer"}
                  _hover={{ bg: isProcessing ? "green.500" : "green.600" }}
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <LuCheck size={16} />
                  Approve
                </Box>
              </Tooltip>
            </Flex>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

// Main Page Component
export default function TeamPage() {
  const [pendingRequests, setPendingRequests] = useState<TimeOffRequest[]>([]);
  const [allRequests, setAllRequests] = useState<TimeOffRequest[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  // All color hooks at the top level - never conditional
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const tabBg = useColorModeValue("gray.100", "gray.800");
  const activeTabBg = useColorModeValue("white", "gray.900");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const emptyStateBg = useColorModeValue("gray.100", "gray.800");
  const cancelBg = useColorModeValue("gray.200", "gray.700");
  const cancelHoverBg = useColorModeValue("gray.300", "gray.600");
  const isLight = useColorModeValue(true, false);

  // Bundle colors for passing to child components
  const colors: ColorProps = {
    textPrimary,
    textSecondary,
    cardBg,
    borderColor,
    inputBg,
    cancelBg,
    cancelHoverBg,
  };

  const fetchPending = useCallback(async () => {
    setIsLoadingPending(true);
    try {
      const data = await approvalService.getPendingApprovals();
      setPendingRequests(data);
      setPendingLoaded(true);
    } catch (error) {
      console.error("Failed to fetch pending requests:", error);
      setPendingRequests([]);
    } finally {
      setIsLoadingPending(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await approvalService.getApprovalHistory();
      setAllRequests(data);
      setHistoryLoaded(true);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      setAllRequests([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "pending" && !pendingLoaded && !isLoadingPending) {
      fetchPending();
    } else if (activeTab === "history" && !historyLoaded && !isLoadingHistory) {
      fetchHistory();
    }
  }, [
    activeTab,
    pendingLoaded,
    historyLoaded,
    isLoadingPending,
    isLoadingHistory,
    fetchPending,
    fetchHistory,
  ]);

  // Refresh data after approval/denial
  const refreshData = () => {
    setPendingLoaded(false);
    setHistoryLoaded(false);
    fetchPending();
  };

  const handleApprove = async (id: number, notes?: string) => {
    try {
      await approvalService.approve(id, notes);
      toaster.create({
        title: "Request approved",
        type: "success",
      });
      refreshData();
    } catch (error) {
      toaster.create({
        title: "Failed to approve",
        description:
          error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    }
  };

  const handleDeny = async (id: number, notes?: string) => {
    try {
      await approvalService.deny(id, notes);
      toaster.create({
        title: "Request denied",
        type: "success",
      });
      refreshData();
    } catch (error) {
      toaster.create({
        title: "Failed to deny",
        description:
          error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    }
  };

  const displayedRequests = useMemo(
    () => (activeTab === "pending" ? pendingRequests : allRequests),
    [activeTab, pendingRequests, allRequests],
  );

  return (
    <VStack gap={8} align="stretch">
      {/* Header */}
      <Box>
        <HStack gap={3} mb={2}>
          <Box
            p={2.5}
            borderRadius="xl"
            bg="linear-gradient(135deg, #00bc8b, #0095c1)"
          >
            <LuUsers size={24} color="white" />
          </Box>
          <Box>
            <Heading as="h1" size="2xl" color={textPrimary} fontWeight="bold">
              Team Requests
            </Heading>
            <Text color={textSecondary}>
              Review and manage your team&apos;s time-off requests
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
        <Card.Root
          bg={cardBg}
          borderRadius="xl"
          border="1px solid"
          borderColor={borderColor}
          overflow="hidden"
        >
          <Box h="3px" bg="amber.500" />
          <Card.Body p={4}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="sm" color={textSecondary}>
                  Pending Approval
                </Text>
                <Text fontSize="3xl" fontWeight="bold" color="amber.500">
                  {!pendingLoaded ? "—" : pendingRequests.length}
                </Text>
              </VStack>
              <Box
                p={3}
                borderRadius="xl"
                bg="amber.100"
                color="amber.600"
                _dark={{ bg: "amber.900", color: "amber.300" }}
              >
                <LuClock size={28} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>
        <Card.Root
          bg={cardBg}
          borderRadius="xl"
          border="1px solid"
          borderColor={borderColor}
          overflow="hidden"
        >
          <Box h="3px" bg="green.500" />
          <Card.Body p={4}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="sm" color={textSecondary}>
                  Approved This Month
                </Text>
                <Text fontSize="3xl" fontWeight="bold" color="green.500">
                  {!historyLoaded
                    ? "—"
                    : allRequests.filter((r) => r.status === "approved").length}
                </Text>
              </VStack>
              <Box
                p={3}
                borderRadius="xl"
                bg="green.100"
                color="green.600"
                _dark={{ bg: "green.900", color: "green.300" }}
              >
                <LuCircleCheck size={28} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {/* Tabs & Table */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(e) => setActiveTab(e.value)}
        variant="enclosed"
      >
        <Tabs.List bg={tabBg} p={1} borderRadius="xl" gap={1}>
          <Tabs.Trigger
            value="pending"
            px={6}
            py={2.5}
            borderRadius="lg"
            fontWeight="medium"
            fontSize="sm"
            _selected={{ bg: activeTabBg, shadow: "sm" }}
          >
            <HStack gap={2}>
              <LuClock size={16} />
              <Text>Pending</Text>
              {pendingRequests.length > 0 && (
                <Badge
                  bg="amber.500"
                  color="white"
                  borderRadius="full"
                  fontSize="xs"
                  px={1.5}
                >
                  {pendingRequests.length}
                </Badge>
              )}
            </HStack>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="history"
            px={6}
            py={2.5}
            borderRadius="lg"
            fontWeight="medium"
            fontSize="sm"
            _selected={{ bg: activeTabBg, shadow: "sm" }}
          >
            <HStack gap={2}>
              <LuCircleCheck size={16} />
              <Text>History</Text>
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

        <Box mt={6}>
          {activeTab === "calendar" ? (
            <TimeOffCalendar title="Team Calendar" />
          ) : (
              activeTab === "pending" ? isLoadingPending : isLoadingHistory
            ) ? (
            <VStack gap={4}>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  height="180px"
                  width="100%"
                  borderRadius="xl"
                />
              ))}
            </VStack>
          ) : displayedRequests.length === 0 ? (
            <Card.Root
              bg={cardBg}
              borderRadius="2xl"
              border="1px solid"
              borderColor={borderColor}
            >
              <Card.Body py={12}>
                <VStack gap={4}>
                  <Box p={5} borderRadius="full" bg={emptyStateBg}>
                    {activeTab === "pending" ? (
                      <LuCircleCheck
                        size={40}
                        color="var(--chakra-colors-green-500)"
                      />
                    ) : (
                      <LuClock
                        size={40}
                        color="var(--chakra-colors-gray-400)"
                      />
                    )}
                  </Box>
                  <VStack gap={1}>
                    <Text fontWeight="semibold" color={textPrimary}>
                      {activeTab === "pending"
                        ? "All caught up!"
                        : "No history yet"}
                    </Text>
                    <Text fontSize="sm" color={textSecondary}>
                      {activeTab === "pending"
                        ? "No pending requests to review"
                        : "Approved and denied requests will appear here"}
                    </Text>
                  </VStack>
                </VStack>
              </Card.Body>
            </Card.Root>
          ) : (
            <VStack gap={4} align="stretch">
              <Text fontSize="sm" color={textSecondary}>
                {displayedRequests.length} request
                {displayedRequests.length !== 1 ? "s" : ""}
                {activeTab === "pending"
                  ? " awaiting your review"
                  : " in history"}
              </Text>
              {displayedRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onApprove={handleApprove}
                  onDeny={handleDeny}
                  isPending={activeTab === "pending"}
                  colors={colors}
                  isLight={isLight}
                />
              ))}
            </VStack>
          )}
        </Box>
      </Tabs.Root>
    </VStack>
  );
}
