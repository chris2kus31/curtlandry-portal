"use client";

import { useEffect, useState, useCallback } from "react";
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
  Table,
  IconButton,
  Textarea,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
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
} from "react-icons/lu";
import { httpClient } from "@/lib/api";

// Types
interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  department?: string;
  job_title?: string;
}

interface TimeOffRequest {
  id: number;
  user: TeamMember;
  type: {
    id: number;
    code: string;
    name: string;
    color: string;
  };
  start_date: string;
  end_date: string;
  total_hours: number;
  status: "pending" | "approved" | "denied" | "cancelled";
  notes: string | null;
  created_at: string;
}

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
      return { bg: isLight ? "green.100" : "green.900", color: isLight ? "green.700" : "green.200" };
    case "pending":
      return { bg: isLight ? "amber.100" : "amber.900", color: isLight ? "amber.700" : "amber.200" };
    case "denied":
      return { bg: isLight ? "red.100" : "red.900", color: isLight ? "red.700" : "red.200" };
    case "cancelled":
      return { bg: isLight ? "gray.100" : "gray.800", color: isLight ? "gray.600" : "gray.400" };
    default:
      return { bg: isLight ? "gray.100" : "gray.800", color: isLight ? "gray.600" : "gray.400" };
  }
}

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

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

// Request Row Component - receives colors as props to avoid hook issues
function RequestRow({
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
    <>
      <Table.Row>
        <Table.Cell>
          <VStack align="start" gap={0}>
            <Text fontWeight="medium" color={colors.textPrimary}>
              {request.user.first_name} {request.user.last_name}
            </Text>
            <Text fontSize="xs" color={colors.textSecondary}>
              {request.user.job_title || request.user.email}
            </Text>
          </VStack>
        </Table.Cell>
        <Table.Cell>
          <HStack gap={2}>
            <Box w={2} h={2} borderRadius="full" bg={request.type.color} />
            <Text color={colors.textPrimary}>{request.type.name}</Text>
          </HStack>
        </Table.Cell>
        <Table.Cell>
          <Text color={colors.textPrimary}>{formatDateRange(request.start_date, request.end_date)}</Text>
        </Table.Cell>
        <Table.Cell>
          <Text color={colors.textPrimary}>{request.total_hours} hrs</Text>
        </Table.Cell>
        <Table.Cell>
          <Badge
            bg={status.bg}
            color={status.color}
            px={2}
            py={0.5}
            borderRadius="full"
            fontSize="xs"
            fontWeight="medium"
            textTransform="capitalize"
          >
            <HStack gap={1}>
              {getStatusIcon(request.status)}
              <Text>{request.status}</Text>
            </HStack>
          </Badge>
        </Table.Cell>
        <Table.Cell>
          <Text fontSize="sm" color={colors.textSecondary}>
            {formatDate(request.created_at)}
          </Text>
        </Table.Cell>
        <Table.Cell>
          {isPending && request.status === "pending" && (
            <HStack gap={1}>
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
              <IconButton
                aria-label="Approve"
                size="sm"
                variant="ghost"
                colorPalette="green"
                onClick={handleApprove}
                disabled={isProcessing}
                borderRadius="lg"
              >
                <LuCheck size={18} />
              </IconButton>
              <IconButton
                aria-label="Deny"
                size="sm"
                variant="ghost"
                colorPalette="red"
                onClick={handleDeny}
                disabled={isProcessing}
                borderRadius="lg"
              >
                <LuX size={18} />
              </IconButton>
            </HStack>
          )}
        </Table.Cell>
      </Table.Row>
      {showNotes && (
        <Table.Row>
          <Table.Cell colSpan={7} py={2}>
            <Box px={4} py={3} bg={colors.inputBg} borderRadius="lg">
              <Text fontSize="sm" fontWeight="medium" color={colors.textPrimary} mb={2}>
                Add a note (optional)
              </Text>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Enter any notes for this decision..."
                size="sm"
                rows={2}
                borderRadius="lg"
              />
              <HStack mt={3} gap={2}>
                <Box
                  as="button"
                  px={4}
                  py={2}
                  bg="green.500"
                  color="white"
                  borderRadius="lg"
                  fontSize="sm"
                  fontWeight="medium"
                  onClick={handleApprove}
                  aria-disabled={isProcessing}
                  opacity={isProcessing ? 0.7 : 1}
                  cursor={isProcessing ? "not-allowed" : "pointer"}
                  _hover={{ bg: "green.600" }}
                >
                  Approve
                </Box>
                <Box
                  as="button"
                  px={4}
                  py={2}
                  bg="red.500"
                  color="white"
                  borderRadius="lg"
                  fontSize="sm"
                  fontWeight="medium"
                  onClick={handleDeny}
                  aria-disabled={isProcessing}
                  opacity={isProcessing ? 0.7 : 1}
                  cursor={isProcessing ? "not-allowed" : "pointer"}
                  _hover={{ bg: "red.600" }}
                >
                  Deny
                </Box>
                <Box
                  as="button"
                  px={4}
                  py={2}
                  bg={colors.cancelBg}
                  color={colors.textPrimary}
                  borderRadius="lg"
                  fontSize="sm"
                  fontWeight="medium"
                  onClick={() => {
                    setShowNotes(false);
                    setApprovalNotes("");
                  }}
                  cursor="pointer"
                  _hover={{ bg: colors.cancelHoverBg }}
                >
                  Cancel
                </Box>
              </HStack>
            </Box>
          </Table.Cell>
        </Table.Row>
      )}
    </>
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
      const res = await httpClient.get<{ data: TimeOffRequest[] }>(
        "/portal/approvals/pending"
      );
      setPendingRequests(res.data || []);
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
      const res = await httpClient.get<{ data: TimeOffRequest[] }>(
        "/portal/approvals/history"
      );
      setAllRequests(res.data || []);
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
  }, [activeTab, pendingLoaded, historyLoaded, isLoadingPending, isLoadingHistory, fetchPending, fetchHistory]);

  // Refresh data after approval/denial
  const refreshData = () => {
    setPendingLoaded(false);
    setHistoryLoaded(false);
    fetchPending();
  };

  const handleApprove = async (id: number, notes?: string) => {
    try {
      await httpClient.post(`/portal/approvals/${id}/approve`, { notes });
      toaster.create({
        title: "Request approved",
        type: "success",
      });
      refreshData();
    } catch (error) {
      toaster.create({
        title: "Failed to approve",
        description: error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    }
  };

  const handleDeny = async (id: number, notes?: string) => {
    try {
      await httpClient.post(`/portal/approvals/${id}/deny`, { notes });
      toaster.create({
        title: "Request denied",
        type: "success",
      });
      refreshData();
    } catch (error) {
      toaster.create({
        title: "Failed to deny",
        description: error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    }
  };

  const displayedRequests = activeTab === "pending" ? pendingRequests : allRequests;

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
      <HStack gap={4}>
        <Card.Root bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor} p={4} flex={1}>
          <Card.Body p={0}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="sm" color={textSecondary}>Pending Approval</Text>
                <Text fontSize="2xl" fontWeight="bold" color="amber.500">
                  {!pendingLoaded ? "—" : pendingRequests.length}
                </Text>
              </VStack>
              <Box p={3} borderRadius="lg" bg="amber.100" color="amber.600">
                <LuClock size={24} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>
        <Card.Root bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor} p={4} flex={1}>
          <Card.Body p={0}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="sm" color={textSecondary}>Approved This Month</Text>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {!historyLoaded ? "—" : allRequests.filter(r => r.status === "approved").length}
                </Text>
              </VStack>
              <Box p={3} borderRadius="lg" bg="green.100" color="green.600">
                <LuCircleCheck size={24} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>
      </HStack>

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
                <Badge bg="amber.500" color="white" borderRadius="full" fontSize="xs" px={1.5}>
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
        </Tabs.List>

        <Box mt={6}>
          <Card.Root bg={cardBg} borderRadius="2xl" border="1px solid" borderColor={borderColor} overflow="hidden">
            <Card.Body p={0}>
              {(activeTab === "pending" ? isLoadingPending : isLoadingHistory) ? (
                <VStack p={8} gap={4}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height="60px" width="100%" borderRadius="lg" />
                  ))}
                </VStack>
              ) : displayedRequests.length === 0 ? (
                <VStack py={12} gap={3}>
                  <Box p={4} borderRadius="full" bg={emptyStateBg}>
                    {activeTab === "pending" ? (
                      <LuClock size={32} color="var(--chakra-colors-gray-400)" />
                    ) : (
                      <LuCircleCheck size={32} color="var(--chakra-colors-gray-400)" />
                    )}
                  </Box>
                  <Text color={textSecondary}>
                    {activeTab === "pending"
                      ? "No pending requests to review"
                      : "No request history yet"}
                  </Text>
                </VStack>
              ) : (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Employee</Table.ColumnHeader>
                      <Table.ColumnHeader>Type</Table.ColumnHeader>
                      <Table.ColumnHeader>Dates</Table.ColumnHeader>
                      <Table.ColumnHeader>Duration</Table.ColumnHeader>
                      <Table.ColumnHeader>Status</Table.ColumnHeader>
                      <Table.ColumnHeader>Submitted</Table.ColumnHeader>
                      <Table.ColumnHeader>Actions</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {displayedRequests.map((request) => (
                      <RequestRow
                        key={request.id}
                        request={request}
                        onApprove={handleApprove}
                        onDeny={handleDeny}
                        isPending={activeTab === "pending"}
                        colors={colors}
                        isLight={isLight}
                      />
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
            </Card.Body>
          </Card.Root>
        </Box>
      </Tabs.Root>
    </VStack>
  );
}
