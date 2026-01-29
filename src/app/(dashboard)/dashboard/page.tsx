"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Card,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
  Skeleton,
  Badge,
  Avatar,
  Icon,
  Flex,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useColorModeValue } from "@/components/ui/color-mode";
import {
  LuClock,
  LuFileText,
  LuPlus,
  LuMegaphone,
  LuNewspaper,
  LuMessageSquare,
  LuCake,
  LuPartyPopper,
  LuChevronRight,
  LuBriefcase,
  LuTriangleAlert,
  LuSparkles,
  LuFolderOpen,
  LuBookOpen,
  LuShield,
  LuDollarSign,
  LuHeart,
  LuExternalLink,
  LuCalendarDays,
  LuTrendingUp,
} from "react-icons/lu";
import { timeOffService, type TimeOffBalance } from "@/lib/api";

// ============================================================================
// TYPES
// ============================================================================

interface Post {
  id: number;
  title: string;
  content: string;
  type: "announcement" | "news" | "staff_message";
  priority: "normal" | "important" | "urgent";
  category: string;
  author: {
    name: string;
    avatar?: string;
  };
  createdAt: string;
  isRead: boolean;
  isPinned: boolean;
}

interface Celebration {
  id: number;
  type: "birthday" | "anniversary";
  user: {
    name: string;
    avatar?: string;
    department: string;
  };
  date: string;
  years?: number;
  isMilestone?: boolean;
}

interface Resource {
  id: number;
  title: string;
  description: string;
  category: "handbook" | "policy" | "benefits" | "forms" | "training";
  url: string;
  icon: "book" | "shield" | "heart" | "file" | "folder";
}

// ============================================================================
// HELPER FUNCTIONS (moved outside component to prevent recreation)
// ============================================================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getPostTypeIcon(type: Post["type"]) {
  switch (type) {
    case "announcement":
      return <LuMegaphone size={14} />;
    case "news":
      return <LuNewspaper size={14} />;
    case "staff_message":
      return <LuMessageSquare size={14} />;
  }
}

function getPostTypeColor(type: Post["type"]): string {
  switch (type) {
    case "announcement":
      return "blue";
    case "news":
      return "purple";
    case "staff_message":
      return "green";
  }
}

function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_POSTS: Post[] = [
  {
    id: 1,
    title: "Office Closed for Martin Luther King Jr. Day",
    content:
      "Please note that the office will be closed on Monday, January 20th in observance of Martin Luther King Jr. Day. Regular business hours will resume on Tuesday.",
    type: "announcement",
    priority: "important",
    category: "HR",
    author: { name: "HR Team" },
    createdAt: "2026-01-17",
    isRead: false,
    isPinned: true,
  },
  {
    id: 2,
    title: "Mandatory Security Awareness Training - Due Feb 14th",
    content:
      "All employees are required to complete the annual Security Awareness Training by February 14th. The training covers phishing prevention, password security, and data protection. Access the training through the Learning Portal. Contact IT if you have any questions.",
    type: "announcement",
    priority: "important",
    category: "Training",
    author: { name: "IT Security Team" },
    createdAt: "2026-01-20",
    isRead: false,
    isPinned: true,
  },
  {
    id: 3,
    title: "New PTO Portal Now Live!",
    content:
      "We're excited to announce the launch of our new Employee Portal! You can now request time off, view your balances, and track your requests all in one place.",
    type: "announcement",
    priority: "normal",
    category: "IT",
    author: { name: "Chris Moreno" },
    createdAt: "2026-01-15",
    isRead: true,
    isPinned: false,
  },
  {
    id: 4,
    title: "Welcome Sarah Johnson to the Team!",
    content:
      "Please join us in welcoming Sarah Johnson as our new Marketing Coordinator. Sarah comes to us with 5 years of experience in digital marketing. Say hi when you see her!",
    type: "staff_message",
    priority: "normal",
    category: "Kudos",
    author: { name: "Maria Garcia" },
    createdAt: "2026-01-14",
    isRead: false,
    isPinned: false,
  },
  {
    id: 5,
    title: "Q1 All-Hands Meeting Scheduled",
    content:
      "Mark your calendars! Our Q1 All-Hands meeting is scheduled for Friday, January 31st at 2:00 PM in the main conference room. Remote employees can join via Zoom.",
    type: "news",
    priority: "normal",
    category: "Events",
    author: { name: "Leadership Team" },
    createdAt: "2026-01-13",
    isRead: true,
    isPinned: false,
  },
  {
    id: 6,
    title: "Great job on the Website Launch!",
    content:
      "Huge shoutout to the Web Dev team for the successful website redesign launch! Your hard work and dedication made this possible. Thank you!",
    type: "staff_message",
    priority: "normal",
    category: "Kudos",
    author: { name: "Curt Landry" },
    createdAt: "2026-01-10",
    isRead: true,
    isPinned: false,
  },
];

const MOCK_RESOURCES: Resource[] = [
  {
    id: 1,
    title: "Employee Handbook",
    description: "Company policies and guidelines",
    category: "handbook",
    url: "#",
    icon: "book",
  },
  {
    id: 2,
    title: "PTO Policy",
    description: "Time-off rules and procedures",
    category: "policy",
    url: "#",
    icon: "shield",
  },
  {
    id: 3,
    title: "Benefits Guide",
    description: "Health, dental, and retirement info",
    category: "benefits",
    url: "#",
    icon: "heart",
  },
  {
    id: 4,
    title: "Expense Report Form",
    description: "Submit expense reimbursements",
    category: "forms",
    url: "#",
    icon: "file",
  },
  {
    id: 5,
    title: "IT Help Desk",
    description: "Submit tech support requests",
    category: "forms",
    url: "#",
    icon: "folder",
  },
];

const MOCK_CELEBRATIONS: Celebration[] = [
  {
    id: 1,
    type: "birthday",
    user: { name: "John Smith", department: "Operations" },
    date: "2026-01-23",
  },
  {
    id: 2,
    type: "anniversary",
    user: { name: "Bob Wilson", department: "Finance" },
    date: "2026-01-24",
    years: 7,
    isMilestone: false,
  },
  {
    id: 3,
    type: "birthday",
    user: { name: "Maria Garcia", department: "HR" },
    date: "2026-01-25",
  },
  {
    id: 4,
    type: "anniversary",
    user: { name: "Tom Lee", department: "IT" },
    date: "2026-01-28",
    years: 5,
    isMilestone: true,
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function UrgentBanner({ posts }: { posts: Post[] }) {
  const urgentPosts = posts.filter((p) => p.priority === "urgent" && !p.isRead);
  const bgColor = useColorModeValue("red.50", "rgba(254, 202, 202, 0.1)");
  const borderColor = useColorModeValue("red.200", "red.800");
  const textColor = useColorModeValue("red.700", "red.300");
  const iconBg = useColorModeValue("red.100", "red.900");

  if (urgentPosts.length === 0) return null;

  return (
    <Box
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      p={4}
      mb={6}
    >
      <HStack gap={3}>
        <Flex
          p={2}
          borderRadius="lg"
          bg={iconBg}
          color={textColor}
          align="center"
          justify="center"
        >
          <LuTriangleAlert size={18} />
        </Flex>
        <Box flex={1}>
          <Text fontWeight="semibold" color={textColor} fontSize="sm">
            {urgentPosts[0].title}
          </Text>
          <Text fontSize="xs" color={textColor} opacity={0.8} lineClamp={1}>
            {urgentPosts[0].content}
          </Text>
        </Box>
        <Icon color={textColor} cursor="pointer">
          <LuChevronRight size={18} />
        </Icon>
      </HStack>
    </Box>
  );
}

function PostCard({ post }: { post: Post }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const unreadBorder = useColorModeValue("brand.400", "brand.500");
  const hoverBg = useColorModeValue("gray.50", "gray.750");

  // Additional theme colors for avatar
  const avatarBg = useColorModeValue("brand.100", "brand.900");
  const avatarColor = useColorModeValue("brand.700", "brand.200");

  // Memoize computed values
  const typeIcon = useMemo(() => getPostTypeIcon(post.type), [post.type]);
  const typeColor = useMemo(() => getPostTypeColor(post.type), [post.type]);
  const formattedDate = useMemo(
    () => formatRelativeDate(post.createdAt),
    [post.createdAt],
  );

  return (
    <Card.Root
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      borderLeft={!post.isRead ? "3px solid" : "1px solid"}
      borderLeftColor={!post.isRead ? unreadBorder : borderColor}
      borderRadius="xl"
      overflow="hidden"
      transition="all 0.2s ease"
      _hover={{
        shadow: "md",
        bg: hoverBg,
        transform: "translateY(-1px)",
      }}
      cursor="pointer"
    >
      <Card.Body p={{ base: 4, md: 5 }}>
        <VStack align="stretch" gap={3}>
          {/* Header with badges */}
          <Flex
            justify="space-between"
            align="flex-start"
            flexWrap="wrap"
            gap={2}
          >
            <HStack gap={2} flexWrap="wrap">
              <Badge
                colorPalette={typeColor}
                size="sm"
                variant="subtle"
                px={2}
                py={0.5}
                borderRadius="md"
              >
                <HStack gap={1}>
                  {typeIcon}
                  <Text textTransform="capitalize" fontSize="xs">
                    {post.type.replace("_", " ")}
                  </Text>
                </HStack>
              </Badge>
              <Badge
                colorPalette="gray"
                size="sm"
                variant="outline"
                px={2}
                py={0.5}
                borderRadius="md"
              >
                <Text fontSize="xs">{post.category}</Text>
              </Badge>
              {post.priority === "important" && (
                <Badge
                  colorPalette="orange"
                  size="sm"
                  px={2}
                  py={0.5}
                  borderRadius="md"
                >
                  <Text fontSize="xs">Important</Text>
                </Badge>
              )}
              {post.isPinned && (
                <Badge
                  colorPalette="yellow"
                  size="sm"
                  px={2}
                  py={0.5}
                  borderRadius="md"
                >
                  <Text fontSize="xs">Pinned</Text>
                </Badge>
              )}
            </HStack>
            {!post.isRead && (
              <Box
                w={2}
                h={2}
                borderRadius="full"
                bg="brand.500"
                flexShrink={0}
              />
            )}
          </Flex>

          {/* Content */}
          <Box>
            <Text
              fontWeight="semibold"
              color={textPrimary}
              mb={1.5}
              fontSize={{ base: "sm", md: "md" }}
              lineHeight="short"
            >
              {post.title}
            </Text>
            <Text
              fontSize={{ base: "xs", md: "sm" }}
              color={textSecondary}
              lineClamp={2}
              lineHeight="tall"
            >
              {post.content}
            </Text>
          </Box>

          {/* Footer */}
          <Flex
            justify="space-between"
            align="center"
            pt={1}
            borderTop="1px solid"
            borderColor={borderColor}
          >
            <HStack gap={2}>
              <Avatar.Root size="xs">
                <Avatar.Fallback
                  fontSize="xs"
                  bg={avatarBg}
                  color={avatarColor}
                >
                  {post.author.name.charAt(0)}
                </Avatar.Fallback>
              </Avatar.Root>
              <Text fontSize="xs" color={textSecondary} fontWeight="medium">
                {post.author.name}
              </Text>
            </HStack>
            <Text fontSize="xs" color={textSecondary}>
              {formattedDate}
            </Text>
          </Flex>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

function CelebrationWidget({ celebrations }: { celebrations: Celebration[] }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.750");
  const birthdayBg = useColorModeValue("pink.50", "rgba(251, 207, 232, 0.1)");
  const birthdayColor = useColorModeValue("pink.600", "pink.300");
  const anniversaryBg = useColorModeValue(
    "purple.50",
    "rgba(221, 214, 254, 0.1)",
  );
  const anniversaryColor = useColorModeValue("purple.600", "purple.300");

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const celebDate = new Date(date);
    celebDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (celebDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card.Root
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      overflow="hidden"
    >
      <Box
        bgGradient="to-r"
        gradientFrom="brand.500"
        gradientTo="cyan.500"
        px={4}
        py={3}
      >
        <HStack gap={2}>
          <LuPartyPopper size={16} color="white" />
          <Text fontWeight="semibold" color="white" fontSize="sm">
            Celebrations
          </Text>
        </HStack>
      </Box>
      <Card.Body p={0}>
        <VStack align="stretch" gap={0} divideY="1px" divideColor={borderColor}>
          {celebrations.length === 0 ? (
            <Box p={4} textAlign="center">
              <Text fontSize="sm" color={textSecondary}>
                No upcoming celebrations
              </Text>
            </Box>
          ) : (
            celebrations.map((celebration) => (
              <HStack
                key={celebration.id}
                p={3}
                gap={3}
                _hover={{ bg: hoverBg }}
                transition="background 0.2s"
              >
                <Flex
                  p={2}
                  borderRadius="lg"
                  bg={
                    celebration.type === "birthday" ? birthdayBg : anniversaryBg
                  }
                  color={
                    celebration.type === "birthday"
                      ? birthdayColor
                      : anniversaryColor
                  }
                  align="center"
                  justify="center"
                >
                  {celebration.type === "birthday" ? (
                    <LuCake size={16} />
                  ) : (
                    <LuBriefcase size={16} />
                  )}
                </Flex>
                <Box flex={1} minW={0}>
                  <HStack gap={1}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={textPrimary}
                      truncate
                    >
                      {celebration.user.name}
                    </Text>
                    {celebration.isMilestone && (
                      <LuSparkles size={12} color="#f59e0b" />
                    )}
                  </HStack>
                  <Text fontSize="xs" color={textSecondary}>
                    {celebration.type === "birthday"
                      ? "Birthday"
                      : `${celebration.years} Year${celebration.years !== 1 ? "s" : ""}`}
                    {celebration.isMilestone && " 🎉"}
                  </Text>
                </Box>
                <Badge
                  colorPalette={
                    formatDate(celebration.date) === "Today" ? "green" : "gray"
                  }
                  size="sm"
                  variant="subtle"
                  px={2}
                  py={0.5}
                  borderRadius="md"
                >
                  <Text fontSize="xs">{formatDate(celebration.date)}</Text>
                </Badge>
              </HStack>
            ))
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

function ResourcesWidget({ resources }: { resources: Resource[] }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.750");

  // Icon style colors - hooks at component level
  const handbookBg = useColorModeValue("blue.50", "rgba(191, 219, 254, 0.1)");
  const handbookColor = useColorModeValue("blue.600", "blue.300");
  const policyBg = useColorModeValue("purple.50", "rgba(221, 214, 254, 0.1)");
  const policyColor = useColorModeValue("purple.600", "purple.300");
  const benefitsBg = useColorModeValue("pink.50", "rgba(251, 207, 232, 0.1)");
  const benefitsColor = useColorModeValue("pink.600", "pink.300");
  const formsBg = useColorModeValue("green.50", "rgba(187, 247, 208, 0.1)");
  const formsColor = useColorModeValue("green.600", "green.300");
  const trainingBg = useColorModeValue("orange.50", "rgba(254, 215, 170, 0.1)");
  const trainingColor = useColorModeValue("orange.600", "orange.300");

  const getIcon = (icon: Resource["icon"]) => {
    switch (icon) {
      case "book":
        return <LuBookOpen size={14} />;
      case "shield":
        return <LuShield size={14} />;
      case "heart":
        return <LuHeart size={14} />;
      case "file":
        return <LuDollarSign size={14} />;
      case "folder":
        return <LuFolderOpen size={14} />;
    }
  };

  const getIconStyle = (category: Resource["category"]) => {
    const styles = {
      handbook: { bg: handbookBg, color: handbookColor },
      policy: { bg: policyBg, color: policyColor },
      benefits: { bg: benefitsBg, color: benefitsColor },
      forms: { bg: formsBg, color: formsColor },
      training: { bg: trainingBg, color: trainingColor },
    };
    return styles[category];
  };

  return (
    <Card.Root
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      overflow="hidden"
    >
      <Box
        bgGradient="to-r"
        gradientFrom="purple.500"
        gradientTo="blue.500"
        px={4}
        py={3}
      >
        <HStack gap={2}>
          <LuFolderOpen size={16} color="white" />
          <Text fontWeight="semibold" color="white" fontSize="sm">
            Documents & Resources
          </Text>
        </HStack>
      </Box>
      <Card.Body p={0}>
        <VStack align="stretch" gap={0} divideY="1px" divideColor={borderColor}>
          {resources.map((resource) => {
            const iconStyle = getIconStyle(resource.category);
            return (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <HStack
                  p={3}
                  gap={3}
                  cursor="pointer"
                  _hover={{ bg: hoverBg }}
                  transition="all 0.2s"
                >
                  <Flex
                    p={2}
                    borderRadius="lg"
                    bg={iconStyle.bg}
                    color={iconStyle.color}
                    align="center"
                    justify="center"
                  >
                    {getIcon(resource.icon)}
                  </Flex>
                  <Box flex={1} minW={0}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={textPrimary}
                      truncate
                    >
                      {resource.title}
                    </Text>
                    <Text fontSize="xs" color={textSecondary} truncate>
                      {resource.description}
                    </Text>
                  </Box>
                  <Icon color={textSecondary} flexShrink={0}>
                    <LuExternalLink size={14} />
                  </Icon>
                </HStack>
              </a>
            );
          })}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

function QuickActionsWidget() {
  const router = useRouter();
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.750");

  const actions = [
    {
      title: "Request Time Off",
      icon: LuPlus,
      href: "/time-off",
      gradient: "linear-gradient(135deg, #00bc8b 0%, #0095c1 100%)",
    },
    {
      title: "View My Requests",
      icon: LuFileText,
      href: "/time-off",
      gradient: "linear-gradient(135deg, #6d2891 0%, #0095c1 100%)",
    },
  ];

  return (
    <Card.Root
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      overflow="hidden"
    >
      <Card.Body p={0}>
        <VStack align="stretch" gap={0} divideY="1px" divideColor={borderColor}>
          {actions.map((action) => (
            <HStack
              key={action.title}
              p={3}
              gap={3}
              cursor="pointer"
              _hover={{ bg: hoverBg }}
              onClick={() => router.push(action.href)}
              transition="all 0.2s"
            >
              <Flex
                p={2}
                borderRadius="lg"
                bg={action.gradient}
                align="center"
                justify="center"
              >
                <action.icon size={16} color="white" />
              </Flex>
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={textPrimary}
                flex={1}
              >
                {action.title}
              </Text>
              <Icon color={textSecondary}>
                <LuChevronRight size={16} />
              </Icon>
            </HStack>
          ))}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

function PTOSummaryWidget({
  balance,
  isLoading,
}: {
  balance: TimeOffBalance | undefined;
  isLoading: boolean;
}) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const statBg = useColorModeValue("gray.50", "gray.750");

  const available = balance?.available ?? 0;
  const days = Math.floor(available / 8);
  const accrualRate = balance?.tier?.accrual_rate ?? 0;

  return (
    <Card.Root
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      overflow="hidden"
    >
      <Box
        bgGradient="to-r"
        gradientFrom="brand.500"
        gradientTo="teal.400"
        px={4}
        py={3}
      >
        <HStack gap={2}>
          <LuClock size={16} color="white" />
          <Text fontWeight="semibold" color="white" fontSize="sm">
            PTO Balance
          </Text>
        </HStack>
      </Box>
      <Card.Body p={4}>
        {isLoading ? (
          <VStack align="stretch" gap={3}>
            <Skeleton height="40px" borderRadius="lg" />
            <Skeleton height="20px" width="60%" />
          </VStack>
        ) : (
          <VStack align="stretch" gap={3}>
            {/* Main Balance */}
            <Box textAlign="center" py={2}>
              <Text
                fontSize="3xl"
                fontWeight="bold"
                color={textPrimary}
                lineHeight="1"
              >
                {available}
              </Text>
              <Text fontSize="sm" color={textSecondary} mt={1}>
                hours available
              </Text>
            </Box>

            {/* Stats Row */}
            <Grid templateColumns="1fr 1fr" gap={2}>
              <Box bg={statBg} p={3} borderRadius="lg" textAlign="center">
                <HStack justify="center" gap={1} mb={1}>
                  <LuCalendarDays size={14} color={textSecondary} />
                  <Text fontSize="lg" fontWeight="semibold" color={textPrimary}>
                    {days}
                  </Text>
                </HStack>
                <Text fontSize="xs" color={textSecondary}>
                  days
                </Text>
              </Box>
              <Box bg={statBg} p={3} borderRadius="lg" textAlign="center">
                <HStack justify="center" gap={1} mb={1}>
                  <LuTrendingUp size={14} color={textSecondary} />
                  <Text fontSize="lg" fontWeight="semibold" color={textPrimary}>
                    {accrualRate}
                  </Text>
                </HStack>
                <Text fontSize="xs" color={textSecondary}>
                  hrs/period
                </Text>
              </Box>
            </Grid>
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  );
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [balances, setBalances] = useState<TimeOffBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        const balancesData = await timeOffService.getBalances().catch(() => []);
        setBalances(balancesData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Memoize computed values to prevent unnecessary recalculations
  const greeting = useMemo(() => getGreeting(), []);

  const ptoBalance = useMemo(
    () => balances.find((b) => b.type.code.toUpperCase() === "PTO"),
    [balances],
  );

  // Sort posts: pinned first, then by date
  const sortedPosts = useMemo(() => sortPosts(MOCK_POSTS), []);

  const unreadCount = useMemo(
    () => MOCK_POSTS.filter((p) => !p.isRead).length,
    [],
  );

  return (
    <Box maxW="1400px" mx="auto">
      {/* Welcome Section */}
      <Box mb={6}>
        <Heading
          as="h1"
          size={{ base: "lg", md: "xl" }}
          color={textPrimary}
          fontWeight="bold"
        >
          {greeting}, {user?.first_name || "there"}! 👋
        </Heading>
        <Text color={textSecondary} mt={1} fontSize={{ base: "sm", md: "md" }}>
          Here&apos;s what&apos;s happening at Curt Landry Ministries.
        </Text>
      </Box>

      {/* Urgent Banner */}
      <UrgentBanner posts={MOCK_POSTS} />

      {/* Main Grid Layout */}
      <Grid
        templateColumns={{ base: "1fr", lg: "1fr 340px" }}
        gap={{ base: 4, md: 6 }}
      >
        {/* Left Column - News Feed */}
        <VStack align="stretch" gap={4}>
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <HStack gap={2}>
              <Heading
                as="h2"
                size={{ base: "sm", md: "md" }}
                color={textPrimary}
              >
                News & Updates
              </Heading>
              {unreadCount > 0 && (
                <Badge colorPalette="brand" borderRadius="full" px={3} py={0.5}>
                  <Text fontSize="xs">{unreadCount} new</Text>
                </Badge>
              )}
            </HStack>
          </Flex>

          <VStack align="stretch" gap={3}>
            {sortedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </VStack>
        </VStack>

        {/* Right Column - Sidebar */}
        <VStack align="stretch" gap={4}>
          {/* PTO Summary */}
          <PTOSummaryWidget balance={ptoBalance} isLoading={isLoading} />

          {/* Quick Actions */}
          <Box>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color={textSecondary}
              mb={2}
              px={1}
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Quick Actions
            </Text>
            <QuickActionsWidget />
          </Box>

          {/* Celebrations */}
          <CelebrationWidget celebrations={MOCK_CELEBRATIONS} />

          {/* Documents & Resources */}
          <ResourcesWidget resources={MOCK_RESOURCES} />
        </VStack>
      </Grid>
    </Box>
  );
}
