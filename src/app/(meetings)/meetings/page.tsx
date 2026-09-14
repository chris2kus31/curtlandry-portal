"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/store/auth-store";
import {
  isFirefliesMeetingsAdmin,
  meetingsService,
  type Meeting,
  type MeetingActionItem,
  type MeetingActionStatus,
} from "@/lib/api";
import {
  LuCheck,
  LuChevronDown,
  LuListTodo,
  LuMessageSquare,
  LuShield,
  LuSparkles,
  LuUser,
} from "react-icons/lu";

type AdminScope = "all" | "mine" | "team";

function formatMeetingWhen(iso: string, durationMinutes: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return `${durationMinutes} min`;
  return `${date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} · ${durationMinutes} min`;
}

function statusMeta(status: MeetingActionStatus) {
  switch (status) {
    case "open":
      return { label: "Open", color: "orange" };
    case "ready":
      return { label: "Ready for Asana", color: "blue" };
    case "synced":
      return { label: "In Asana", color: "green" };
    case "needs_approval":
      return { label: "Needs your approval", color: "purple" };
  }
}

export default function MeetingsPage() {
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);

  const isAdmin = isFirefliesMeetingsAdmin(roles, permissions);

  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [scope, setScope] = useState<AdminScope>("all");
  const [openId, setOpenId] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pageBg = useColorModeValue("gray.50", "gray.950");
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const softBg = useColorModeValue("brand.50", "whiteAlpha.100");
  const idleBg = useColorModeValue("gray.50", "gray.800");
  const chipIdleBg = useColorModeValue("white", "gray.800");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const inbox = await meetingsService.getInbox({
        userId: user.id,
        firstName: user.first_name,
        email: user.email,
        isFirefliesAdmin: isAdmin,
      });
      setMeetings(inbox.meetings);
      setUsingMock(!!inbox.using_mock);
      setOpenId((prev) => prev || inbox.meetings[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleMeetings = useMemo(() => {
    if (!isAdmin || scope === "all") return meetings;
    return meetings
      .map((meeting) => ({
        ...meeting,
        action_items:
          scope === "mine"
            ? meeting.action_items.filter((i) => i.is_mine)
            : meeting.action_items.filter(
                (i) => !i.is_mine && i.status === "needs_approval",
              ),
      }))
      .filter((meeting) => meeting.action_items.length > 0);
  }, [meetings, isAdmin, scope]);

  const stats = useMemo(() => {
    const items = meetings.flatMap((m) => m.action_items);
    return {
      meetings: meetings.length,
      mine: items.filter((i) => i.is_mine && i.status !== "synced").length,
      needsApproval: items.filter(
        (i) => !i.is_mine && i.status === "needs_approval",
      ).length,
      ready: items.filter((i) => i.status === "ready").length,
    };
  }, [meetings]);

  const markSynced = (actionItemId: string, asanaTaskId: string) => {
    setMeetings((prev) =>
      prev.map((meeting) => ({
        ...meeting,
        action_items: meeting.action_items.map((item) =>
          item.id === actionItemId
            ? {
                ...item,
                status: "synced" as const,
                asana_task_id: asanaTaskId,
              }
            : item,
        ),
      })),
    );
  };

  const handleCreateMine = async (item: MeetingActionItem) => {
    setBusyId(item.id);
    try {
      const result = await meetingsService.createAsanaTask(item.id);
      markSynced(item.id, result.asana_task_id);
      toaster.create({
        title: "Asana task created",
        description: "Your action item is now in Asana.",
        type: "success",
      });
    } catch (error) {
      toaster.create({
        title: "Could not create Asana task",
        description: error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (item: MeetingActionItem) => {
    setBusyId(item.id);
    try {
      const result = await meetingsService.approveActionItem(item.id);
      markSynced(item.id, result.asana_task_id);
      toaster.create({
        title: "Approved",
        description: `${item.assignee_name}'s item was sent to Asana.`,
        type: "success",
      });
    } catch (error) {
      toaster.create({
        title: "Could not approve item",
        description: error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const displayName = user?.first_name || "there";

  return (
    <Box bg={pageBg} minH="100%" mx={{ base: -4, md: -6 }} px={{ base: 4, md: 6 }} py={6}>
      <VStack align="stretch" gap={6} maxW="920px" mx="auto">
        <Box>
          <HStack gap={2} mb={2} flexWrap="wrap">
            <Badge
              colorPalette={isAdmin ? "orange" : "brand"}
              variant="subtle"
              borderRadius="md"
            >
              {isAdmin ? "Fireflies admin" : "Personal inbox"}
            </Badge>
            {usingMock && (
              <Badge colorPalette="gray" variant="subtle" borderRadius="md">
                Sample data until Fireflies API is connected
              </Badge>
            )}
          </HStack>
          <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} color={textPrimary}>
            Meetings
          </Heading>
          <Text fontSize="md" color={textSecondary} mt={1}>
            {isAdmin
              ? `Hi ${displayName} — meetings you were on, plus action items you can approve for others.`
              : `Hi ${displayName} — only meetings you attended, and only action items assigned to you.`}
          </Text>
        </Box>

        <Card.Root bg={softBg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
          <Card.Body py={4} px={5}>
            <HStack align="flex-start" gap={3}>
              <Box p={2} borderRadius="lg" bg={cardBg} color="brand.600" flexShrink={0}>
                {isAdmin ? <LuShield size={18} /> : <LuUser size={18} />}
              </Box>
              <Box>
                <Text fontWeight="semibold" color={textPrimary}>
                  {isAdmin ? "Admin inbox" : "Your inbox"}
                </Text>
                <Text fontSize="sm" color={textSecondary} mt={1}>
                  {isAdmin
                    ? "You only see meetings you were invited to — not the whole organization. On those meetings you can manage your own items and approve other people’s before they go to Asana or Slack."
                    : "Action items for other people never appear here. When Fireflies assigns something to you, it shows up in this inbox."}
                </Text>
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        {loading ? (
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height="88px" borderRadius="xl" />
            ))}
          </SimpleGrid>
        ) : (
          <SimpleGrid columns={{ base: 2, md: isAdmin ? 4 : 3 }} gap={3}>
            <StatCard
              label="My meetings"
              value={stats.meetings}
              cardBg={cardBg}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            <StatCard
              label="My open items"
              value={stats.mine}
              cardBg={cardBg}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            {isAdmin && (
              <StatCard
                label="Awaiting my approval"
                value={stats.needsApproval}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
            )}
            <StatCard
              label="Ready for Asana"
              value={stats.ready}
              cardBg={cardBg}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          </SimpleGrid>
        )}

        {isAdmin && !loading && (
          <HStack gap={2} flexWrap="wrap">
            {(
              [
                { id: "all", label: "Everything on my meetings" },
                { id: "mine", label: "Assigned to me" },
                { id: "team", label: "Needs my approval" },
              ] as const
            ).map((f) => {
              const active = scope === f.id;
              return (
                <Box
                  key={f.id}
                  as="button"
                  onClick={() => setScope(f.id)}
                  px={3.5}
                  py={2}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={active ? "brand.500" : borderColor}
                  bg={active ? softBg : chipIdleBg}
                  color={active ? textPrimary : textSecondary}
                  fontSize="sm"
                  fontWeight="medium"
                  _hover={{ borderColor: "brand.400" }}
                >
                  {f.label}
                </Box>
              );
            })}
          </HStack>
        )}

        {loading ? (
          <VStack align="stretch" gap={4}>
            <Skeleton height="120px" borderRadius="2xl" />
            <Skeleton height="120px" borderRadius="2xl" />
          </VStack>
        ) : visibleMeetings.length === 0 ? (
          <Card.Root bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
            <Card.Body p={8}>
              <Text fontSize="lg" color={textSecondary} textAlign="center">
                No meetings in this view yet.
              </Text>
            </Card.Body>
          </Card.Root>
        ) : (
          <VStack align="stretch" gap={4}>
            {visibleMeetings.map((meeting) => {
              const open = openId === meeting.id;
              const myCount = meeting.action_items.filter((i) => i.is_mine).length;
              const otherCount = meeting.action_items.length - myCount;
              const others = meeting.attendees
                .filter((a) => a.user_id !== user?.id && a.name !== user?.first_name)
                .map((a) => a.name);

              return (
                <Card.Root
                  key={meeting.id}
                  bg={cardBg}
                  borderWidth="1px"
                  borderColor={open ? "brand.400" : borderColor}
                  borderRadius="2xl"
                  overflow="hidden"
                >
                  <Flex
                    as="button"
                    type="button"
                    w="full"
                    textAlign="left"
                    align={{ base: "flex-start", md: "center" }}
                    justify="space-between"
                    gap={4}
                    px={5}
                    py={4}
                    onClick={() => setOpenId(open ? "" : meeting.id)}
                    _hover={{ bg: softBg }}
                  >
                    <HStack align="flex-start" gap={3} flex={1}>
                      <Box
                        mt={0.5}
                        p={2}
                        borderRadius="lg"
                        bg={softBg}
                        color="brand.600"
                        flexShrink={0}
                      >
                        <LuSparkles size={18} />
                      </Box>
                      <Box>
                        <Text fontSize="lg" fontWeight="semibold" color={textPrimary}>
                          {meeting.title}
                        </Text>
                        <Text fontSize="sm" color={textSecondary} mt={0.5}>
                          {formatMeetingWhen(
                            meeting.started_at,
                            meeting.duration_minutes,
                          )}{" "}
                          · Fireflies
                        </Text>
                        <Text fontSize="sm" color={textSecondary} mt={1}>
                          You were on this call
                          {others.length > 0 ? ` with ${others.join(", ")}` : ""}
                        </Text>
                      </Box>
                    </HStack>
                    <HStack gap={2} flexShrink={0} flexWrap="wrap" justify="flex-end">
                      {myCount > 0 && (
                        <Badge colorPalette="brand" borderRadius="md">
                          {myCount} for you
                        </Badge>
                      )}
                      {isAdmin && otherCount > 0 && (
                        <Badge colorPalette="purple" borderRadius="md">
                          {otherCount} to review
                        </Badge>
                      )}
                      <Box
                        color={textSecondary}
                        transform={open ? "rotate(180deg)" : "rotate(0deg)"}
                        transition="transform 0.15s"
                      >
                        <LuChevronDown size={20} />
                      </Box>
                    </HStack>
                  </Flex>

                  {open && (
                    <Box
                      borderTopWidth="1px"
                      borderColor={borderColor}
                      bg={idleBg}
                      px={5}
                      py={5}
                    >
                      <HStack gap={2} mb={3}>
                        <LuListTodo size={16} />
                        <Text
                          fontSize="sm"
                          fontWeight="semibold"
                          color={textSecondary}
                        >
                          {isAdmin
                            ? "Action items on this meeting"
                            : "Your action items only"}
                        </Text>
                      </HStack>

                      {isAdmin ? (
                        <VStack align="stretch" gap={5}>
                          {myCount > 0 && (
                            <ItemGroup
                              title="Assigned to you"
                              items={meeting.action_items.filter((i) => i.is_mine)}
                              isAdmin={isAdmin}
                              busyId={busyId}
                              onCreateMine={handleCreateMine}
                              onApprove={handleApprove}
                              cardBg={cardBg}
                              borderColor={borderColor}
                              textPrimary={textPrimary}
                              textSecondary={textSecondary}
                            />
                          )}
                          {otherCount > 0 && (
                            <ItemGroup
                              title="Others — approve before Asana / Slack"
                              items={meeting.action_items.filter((i) => !i.is_mine)}
                              isAdmin={isAdmin}
                              busyId={busyId}
                              onCreateMine={handleCreateMine}
                              onApprove={handleApprove}
                              cardBg={cardBg}
                              borderColor={borderColor}
                              textPrimary={textPrimary}
                              textSecondary={textSecondary}
                            />
                          )}
                        </VStack>
                      ) : (
                        <ItemGroup
                          title=""
                          items={meeting.action_items}
                          isAdmin={isAdmin}
                          busyId={busyId}
                          onCreateMine={handleCreateMine}
                          onApprove={handleApprove}
                          cardBg={cardBg}
                          borderColor={borderColor}
                          textPrimary={textPrimary}
                          textSecondary={textSecondary}
                        />
                      )}
                    </Box>
                  )}
                </Card.Root>
              );
            })}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}

function StatCard({
  label,
  value,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
}: {
  label: string;
  value: number;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <Card.Root bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
      <Card.Body py={4} px={5}>
        <Text fontSize="sm" color={textSecondary}>
          {label}
        </Text>
        <Text fontSize="2xl" fontWeight="bold" color={textPrimary} mt={1}>
          {value}
        </Text>
      </Card.Body>
    </Card.Root>
  );
}

function ItemGroup({
  title,
  items,
  isAdmin,
  busyId,
  onCreateMine,
  onApprove,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
}: {
  title: string;
  items: MeetingActionItem[];
  isAdmin: boolean;
  busyId: string | null;
  onCreateMine: (item: MeetingActionItem) => void;
  onApprove: (item: MeetingActionItem) => void;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <Box>
      {title ? (
        <Text fontSize="sm" fontWeight="semibold" color={textSecondary} mb={3}>
          {title}
        </Text>
      ) : null}
      <VStack align="stretch" gap={3}>
        {items.map((item) => {
          const meta = statusMeta(item.status);
          const isOther = isAdmin && !item.is_mine;
          const busy = busyId === item.id;
          return (
            <Box
              key={item.id}
              bg={cardBg}
              borderWidth="1px"
              borderColor={
                isOther && item.status === "needs_approval"
                  ? "purple.300"
                  : borderColor
              }
              borderRadius="xl"
              p={4}
            >
              <Flex
                direction={{ base: "column", sm: "row" }}
                gap={4}
                justify="space-between"
                align={{ sm: "center" }}
              >
                <Box flex={1} minW={0}>
                  <HStack gap={2} mb={2} flexWrap="wrap">
                    {isOther && (
                      <Badge colorPalette="gray" borderRadius="md">
                        {item.assignee_name}
                      </Badge>
                    )}
                    <Badge colorPalette={meta.color} borderRadius="md">
                      {meta.label}
                    </Badge>
                  </HStack>
                  <Text color={textPrimary} fontWeight="medium">
                    {item.action}
                  </Text>
                </Box>
                <VStack align={{ base: "stretch", sm: "flex-end" }} gap={2}>
                  <HStack gap={2} flexWrap="wrap">
                    <Badge colorPalette="green" variant="subtle" borderRadius="md">
                      <HStack gap={1}>
                        <LuMessageSquare size={12} />
                        <Text>Slack</Text>
                      </HStack>
                    </Badge>
                    <Badge colorPalette="blue" variant="subtle" borderRadius="md">
                      <HStack gap={1}>
                        <LuCheck size={12} />
                        <Text>Asana</Text>
                      </HStack>
                    </Badge>
                  </HStack>
                  {item.status === "synced" ? (
                    <Text fontSize="sm" color="green.600" fontWeight="medium">
                      Already synced
                    </Text>
                  ) : isOther ? (
                    <Box
                      as="button"
                      px={4}
                      py={2}
                      borderRadius="lg"
                      bg="brand.500"
                      color="white"
                      fontSize="sm"
                      fontWeight="semibold"
                      opacity={busy ? 0.7 : 1}
                      cursor={busy ? "wait" : "pointer"}
                      onClick={() => !busy && onApprove(item)}
                      _hover={{ bg: "brand.600" }}
                    >
                      {busy ? "Approving…" : "Approve → Asana"}
                    </Box>
                  ) : (
                    <Box
                      as="button"
                      px={4}
                      py={2}
                      borderRadius="lg"
                      bg="brand.500"
                      color="white"
                      fontSize="sm"
                      fontWeight="semibold"
                      opacity={busy ? 0.7 : 1}
                      cursor={busy ? "wait" : "pointer"}
                      onClick={() => !busy && onCreateMine(item)}
                      _hover={{ bg: "brand.600" }}
                    >
                      {busy
                        ? "Creating…"
                        : item.status === "ready"
                          ? "Create my Asana task"
                          : "Confirm & create in Asana"}
                    </Box>
                  )}
                </VStack>
              </Flex>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
