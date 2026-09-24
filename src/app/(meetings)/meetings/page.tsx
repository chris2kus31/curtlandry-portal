"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
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
  canAccessMeetingsTab,
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
    case "dismissed":
      return { label: "Denied", color: "gray" };
  }
}

function toActionPayload(
  item: MeetingActionItem,
  meeting: Meeting,
  dueOn?: string | null,
): {
  action: string;
  assignee_email: string | null;
  assignee_name: string;
  meeting_id: string;
  meeting_title: string;
  due_on: string | null;
} {
  return {
    action: item.action,
    assignee_email: item.assignee_email,
    assignee_name: item.assignee_name,
    meeting_id: meeting.id,
    meeting_title: meeting.title,
    due_on: dueOn?.trim() ? dueOn.trim() : null,
  };
}

export default function MeetingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);

  const allowed = canAccessMeetingsTab(user?.email, roles);
  const isAdmin = isFirefliesMeetingsAdmin(roles, permissions, user?.email);

  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [asanaEnabled, setAsanaEnabled] = useState<boolean | null>(null);
  const [weekLabel, setWeekLabel] = useState<string>("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [apiSaysAdmin, setApiSaysAdmin] = useState<boolean | null>(null);
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

  useEffect(() => {
    if (user && !allowed) {
      router.replace("/dashboard");
    }
  }, [user, allowed, router]);

  const load = useCallback(async () => {
    if (!user || !allowed) return;
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
      setAsanaEnabled(
        typeof inbox.asana_enabled === "boolean" ? inbox.asana_enabled : null,
      );
      setWeekLabel(inbox.week?.label || "");
      setApiSaysAdmin(inbox.is_fireflies_admin);
      // Keep meetings collapsed until the user expands one.
      setOpenId("");
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, allowed]);

  /** Prefer API scoping when present; fall back to local roster/role checks. */
  const effectiveAdmin = apiSaysAdmin ?? isAdmin;

  useEffect(() => {
    load();
  }, [load]);

  if (user && !allowed) {
    return null;
  }

  const visibleMeetings = useMemo(() => {
    const base =
      !effectiveAdmin || scope === "all"
        ? meetings
        : meetings
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

    return base
      .map((meeting) => ({
        ...meeting,
        action_items: meeting.action_items.filter((i) => i.status !== "dismissed"),
      }))
      .filter((meeting) => meeting.action_items.length > 0);
  }, [meetings, effectiveAdmin, scope]);

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

  const patchItem = (
    actionItemId: string,
    patch: Partial<MeetingActionItem>,
  ) => {
    setMeetings((prev) =>
      prev.map((meeting) => ({
        ...meeting,
        action_items: meeting.action_items.map((item) =>
          item.id === actionItemId ? { ...item, ...patch } : item,
        ),
      })),
    );
  };

  const asanaErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) return error.message;
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }
    return "Please try again.";
  };

  const handleCreateMine = async (
    item: MeetingActionItem,
    meeting: Meeting,
    dueOn?: string | null,
  ) => {
    setBusyId(item.id);
    try {
      const result = await meetingsService.createAsanaTask(
        item.id,
        toActionPayload(item, meeting, dueOn),
      );
      if (!result?.asana_task_id) {
        throw new Error(
          "Asana did not return a task id. Check API Asana configuration.",
        );
      }
      markSynced(item.id, result.asana_task_id);
      toaster.create({
        title: "Asana task created",
        description: dueOn
          ? `Added to your Asana My Tasks (due ${dueOn}).`
          : "Added to your Asana My Tasks.",
        type: "success",
      });
    } catch (error) {
      toaster.create({
        title: "Could not create Asana task",
        description: asanaErrorMessage(error),
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (
    item: MeetingActionItem,
    meeting: Meeting,
    dueOn?: string | null,
  ) => {
    setBusyId(item.id);
    try {
      const result = await meetingsService.approveActionItem(
        item.id,
        toActionPayload(item, meeting, dueOn),
      );
      if (!result?.asana_task_id) {
        throw new Error(
          "Asana did not return a task id. Check API Asana configuration.",
        );
      }
      markSynced(item.id, result.asana_task_id);
      toaster.create({
        title: "Approved",
        description: dueOn
          ? `${item.assignee_name}'s item was added to their My Tasks (due ${dueOn}).`
          : `${item.assignee_name}'s item was added to their Asana My Tasks.`,
        type: "success",
      });
    } catch (error) {
      toaster.create({
        title: "Could not approve item",
        description: asanaErrorMessage(error),
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleRevise = async (
    item: MeetingActionItem,
    meeting: Meeting,
    nextAction: string,
  ) => {
    const trimmed = nextAction.trim();
    if (trimmed.length < 3) {
      toaster.create({
        title: "Revision too short",
        description: "Enter a clearer action item before saving.",
        type: "error",
      });
      return;
    }
    setBusyId(item.id);
    try {
      const result = await meetingsService.reviseActionItem(item.id, {
        ...toActionPayload(item, meeting),
        action: trimmed,
      });
      patchItem(item.id, {
        action: result.action,
        status: item.is_mine ? "ready" : "needs_approval",
      });
      toaster.create({
        title: "Revision saved",
        description: "Review the updated text, then create/approve in Asana.",
        type: "success",
      });
    } catch (error) {
      toaster.create({
        title: "Could not save revision",
        description: error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeny = async (item: MeetingActionItem, meeting: Meeting) => {
    setBusyId(item.id);
    try {
      await meetingsService.dismissActionItem(item.id, {
        ...toActionPayload(item, meeting),
        reason: "denied_in_portal",
      });
      patchItem(item.id, { status: "dismissed" });
      toaster.create({
        title: "Denied",
        description: "This action item was dismissed and will not go to Asana.",
        type: "success",
      });
    } catch (error) {
      toaster.create({
        title: "Could not deny item",
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
              colorPalette={effectiveAdmin ? "orange" : "brand"}
              variant="subtle"
              borderRadius="md"
            >
              {effectiveAdmin ? "Fireflies admin" : "Personal inbox"}
            </Badge>
            {usingMock ? (
              <Badge colorPalette="orange" variant="subtle" borderRadius="md">
                Sample data — Fireflies live sync unavailable
              </Badge>
            ) : (
              <Badge colorPalette="green" variant="subtle" borderRadius="md">
                Live Fireflies
              </Badge>
            )}
            {asanaEnabled === false ? (
              <Badge colorPalette="red" variant="subtle" borderRadius="md">
                Asana not connected
              </Badge>
            ) : asanaEnabled ? (
              <Badge colorPalette="green" variant="subtle" borderRadius="md">
                Asana connected
              </Badge>
            ) : null}
          </HStack>
          <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} color={textPrimary}>
            Meetings
          </Heading>
          <Text fontSize="md" color={textSecondary} mt={1}>
            {effectiveAdmin
              ? `Hi ${displayName} — meetings you were on, plus action items you can approve for others.`
              : `Hi ${displayName} — only meetings you attended, and only action items assigned to you.`}
            {weekLabel ? ` Showing ${weekLabel} (Mon–Fri).` : ""}
          </Text>
        </Box>

        {asanaEnabled === false && (
          <Card.Root
            bg="red.50"
            borderWidth="1px"
            borderColor="red.200"
            borderRadius="xl"
          >
            <Card.Body py={4} px={5}>
              <Text fontWeight="semibold" color="red.700">
                Asana is not connected on the API
              </Text>
              <Text fontSize="sm" color="red.600" mt={1}>
                Set ASANA_ENABLED=true with ASANA_ACCESS_TOKEN and
                ASANA_WORKSPACE_GID, then retry Create my Asana task.
              </Text>
            </Card.Body>
          </Card.Root>
        )}

        <Card.Root bg={softBg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
          <Card.Body py={4} px={5}>
            <HStack align="flex-start" gap={3}>
              <Box p={2} borderRadius="lg" bg={cardBg} color="brand.600" flexShrink={0}>
                {effectiveAdmin ? <LuShield size={18} /> : <LuUser size={18} />}
              </Box>
              <Box>
                <Text fontWeight="semibold" color={textPrimary}>
                  {effectiveAdmin ? "Admin inbox" : "Your inbox"}
                </Text>
                <Text fontSize="sm" color={textSecondary} mt={1}>
                  {effectiveAdmin
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
          <SimpleGrid columns={{ base: 2, md: effectiveAdmin ? 4 : 3 }} gap={3}>
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
            {effectiveAdmin && (
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

        {effectiveAdmin && !loading && (
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
                          · Fireflies · {meeting.action_items.length} task
                          {meeting.action_items.length === 1 ? "" : "s"}
                          {!open ? " · click to expand" : ""}
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
                      {effectiveAdmin && otherCount > 0 && (
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
                          {effectiveAdmin
                            ? "Action items on this meeting"
                            : "Your action items only"}
                        </Text>
                      </HStack>

                      {effectiveAdmin ? (
                        <VStack align="stretch" gap={5}>
                          {myCount > 0 && (
                            <ItemGroup
                              title="Assigned to you"
                              meeting={meeting}
                              items={meeting.action_items.filter((i) => i.is_mine)}
                              isAdmin={effectiveAdmin}
                              busyId={busyId}
                              onCreateMine={handleCreateMine}
                              onApprove={handleApprove}
                              onRevise={handleRevise}
                              onDeny={handleDeny}
                              cardBg={cardBg}
                              borderColor={borderColor}
                              textPrimary={textPrimary}
                              textSecondary={textSecondary}
                            />
                          )}
                          {otherCount > 0 && (
                            <ItemGroup
                              title="Others — revise, deny, or approve to Asana"
                              meeting={meeting}
                              items={meeting.action_items.filter((i) => !i.is_mine)}
                              isAdmin={effectiveAdmin}
                              busyId={busyId}
                              onCreateMine={handleCreateMine}
                              onApprove={handleApprove}
                              onRevise={handleRevise}
                              onDeny={handleDeny}
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
                          meeting={meeting}
                          items={meeting.action_items}
                          isAdmin={effectiveAdmin}
                          busyId={busyId}
                          onCreateMine={handleCreateMine}
                          onApprove={handleApprove}
                          onRevise={handleRevise}
                          onDeny={handleDeny}
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
  meeting,
  items,
  isAdmin,
  busyId,
  onCreateMine,
  onApprove,
  onRevise,
  onDeny,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
}: {
  title: string;
  meeting: Meeting;
  items: MeetingActionItem[];
  isAdmin: boolean;
  busyId: string | null;
  onCreateMine: (
    item: MeetingActionItem,
    meeting: Meeting,
    dueOn?: string | null,
  ) => void;
  onApprove: (
    item: MeetingActionItem,
    meeting: Meeting,
    dueOn?: string | null,
  ) => void;
  onRevise: (
    item: MeetingActionItem,
    meeting: Meeting,
    nextAction: string,
  ) => void;
  onDeny: (item: MeetingActionItem, meeting: Meeting) => void;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dueById, setDueById] = useState<Record<string, string>>({});

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
          const editing = editingId === item.id;
          const dueOn = dueById[item.id] ?? "";
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
                align={{ sm: editing ? "flex-start" : "center" }}
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
                  {editing ? (
                    <Box
                      as="textarea"
                      value={draft}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setDraft(e.target.value)
                      }
                      rows={3}
                      w="100%"
                      p={3}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="lg"
                      fontSize="sm"
                      color={textPrimary}
                      bg="transparent"
                    />
                  ) : (
                    <Text color={textPrimary} fontWeight="medium">
                      {item.action}
                    </Text>
                  )}
                  {item.status !== "synced" && !editing && (
                    <HStack mt={3} gap={2} align="center" flexWrap="wrap">
                      <Text fontSize="xs" fontWeight="semibold" color={textSecondary}>
                        Due date
                      </Text>
                      <Box
                        as="input"
                        type="date"
                        value={dueOn}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setDueById((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        borderWidth="1px"
                        borderColor={borderColor}
                        borderRadius="lg"
                        px={3}
                        py={1.5}
                        fontSize="sm"
                        color={textPrimary}
                        bg="transparent"
                      />
                    </HStack>
                  )}
                </Box>
                <VStack align={{ base: "stretch", sm: "flex-end" }} gap={2}>
                  <HStack gap={2} flexWrap="wrap">
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
                  ) : editing ? (
                    <HStack gap={2} flexWrap="wrap">
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
                        onClick={() => {
                          if (busy) return;
                          onRevise(item, meeting, draft);
                          setEditingId(null);
                        }}
                        _hover={{ bg: "brand.600" }}
                      >
                        Save revision
                      </Box>
                      <Box
                        as="button"
                        px={4}
                        py={2}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor={borderColor}
                        fontSize="sm"
                        fontWeight="semibold"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Box>
                    </HStack>
                  ) : (
                    <HStack gap={2} flexWrap="wrap" justify="flex-end">
                      <Box
                        as="button"
                        px={3}
                        py={2}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor={borderColor}
                        fontSize="sm"
                        fontWeight="semibold"
                        opacity={busy ? 0.7 : 1}
                        cursor={busy ? "wait" : "pointer"}
                        onClick={() => {
                          if (busy) return;
                          setEditingId(item.id);
                          setDraft(item.action);
                        }}
                      >
                        Revise
                      </Box>
                      <Box
                        as="button"
                        px={3}
                        py={2}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor="red.300"
                        color="red.600"
                        fontSize="sm"
                        fontWeight="semibold"
                        opacity={busy ? 0.7 : 1}
                        cursor={busy ? "wait" : "pointer"}
                        onClick={() => !busy && onDeny(item, meeting)}
                      >
                        Deny
                      </Box>
                      {isOther ? (
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
                          onClick={() =>
                            !busy && onApprove(item, meeting, dueOn || null)
                          }
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
                          onClick={() =>
                            !busy && onCreateMine(item, meeting, dueOn || null)
                          }
                          _hover={{ bg: "brand.600" }}
                        >
                          {busy
                            ? "Creating…"
                            : item.status === "ready"
                              ? "Create my Asana task"
                              : "Confirm & create in Asana"}
                        </Box>
                      )}
                    </HStack>
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
