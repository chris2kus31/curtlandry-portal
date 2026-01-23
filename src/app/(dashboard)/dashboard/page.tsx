"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Card,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
  Skeleton,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useColorModeValue } from "@/components/ui/color-mode";
import {
  LuCalendar,
  LuClock,
  LuFileText,
  LuCircleCheck,
  LuCircleDashed,
  LuCircleX,
  LuPlus,
} from "react-icons/lu";
import {
  timeOffService,
  type TimeOffBalance,
  type TimeOffRequest,
} from "@/lib/api";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function StatCard({ title, value, subtitle, icon, isLoading }: StatCardProps) {
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");

  return (
    <Card.Root
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      p={5}
      transition="all 0.2s"
      _hover={{ shadow: "md", borderColor: "brand.200" }}
    >
      <Card.Body p={0}>
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={1}>
            <Text fontSize="sm" color={textSecondary} fontWeight="medium">
              {title}
            </Text>
            {isLoading ? (
              <Skeleton height="32px" width="80px" />
            ) : (
              <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                {value}
              </Text>
            )}
            {subtitle && (
              <Text fontSize="xs" color={textSecondary}>
                {subtitle}
              </Text>
            )}
          </VStack>
          <Box
            p={3}
            borderRadius="xl"
            bg="linear-gradient(135deg, rgba(0, 188, 139, 0.1) 0%, rgba(0, 149, 193, 0.1) 100%)"
          >
            {icon}
          </Box>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

function QuickAction({
  title,
  description,
  icon,
  href,
  onClick,
}: QuickActionProps) {
  const router = useRouter();
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <Card.Root
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      p={4}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        shadow: "md",
        borderColor: "brand.300",
        transform: "translateY(-2px)",
      }}
      onClick={handleClick}
    >
      <Card.Body p={0}>
        <HStack gap={4}>
          <Box
            p={3}
            borderRadius="lg"
            bg="linear-gradient(135deg, #00bc8b 0%, #0095c1 100%)"
          >
            {icon}
          </Box>
          <VStack align="start" gap={0.5}>
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
              {title}
            </Text>
            <Text fontSize="xs" color={textSecondary}>
              {description}
            </Text>
          </VStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}

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

function getStatusColor(status: string) {
  switch (status) {
    case "approved":
      return { bg: "green.100", color: "green.600" };
    case "pending":
      return { bg: "yellow.100", color: "yellow.600" };
    case "denied":
      return { bg: "red.100", color: "red.600" };
    case "cancelled":
      return { bg: "gray.100", color: "gray.600" };
    default:
      return { bg: "gray.100", color: "gray.600" };
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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [balances, setBalances] = useState<TimeOffBalance[]>([]);
  const [recentRequests, setRecentRequests] = useState<TimeOffRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        // Fetch all data in parallel
        const [balancesData, requestsData] = await Promise.all([
          timeOffService.getBalances().catch(() => []),
          timeOffService.getRequests({ per_page: 5 }).catch(() => ({ data: [] })),
        ]);

        setBalances(balancesData);
        setRecentRequests(requestsData.data || []);

        // Count pending requests
        const pending = (requestsData.data || []).filter(
          (r) => r.status === "pending"
        ).length;
        setPendingCount(pending);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Calculate PTO balance summary
  const ptoBalance = balances.find((b) => b.type.code === "PTO");
  const ptoAvailable = ptoBalance?.available ?? 0;
  const ptoDays = Math.floor(ptoAvailable / 8);

  // Calculate days used this year
  const currentYear = new Date().getFullYear();
  const approvedThisYear = recentRequests.filter(
    (r) =>
      r.status === "approved" &&
      new Date(r.start_date).getFullYear() === currentYear
  );
  const hoursUsedThisYear = approvedThisYear.reduce(
    (sum, r) => sum + r.total_hours,
    0
  );
  const daysUsedThisYear = Math.round(hoursUsedThisYear / 8);

  return (
    <VStack gap={8} align="stretch">
      {/* Welcome Section */}
      <Box>
        <Heading as="h1" size="xl" color={textPrimary} fontWeight="bold">
          {getGreeting()}, {user?.first_name || "there"}! 👋
        </Heading>
        <Text color={textSecondary} mt={1}>
          Here&apos;s what&apos;s happening with your time off.
        </Text>
      </Box>

      {/* Stats Grid */}
      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
        }}
        gap={4}
      >
        <StatCard
          title="PTO Balance"
          value={isLoading ? "—" : `${ptoAvailable} hrs`}
          subtitle={
            isLoading
              ? undefined
              : ptoBalance
                ? `${ptoDays} days available`
                : "No balance set up"
          }
          icon={<LuClock size={24} color="#00bc8b" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Requests"
          value={isLoading ? "—" : String(pendingCount)}
          subtitle={
            isLoading
              ? undefined
              : pendingCount === 0
                ? "All requests processed"
                : "Awaiting approval"
          }
          icon={<LuFileText size={24} color="#0095c1" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Days Used This Year"
          value={isLoading ? "—" : String(daysUsedThisYear)}
          subtitle={isLoading ? undefined : `${hoursUsedThisYear} hours in ${currentYear}`}
          icon={<LuCalendar size={24} color="#6d2891" />}
          isLoading={isLoading}
        />
      </Grid>

      {/* Quick Actions */}
      <Box>
        <Heading as="h2" size="md" color={textPrimary} mb={4}>
          Quick Actions
        </Heading>
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
          }}
          gap={4}
        >
          <QuickAction
            title="Request Time Off"
            description="Submit a new PTO request"
            icon={<LuPlus size={20} color="white" />}
            href="/time-off"
          />
          <QuickAction
            title="View My Requests"
            description="Check status and balances"
            icon={<LuFileText size={20} color="white" />}
            href="/time-off"
          />
        </Grid>
      </Box>

      {/* Recent Requests */}
      <Box>
        <HStack justify="space-between" mb={4}>
          <Heading as="h2" size="md" color={textPrimary}>
            Recent Requests
          </Heading>
          {recentRequests.length > 0 && (
            <Text
              fontSize="sm"
              color="brand.500"
              cursor="pointer"
              _hover={{ textDecoration: "underline" }}
              onClick={() => router.push("/time-off")}
            >
              View all
            </Text>
          )}
        </HStack>
        <Card.Root
          bg={cardBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="xl"
          p={6}
        >
          <Card.Body p={0}>
            {isLoading ? (
              <VStack align="stretch" gap={4}>
                {[1, 2, 3].map((i) => (
                  <HStack key={i} gap={3}>
                    <Skeleton borderRadius="full" boxSize="32px" />
                    <VStack align="start" gap={1} flex={1}>
                      <Skeleton height="16px" width="200px" />
                      <Skeleton height="12px" width="150px" />
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            ) : recentRequests.length === 0 ? (
              <VStack py={8} gap={3}>
                <Box
                  p={4}
                  borderRadius="full"
                  bg="gray.100"
                  color="gray.400"
                >
                  <LuCalendar size={32} />
                </Box>
                <Text color={textSecondary} textAlign="center">
                  No time-off requests yet
                </Text>
                <Text
                  fontSize="sm"
                  color="brand.500"
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                  onClick={() => router.push("/time-off")}
                >
                  Submit your first request
                </Text>
              </VStack>
            ) : (
              <VStack align="stretch" gap={4}>
                {recentRequests.map((request, index) => {
                  const statusColors = getStatusColor(request.status);
                  return (
                    <Box key={request.id}>
                      {index > 0 && <Box h="1px" bg={borderColor} mb={4} />}
                      <HStack gap={3}>
                        <Box
                          p={2}
                          borderRadius="full"
                          bg={statusColors.bg}
                          color={statusColors.color}
                        >
                          {getStatusIcon(request.status)}
                        </Box>
                        <VStack align="start" gap={0} flex={1}>
                          <HStack gap={2}>
                            <Text fontSize="sm" color={textPrimary} fontWeight="medium">
                              {request.type.name}
                            </Text>
                            <Text
                              fontSize="xs"
                              px={2}
                              py={0.5}
                              borderRadius="full"
                              bg={statusColors.bg}
                              color={statusColors.color}
                              fontWeight="medium"
                              textTransform="capitalize"
                            >
                              {request.status}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color={textSecondary}>
                            {formatDateRange(request.start_date, request.end_date)} •{" "}
                            {request.total_hours} hours
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </Card.Body>
        </Card.Root>
      </Box>
    </VStack>
  );
}
