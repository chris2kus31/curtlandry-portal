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
  Input,
  SimpleGrid,
  Flex,
  Textarea,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuUsers,
  LuShieldCheck,
  LuSearch,
  LuPencil,
  LuUserPlus,
  LuSettings,
  LuCalendar,
  LuMail,
  LuBuilding,
  LuBriefcase,
  LuWallet,
  LuPlus,
  LuMinus,
  LuChevronDown,
  LuX,
  LuCalendarOff,
  LuTrash2,
  LuInfo,
  LuClipboardCheck,
  LuCircleCheck,
  LuCircleDashed,
  LuCircleX,
  LuMessageSquare,
  LuUserCog,
} from "react-icons/lu";
import { authService, adminService, approvalService } from "@/lib/api";
import { EditUserDrawer } from "@/components/admin/EditUserDrawer";
import { CreateUserDrawer } from "@/components/admin/CreateUserDrawer";
import { useAuthStore } from "@/store/auth-store";

// Types
interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  department?: string;
  job_title?: string;
  hire_date?: string;
  is_active: boolean;
  roles: string[];
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  users_count: number;
}

interface Balance {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    department?: string;
    job_title?: string;
  } | null;
  type: {
    id: number;
    code: string;
    name: string;
  } | null;
  tier: {
    id: number;
    name: string;
    accrual_rate: number;
  } | null;
  year: number;
  accrued_hours: number;
  used_hours: number;
  pending_hours: number;
  adjustment_hours: number;
  carry_over_hours: number;
  available_hours: number;
  max_negative: number;
  current_accrual_rate: number;
  last_accrual_date: string | null;
  next_accrual_date: string | null;
  notes: string | null;
}

interface ColorProps {
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  inputBg: string;
  hoverBg: string;
}

interface TimeOffType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  color: string;
  requires_approval: boolean;
  is_paid: boolean;
  uses_accrual: boolean;
  uses_tenure_tiers: boolean;
  is_active: boolean;
  sort_order: number;
  tiers: AccrualTier[];
}

interface AccrualTier {
  id: number;
  time_off_type_id: number;
  name: string;
  min_tenure_years: number;
  max_tenure_years: number | null;
  accrual_rate: number;
  annual_hours: number;
  annual_days: number;
  max_negative: number;
  is_active: boolean;
}

interface BlackoutPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  department: string | null;
  reason: string | null;
  is_active: boolean;
}

interface GeneralSettings {
  hours_per_day: number;
  accrual_period_days: number;
  max_balance: number;
  max_carry_over: number;
  min_increment: number;
  part_time_min_hours: number;
  full_time_hours: number;
  transition_enabled: boolean;
  transition_start_date: string | null;
  transition_end_date: string | null;
}

interface PendingRequest {
  id: number;
  user: {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    department?: string;
    job_title?: string;
  };
  type: {
    id: number;
    code: string;
    name: string;
    color: string;
  };
  approver?: {
    id: number;
    name: string;
    email?: string;
  } | null;
  start_date: string;
  end_date: string;
  total_hours: number;
  status: "pending" | "approved" | "denied" | "cancelled";
  reason: string | null;
  submitted_at: string;
  // Review info
  reviewed_by?: {
    id: number;
    name: string;
  } | null;
  review_notes?: string | null;
  // Cancellation info
  cancelled_by?: {
    id: number;
    name: string;
  } | null;
  cancellation_reason?: string | null;
}

/**
 * Parse a date string (YYYY-MM-DD) as local time to avoid timezone shifts.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Get role color
function getRoleColor(role: string): string {
  switch (role) {
    case "super_admin":
      return "purple";
    case "admin":
      return "blue";
    case "manager":
      return "green";
    default:
      return "gray";
  }
}

// User Card Component - Mobile friendly
function UserCard({
  user,
  onEdit,
  onImpersonate,
  canImpersonate,
  colors,
}: {
  user: User;
  onEdit: (user: User) => void;
  onImpersonate?: (user: User) => void;
  canImpersonate?: boolean;
  colors: ColorProps;
}) {
  return (
    <Card.Root
      bg={colors.cardBg}
      borderRadius="xl"
      border="1px solid"
      borderColor={colors.borderColor}
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ borderColor: "brand.300", shadow: "md" }}
    >
      <Card.Body p={0}>
        {/* Status indicator bar */}
        <Box h="3px" bg={user.is_active ? "green.500" : "red.500"} />

        <Box p={4}>
          {/* Header with name and edit */}
          <Flex justify="space-between" align="start" mb={3}>
            <VStack align="start" gap={0.5}>
              <Text
                fontWeight="semibold"
                fontSize="md"
                color={colors.textPrimary}
              >
                {user.first_name} {user.last_name}
              </Text>
              <HStack gap={1.5} color={colors.textSecondary} fontSize="sm">
                <LuMail size={14} />
                <Text>{user.email}</Text>
              </HStack>
            </VStack>
            <HStack gap={1}>
              {canImpersonate && user.is_active && onImpersonate && (
                <IconButton
                  aria-label="Login as this user"
                  size="sm"
                  variant="ghost"
                  onClick={() => onImpersonate(user)}
                  borderRadius="lg"
                  color={colors.textSecondary}
                  _hover={{ bg: "purple.50", color: "purple.500" }}
                  title="Login as this user"
                >
                  <LuUserCog size={16} />
                </IconButton>
              )}
              <IconButton
                aria-label="Edit user"
                size="sm"
                variant="ghost"
                onClick={() => onEdit(user)}
                borderRadius="lg"
                color={colors.textSecondary}
                _hover={{ bg: colors.hoverBg, color: "brand.500" }}
              >
                <LuPencil size={16} />
              </IconButton>
            </HStack>
          </Flex>

          {/* Details */}
          <VStack align="stretch" gap={2} mb={3}>
            {user.department && (
              <HStack gap={2} fontSize="sm" color={colors.textSecondary}>
                <LuBuilding size={14} />
                <Text>{user.department}</Text>
              </HStack>
            )}
            {user.job_title && (
              <HStack gap={2} fontSize="sm" color={colors.textSecondary}>
                <LuBriefcase size={14} />
                <Text>{user.job_title}</Text>
              </HStack>
            )}
          </VStack>

          {/* Footer with roles and status */}
          <Flex
            justify="space-between"
            align="center"
            pt={3}
            borderTop="1px solid"
            borderColor={colors.borderColor}
          >
            <HStack gap={1.5} flexWrap="wrap">
              {user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <Badge
                    key={role}
                    colorPalette={getRoleColor(role)}
                    variant="subtle"
                    fontSize="xs"
                    borderRadius="full"
                    px={2}
                    py={0.5}
                  >
                    {role.replace("_", " ")}
                  </Badge>
                ))
              ) : (
                <Badge
                  colorPalette="gray"
                  variant="subtle"
                  fontSize="xs"
                  borderRadius="full"
                  px={2}
                  py={0.5}
                >
                  employee
                </Badge>
              )}
            </HStack>
            <Badge
              colorPalette={user.is_active ? "green" : "red"}
              variant="subtle"
              fontSize="xs"
              borderRadius="full"
              px={2}
              py={0.5}
            >
              {user.is_active ? "Active" : "Inactive"}
            </Badge>
          </Flex>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}

// Role Card Component
function RoleCard({ role, colors }: { role: Role; colors: ColorProps }) {
  return (
    <Card.Root
      bg={colors.cardBg}
      borderRadius="xl"
      border="1px solid"
      borderColor={colors.borderColor}
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ borderColor: "brand.300", shadow: "md" }}
    >
      <Card.Body p={0}>
        <Box h="3px" bg={`${getRoleColor(role.name)}.500`} />
        <Box p={4}>
          <Flex justify="space-between" align="start">
            <VStack align="start" gap={1}>
              <HStack gap={2}>
                <Text
                  fontWeight="semibold"
                  fontSize="md"
                  color={colors.textPrimary}
                >
                  {role.display_name}
                </Text>
                <Badge
                  colorPalette="gray"
                  variant="outline"
                  fontSize="xs"
                  borderRadius="full"
                  px={4}
                >
                  {role.name}
                </Badge>
              </HStack>
              {role.description && (
                <Text fontSize="sm" color={colors.textSecondary}>
                  {role.description}
                </Text>
              )}
            </VStack>
            <VStack align="end" gap={0}>
              <Text
                fontSize="2xl"
                fontWeight="bold"
                color={`${getRoleColor(role.name)}.500`}
              >
                {role.users_count}
              </Text>
              <Text fontSize="xs" color={colors.textSecondary}>
                {role.users_count === 1 ? "user" : "users"}
              </Text>
            </VStack>
          </Flex>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}

// Main Page Component
export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [balancesLoaded, setBalancesLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [balanceSearch, setBalanceSearch] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [managers, setManagers] = useState<User[]>([]);
  const [adjustingBalance, setAdjustingBalance] = useState<Balance | null>(
    null,
  );
  const [adjustmentHours, setAdjustmentHours] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Settings state
  const [timeOffTypes, setTimeOffTypes] = useState<TimeOffType[]>([]);
  const [blackoutPeriods, setBlackoutPeriods] = useState<BlackoutPeriod[]>([]);
  const [generalSettings, setGeneralSettings] =
    useState<GeneralSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [editingBlackout, setEditingBlackout] = useState<BlackoutPeriod | null>(
    null,
  );
  const [isCreatingBlackout, setIsCreatingBlackout] = useState(false);
  const [blackoutForm, setBlackoutForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    department: "",
    reason: "",
  });
  const [isSavingBlackout, setIsSavingBlackout] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [editedSettings, setEditedSettings] = useState<GeneralSettings | null>(
    null,
  );

  // Approvals state
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
  const [approvalsLoaded, setApprovalsLoaded] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(
    null,
  );
  const [showApprovalNotes, setShowApprovalNotes] = useState<number | null>(
    null,
  );
  const [approvalNotes, setApprovalNotes] = useState("");

  // Impersonation
  const [isImpersonating, setIsImpersonating] = useState(false);
  const { user: currentUser, roles: currentRoles } = useAuthStore();

  // All color hooks at top level
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const tabBg = useColorModeValue("gray.100", "gray.800");
  const activeTabBg = useColorModeValue("white", "gray.900");
  const hoverBg = useColorModeValue("gray.100", "gray.800");

  const colors: ColorProps = {
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    inputBg,
    hoverBg,
  };

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await adminService.getUsers();
      setUsers(data as User[]);
      setUsersLoaded(true);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    try {
      const data = await adminService.getRoles();
      setRoles(data as Role[]);
      setRolesLoaded(true);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      setRoles([]);
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  const fetchBalances = useCallback(async () => {
    setIsLoadingBalances(true);
    try {
      const data = await adminService.getBalances();
      setBalances(data as Balance[]);
      setBalancesLoaded(true);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
      setBalances([]);
    } finally {
      setIsLoadingBalances(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    if (departmentsLoaded) return;
    try {
      const deptData = await adminService.getDepartments();
      setDepartments(deptData || []);
      setDepartmentsLoaded(true);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  }, [departmentsLoaded]);

  const fetchManagers = useCallback(async () => {
    try {
      const managersData = await adminService.getManagers();
      setManagers(managersData as User[]);
    } catch (error) {
      console.error("Failed to fetch managers:", error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const [settingsRes, deptData] = await Promise.all([
        adminService.getSettings(),
        adminService.getDepartments(),
      ]);
      setTimeOffTypes((settingsRes.types || []) as TimeOffType[]);
      setBlackoutPeriods(
        (settingsRes.blackout_periods || []) as BlackoutPeriod[],
      );
      setGeneralSettings(
        (settingsRes.general || null) as GeneralSettings | null,
      );
      setDepartments(deptData || []);
      setDepartmentsLoaded(true);
      setSettingsLoaded(true);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  const fetchApprovals = useCallback(async () => {
    setIsLoadingApprovals(true);
    try {
      const data = await adminService.getPendingApprovals();
      setPendingRequests(data as unknown as PendingRequest[]);
      setApprovalsLoaded(true);
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error);
      setPendingRequests([]);
    } finally {
      setIsLoadingApprovals(false);
    }
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "users") {
      // Users tab needs users, roles, departments, AND managers (for the create/edit drawer)
      if (!usersLoaded && !isLoadingUsers) {
        fetchUsers();
      }
      if (!rolesLoaded && !isLoadingRoles) {
        fetchRoles();
      }
      if (!departmentsLoaded) {
        fetchDepartments();
      }
      // Always fetch managers (they might change)
      fetchManagers();
    } else if (activeTab === "roles" && !rolesLoaded && !isLoadingRoles) {
      fetchRoles();
    } else if (
      activeTab === "balances" &&
      !balancesLoaded &&
      !isLoadingBalances
    ) {
      fetchBalances();
    } else if (
      activeTab === "settings" &&
      !settingsLoaded &&
      !isLoadingSettings
    ) {
      fetchSettings();
    } else if (
      activeTab === "approvals" &&
      !approvalsLoaded &&
      !isLoadingApprovals
    ) {
      fetchApprovals();
    }
  }, [
    activeTab,
    usersLoaded,
    rolesLoaded,
    balancesLoaded,
    settingsLoaded,
    approvalsLoaded,
    departmentsLoaded,
    isLoadingUsers,
    isLoadingRoles,
    isLoadingBalances,
    isLoadingSettings,
    isLoadingApprovals,
    fetchUsers,
    fetchRoles,
    fetchBalances,
    fetchSettings,
    fetchApprovals,
    fetchDepartments,
    fetchManagers,
  ]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingUser(null);
  };

  const handleUserUpdated = () => {
    // Refetch users and roles (roles might have updated user counts)
    setUsersLoaded(false);
    setRolesLoaded(false);
    fetchUsers();
    fetchManagers(); // Managers list might have changed
  };

  const handleUserCreated = () => {
    // Refetch users, roles, and managers after creating a new user
    setUsersLoaded(false);
    setRolesLoaded(false);
    fetchUsers();
    fetchManagers();
  };

  // Approval handlers
  const handleApproveRequest = async (id: number, notes?: string) => {
    setProcessingRequestId(id);
    try {
      await approvalService.approve(id, notes);
      toaster.create({
        title: "Request approved",
        type: "success",
      });
      setShowApprovalNotes(null);
      setApprovalNotes("");
      setApprovalsLoaded(false);
      fetchApprovals();
    } catch (error) {
      toaster.create({
        title: "Failed to approve",
        description:
          error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDenyRequest = async (id: number, notes?: string) => {
    setProcessingRequestId(id);
    try {
      await approvalService.deny(id, notes);
      toaster.create({
        title: "Request denied",
        type: "success",
      });
      setShowApprovalNotes(null);
      setApprovalNotes("");
      setApprovalsLoaded(false);
      fetchApprovals();
    } catch (error) {
      toaster.create({
        title: "Failed to deny",
        description:
          error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Impersonate user handler
  const handleImpersonate = async (targetUser: User) => {
    if (isImpersonating) return;

    setIsImpersonating(true);
    try {
      const result = await authService.impersonate(targetUser.id);

      toaster.create({
        title: `Now logged in as ${result.user.full_name}`,
        description:
          "The page will reload. Click logout to return to your account.",
        type: "success",
      });

      // Reload the page to refresh auth state from the new token
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (error) {
      toaster.create({
        title: "Failed to impersonate",
        description:
          error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
      setIsImpersonating(false);
    }
  };

  // Check if current user is super admin
  const isSuperAdmin = useMemo(
    () => currentRoles?.includes("super_admin") ?? false,
    [currentRoles],
  );

  // Memoize filtered users to prevent recalculation on every render
  // Sort alphabetically by first name, then last name
  const filteredUsers = useMemo(
    () =>
      [...users]
        .filter(
          (user) =>
            (user.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.last_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.email || "").toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .sort((a, b) => {
          const firstNameA = (a.first_name || "").toLowerCase();
          const firstNameB = (b.first_name || "").toLowerCase();
          const lastNameA = (a.last_name || "").toLowerCase();
          const lastNameB = (b.last_name || "").toLowerCase();
          
          const firstNameCompare = firstNameA.localeCompare(firstNameB);
          if (firstNameCompare !== 0) return firstNameCompare;
          return lastNameA.localeCompare(lastNameB);
        }),
    [users, searchQuery],
  );

  // Memoize filtered balances
  // Sort alphabetically by user name
  const filteredBalances = useMemo(
    () =>
      balances
        .filter((b) => {
          if (!balanceSearch) return true;
          const search = balanceSearch.toLowerCase();
          return (
            b.user?.name.toLowerCase().includes(search) ||
            b.user?.email.toLowerCase().includes(search)
          );
        })
        .sort((a, b) => {
          const nameA = a.user?.name || "";
          const nameB = b.user?.name || "";
          return nameA.localeCompare(nameB);
        }),
    [balances, balanceSearch],
  );

  const handleOpenAdjustment = (balance: Balance) => {
    setAdjustingBalance(balance);
    setAdjustmentHours("");
    setAdjustmentReason("");
  };

  const handleCloseAdjustment = () => {
    setAdjustingBalance(null);
    setAdjustmentHours("");
    setAdjustmentReason("");
  };

  const handleSubmitAdjustment = async () => {
    if (!adjustingBalance || !adjustmentHours || !adjustmentReason.trim())
      return;

    setIsAdjusting(true);
    try {
      await adminService.adjustBalance(adjustingBalance.id, {
        hours: parseFloat(adjustmentHours),
        reason: adjustmentReason.trim(),
      });

      toaster.create({
        title: "Adjustment applied",
        description: `${parseFloat(adjustmentHours) > 0 ? "+" : ""}${adjustmentHours} hours for ${adjustingBalance.user?.name}`,
        type: "success",
      });

      handleCloseAdjustment();
      setBalancesLoaded(false);
      fetchBalances();
    } catch (error) {
      toaster.create({
        title: "Failed to apply adjustment",
        description:
          error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  // Blackout period handlers
  const handleCreateBlackout = () => {
    setIsCreatingBlackout(true);
    setEditingBlackout(null);
    setBlackoutForm({
      name: "",
      start_date: "",
      end_date: "",
      department: "",
      reason: "",
    });
  };

  const handleEditBlackout = (period: BlackoutPeriod) => {
    setEditingBlackout(period);
    setIsCreatingBlackout(false);
    setBlackoutForm({
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      department: period.department || "",
      reason: period.reason || "",
    });
  };

  const handleCloseBlackoutForm = () => {
    setIsCreatingBlackout(false);
    setEditingBlackout(null);
    setBlackoutForm({
      name: "",
      start_date: "",
      end_date: "",
      department: "",
      reason: "",
    });
  };

  const handleSaveBlackout = async () => {
    if (
      !blackoutForm.name ||
      !blackoutForm.start_date ||
      !blackoutForm.end_date
    )
      return;

    setIsSavingBlackout(true);
    try {
      const data = {
        name: blackoutForm.name,
        start_date: blackoutForm.start_date,
        end_date: blackoutForm.end_date,
        reason: blackoutForm.reason || undefined,
        departments: blackoutForm.department
          ? [blackoutForm.department]
          : undefined,
      };

      if (editingBlackout) {
        await adminService.updateBlackoutPeriod(editingBlackout.id, data);
        toaster.create({
          title: "Blackout period updated",
          type: "success",
        });
      } else {
        await adminService.createBlackoutPeriod(data);
        toaster.create({
          title: "Blackout period created",
          type: "success",
        });
      }
      handleCloseBlackoutForm();
      setSettingsLoaded(false);
      fetchSettings();
    } catch (error) {
      toaster.create({
        title: "Failed to save blackout period",
        description:
          error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setIsSavingBlackout(false);
    }
  };

  const handleDeleteBlackout = async (period: BlackoutPeriod) => {
    if (!confirm(`Delete blackout period "${period.name}"?`)) return;

    try {
      await adminService.deleteBlackoutPeriod(period.id);
      toaster.create({
        title: "Blackout period deleted",
        type: "success",
      });
      setSettingsLoaded(false);
      fetchSettings();
    } catch (error) {
      toaster.create({
        title: "Failed to delete blackout period",
        type: "error",
      });
    }
  };

  // General settings handlers
  const handleEditGeneralSettings = () => {
    if (generalSettings) {
      setEditedSettings({ ...generalSettings });
      setIsEditingGeneral(true);
    }
  };

  const handleCancelEditSettings = () => {
    setIsEditingGeneral(false);
    setEditedSettings(null);
  };

  const handleSaveGeneralSettings = async () => {
    if (!editedSettings) return;

    setIsSavingSettings(true);
    try {
      await adminService.updateGeneralSettings(editedSettings);
      toaster.create({
        title: "Settings updated",
        type: "success",
      });
      setIsEditingGeneral(false);
      setEditedSettings(null);
      setSettingsLoaded(false);
      fetchSettings();
    } catch (error) {
      toaster.create({
        title: "Failed to update settings",
        description:
          error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const tabItems = [
    {
      value: "users",
      label: "Users",
      icon: <LuUsers size={16} />,
      badge: users.length,
    },
    { value: "roles", label: "Roles", icon: <LuShieldCheck size={16} /> },
    {
      value: "balances",
      label: "PTO Balances",
      shortLabel: "PTO",
      icon: <LuWallet size={16} />,
    },
    {
      value: "approvals",
      label: "Approvals",
      icon: <LuClipboardCheck size={16} />,
      badge: pendingRequests.length > 0 ? pendingRequests.length : undefined,
    },
    { value: "settings", label: "Settings", icon: <LuSettings size={16} /> },
  ];

  return (
    <VStack gap={6} align="stretch">
      {/* Header */}
      <Box>
        <HStack gap={3} mb={2}>
          <Box
            p={2.5}
            borderRadius="xl"
            bg="linear-gradient(135deg, #6d2891, #0095c1)"
          >
            <LuShieldCheck size={24} color="white" />
          </Box>
          <Box>
            <Heading as="h1" size="2xl" color={textPrimary} fontWeight="bold">
              Admin Panel
            </Heading>
            <Text color={textSecondary}>
              Manage users, roles, and system settings
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* Stats Cards */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <Card.Root
          bg={cardBg}
          borderRadius="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <Card.Body p={4}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="xs" color={textSecondary} fontWeight="medium">
                  Total Users
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="brand.500">
                  {!usersLoaded ? "—" : users.length}
                </Text>
              </VStack>
              <Box
                p={2.5}
                borderRadius="lg"
                bg="brand.500/10"
                color="brand.500"
              >
                <LuUsers size={20} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        <Card.Root
          bg={cardBg}
          borderRadius="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <Card.Body p={4}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="xs" color={textSecondary} fontWeight="medium">
                  Active
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {!usersLoaded ? "—" : users.filter((u) => u.is_active).length}
                </Text>
              </VStack>
              <Box
                p={2.5}
                borderRadius="lg"
                bg="green.500/10"
                color="green.500"
              >
                <LuUserPlus size={20} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        <Card.Root
          bg={cardBg}
          borderRadius="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <Card.Body p={4}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="xs" color={textSecondary} fontWeight="medium">
                  Roles
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {!rolesLoaded ? "—" : roles.length}
                </Text>
              </VStack>
              <Box
                p={2.5}
                borderRadius="lg"
                bg="purple.500/10"
                color="purple.500"
              >
                <LuShieldCheck size={20} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        <Card.Root
          bg={cardBg}
          borderRadius="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <Card.Body p={4}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="xs" color={textSecondary} fontWeight="medium">
                  Inactive
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="red.500">
                  {!usersLoaded
                    ? "—"
                    : users.filter((u) => !u.is_active).length}
                </Text>
              </VStack>
              <Box p={2.5} borderRadius="lg" bg="red.500/10" color="red.500">
                <LuUsers size={20} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {/* Mobile Tab Dropdown */}
      <Box display={{ base: "block", md: "none" }} position="relative">
        <Box
          as="button"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          w="full"
          p={3}
          bg={cardBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="xl"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <HStack gap={2}>
            {tabItems.find((t) => t.value === activeTab)?.icon}
            <Text fontWeight="medium" color={textPrimary}>
              {tabItems.find((t) => t.value === activeTab)?.label}
            </Text>
          </HStack>
          <LuChevronDown size={20} color="var(--chakra-colors-gray-500)" />
        </Box>

        {showMobileMenu && (
          <Box
            position="absolute"
            top="100%"
            left={0}
            right={0}
            mt={2}
            bg={cardBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="xl"
            shadow="lg"
            zIndex={50}
            overflow="hidden"
          >
            {tabItems.map((tab) => (
              <Box
                key={tab.value}
                as="button"
                onClick={() => {
                  setActiveTab(tab.value);
                  setShowMobileMenu(false);
                }}
                w="full"
                p={3}
                display="flex"
                alignItems="center"
                gap={2}
                bg={activeTab === tab.value ? hoverBg : "transparent"}
                _hover={{ bg: hoverBg }}
                borderBottom="1px solid"
                borderColor={borderColor}
                css={{ "&:last-child": { borderBottom: "none" } }}
              >
                {tab.icon}
                <Text
                  fontWeight={activeTab === tab.value ? "semibold" : "medium"}
                  color={textPrimary}
                >
                  {tab.label}
                </Text>
                {tab.badge !== undefined && (
                  <Badge
                    bg="brand.500"
                    color="white"
                    borderRadius="full"
                    fontSize="xs"
                    px={2}
                    ml="auto"
                  >
                    {tab.badge}
                  </Badge>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Desktop Tabs */}
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
          display={{ base: "none", md: "flex" }}
          width="fit-content"
        >
          {tabItems.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              px={5}
              py={2.5}
              borderRadius="lg"
              fontWeight="medium"
              fontSize="sm"
              _selected={{ bg: activeTabBg, shadow: "sm" }}
            >
              <HStack gap={2}>
                {tab.icon}
                <Text>{tab.shortLabel || tab.label}</Text>
                {tab.badge !== undefined && (
                  <Badge
                    bg="brand.500"
                    color="white"
                    borderRadius="full"
                    fontSize="xs"
                    px={2}
                    minW="20px"
                  >
                    {tab.badge}
                  </Badge>
                )}
              </HStack>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Box mt={6}>
          {/* Users Tab */}
          <Tabs.Content value="users">
            <VStack align="stretch" gap={4}>
              {/* Search and Add Button */}
              <Flex
                gap={3}
                direction={{ base: "column", sm: "row" }}
                justify="space-between"
                align={{ base: "stretch", sm: "center" }}
              >
                <Box position="relative" flex={1} maxW={{ base: "100%", md: "400px" }}>
                  <Box
                    position="absolute"
                    left={3}
                    top="50%"
                    transform="translateY(-50%)"
                    color={textSecondary}
                    zIndex={1}
                  >
                    <LuSearch size={18} />
                  </Box>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    pl={10}
                    bg={inputBg}
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="xl"
                    _focus={{
                      borderColor: "brand.500",
                      boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
                    }}
                  />
                </Box>
                <Box
                  as="button"
                  px={4}
                  py={2.5}
                  bg="green.500"
                  color="white"
                  borderRadius="xl"
                  fontWeight="medium"
                  fontSize="sm"
                  display="flex"
                  alignItems="center"
                  gap={2}
                  onClick={() => setIsCreateDrawerOpen(true)}
                  _hover={{ bg: "green.600" }}
                  transition="all 0.15s"
                  flexShrink={0}
                >
                  <LuUserPlus size={18} />
                  Add Employee
                </Box>
              </Flex>

              {/* User Grid */}
              {isLoadingUsers ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} height="180px" borderRadius="xl" />
                  ))}
                </SimpleGrid>
              ) : filteredUsers.length === 0 ? (
                <Card.Root
                  bg={cardBg}
                  borderRadius="2xl"
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <Card.Body p={12}>
                    <VStack gap={3}>
                      <Box p={4} borderRadius="full" bg={inputBg}>
                        <LuUsers
                          size={32}
                          color="var(--chakra-colors-gray-400)"
                        />
                      </Box>
                      <Text fontWeight="medium" color={textPrimary}>
                        {searchQuery
                          ? "No users match your search"
                          : "No users found"}
                      </Text>
                      <Text fontSize="sm" color={textSecondary}>
                        {searchQuery
                          ? "Try a different search term"
                          : "Users will appear here once added"}
                      </Text>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                  {filteredUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onEdit={handleEditUser}
                      onImpersonate={handleImpersonate}
                      canImpersonate={
                        isSuperAdmin && user.id !== currentUser?.id
                      }
                      colors={colors}
                    />
                  ))}
                </SimpleGrid>
              )}
            </VStack>
          </Tabs.Content>

          {/* Roles Tab */}
          <Tabs.Content value="roles">
            {isLoadingRoles ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} height="120px" borderRadius="xl" />
                ))}
              </SimpleGrid>
            ) : roles.length === 0 ? (
              <Card.Root
                bg={cardBg}
                borderRadius="2xl"
                border="1px solid"
                borderColor={borderColor}
              >
                <Card.Body p={12}>
                  <VStack gap={3}>
                    <Box p={4} borderRadius="full" bg={inputBg}>
                      <LuShieldCheck
                        size={32}
                        color="var(--chakra-colors-gray-400)"
                      />
                    </Box>
                    <Text fontWeight="medium" color={textPrimary}>
                      No roles configured
                    </Text>
                    <Text fontSize="sm" color={textSecondary}>
                      Run the portal seeders to create default roles
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                {roles.map((role) => (
                  <RoleCard key={role.id} role={role} colors={colors} />
                ))}
              </SimpleGrid>
            )}
          </Tabs.Content>

          {/* PTO Balances Tab */}
          <Tabs.Content value="balances">
            <VStack align="stretch" gap={4}>
              {/* Search */}
              <Box position="relative" maxW={{ base: "100%", md: "400px" }}>
                <Box
                  position="absolute"
                  left={3}
                  top="50%"
                  transform="translateY(-50%)"
                  color={textSecondary}
                  zIndex={1}
                >
                  <LuSearch size={18} />
                </Box>
                <Input
                  value={balanceSearch}
                  onChange={(e) => setBalanceSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  pl={10}
                  bg={inputBg}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="xl"
                  _focus={{
                    borderColor: "brand.500",
                    boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
                  }}
                />
              </Box>

              {/* Balances Table */}
              {isLoadingBalances ? (
                <VStack gap={3}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton
                      key={i}
                      height="80px"
                      width="100%"
                      borderRadius="xl"
                    />
                  ))}
                </VStack>
              ) : balances.length === 0 ? (
                <Card.Root
                  bg={cardBg}
                  borderRadius="2xl"
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <Card.Body p={12}>
                    <VStack gap={3}>
                      <Box p={4} borderRadius="full" bg={inputBg}>
                        <LuWallet
                          size={32}
                          color="var(--chakra-colors-gray-400)"
                        />
                      </Box>
                      <Text fontWeight="medium" color={textPrimary}>
                        No balances found
                      </Text>
                      <Text fontSize="sm" color={textSecondary}>
                        Import employees to create their PTO balances
                      </Text>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              ) : (
                <VStack align="stretch" gap={3}>
                  {filteredBalances.map((balance) => (
                    <Card.Root
                      key={balance.id}
                      bg={cardBg}
                      borderRadius="xl"
                      border="1px solid"
                      borderColor={borderColor}
                      overflow="hidden"
                      transition="all 0.2s"
                      _hover={{ borderColor: "brand.300", shadow: "sm" }}
                    >
                      <Card.Body p={4}>
                        <Flex
                          direction={{ base: "column", lg: "row" }}
                          justify="space-between"
                          align={{ base: "stretch", lg: "center" }}
                          gap={4}
                        >
                          {/* User Info */}
                          <VStack align="start" gap={1} minW="180px">
                            <HStack justify="space-between" w="full">
                              <Text fontWeight="semibold" color={textPrimary}>
                                {balance.user?.name || "Unknown User"}
                              </Text>
                              <IconButton
                                aria-label="Adjust balance"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenAdjustment(balance)}
                                borderRadius="lg"
                                color={textSecondary}
                                _hover={{ bg: hoverBg, color: "brand.500" }}
                              >
                                <LuPencil size={14} />
                              </IconButton>
                            </HStack>
                            <Text fontSize="sm" color={textSecondary}>
                              {balance.user?.email}
                            </Text>
                            {balance.tier && (
                              <Badge
                                colorPalette="purple"
                                variant="subtle"
                                fontSize="xs"
                                borderRadius="full"
                                px={2}
                              >
                                {balance.tier.name} ({balance.tier.accrual_rate}{" "}
                                hrs/period)
                              </Badge>
                            )}
                          </VStack>

                          {/* Balance Stats */}
                          <SimpleGrid
                            columns={{ base: 3, sm: 6 }}
                            gap={{ base: 2, sm: 4 }}
                            flex={1}
                          >
                            <VStack gap={0} align="center">
                              <Text fontSize="xs" color={textSecondary}>
                                Available
                              </Text>
                              <Text
                                fontSize={{ base: "md", sm: "lg" }}
                                fontWeight="bold"
                                color={
                                  balance.available_hours < 0
                                    ? "red.500"
                                    : "green.500"
                                }
                              >
                                {balance.available_hours}
                              </Text>
                            </VStack>
                            <VStack gap={0} align="center">
                              <Text fontSize="xs" color={textSecondary}>
                                Accrued
                              </Text>
                              <Text
                                fontSize={{ base: "md", sm: "lg" }}
                                fontWeight="semibold"
                                color={textPrimary}
                              >
                                {balance.accrued_hours}
                              </Text>
                            </VStack>
                            <VStack gap={0} align="center">
                              <Text fontSize="xs" color={textSecondary}>
                                Used
                              </Text>
                              <Text
                                fontSize={{ base: "md", sm: "lg" }}
                                fontWeight="semibold"
                                color={textPrimary}
                              >
                                {balance.used_hours}
                              </Text>
                            </VStack>
                            <VStack gap={0} align="center">
                              <Text fontSize="xs" color={textSecondary}>
                                Pending
                              </Text>
                              <Text
                                fontSize={{ base: "md", sm: "lg" }}
                                fontWeight="semibold"
                                color="amber.500"
                              >
                                {balance.pending_hours}
                              </Text>
                            </VStack>
                            <VStack gap={0} align="center">
                              <Text fontSize="xs" color={textSecondary}>
                                Adjust
                              </Text>
                              <Text
                                fontSize={{ base: "md", sm: "lg" }}
                                fontWeight="semibold"
                                color={
                                  balance.adjustment_hours < 0
                                    ? "red.500"
                                    : balance.adjustment_hours > 0
                                      ? "green.500"
                                      : textPrimary
                                }
                              >
                                {balance.adjustment_hours > 0 ? "+" : ""}
                                {balance.adjustment_hours}
                              </Text>
                            </VStack>
                            <VStack gap={0} align="center">
                              <Text fontSize="xs" color={textSecondary}>
                                Max Neg
                              </Text>
                              <Text
                                fontSize={{ base: "md", sm: "lg" }}
                                fontWeight="semibold"
                                color={textPrimary}
                              >
                                {balance.max_negative}
                              </Text>
                            </VStack>
                          </SimpleGrid>
                        </Flex>
                      </Card.Body>
                    </Card.Root>
                  ))}
                </VStack>
              )}
            </VStack>
          </Tabs.Content>

          {/* Approvals Tab */}
          <Tabs.Content value="approvals">
            {isLoadingApprovals ? (
              <VStack gap={4}>
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    height="100px"
                    width="100%"
                    borderRadius="xl"
                  />
                ))}
              </VStack>
            ) : pendingRequests.length === 0 ? (
              <Card.Root
                bg={cardBg}
                borderRadius="xl"
                border="1px solid"
                borderColor={borderColor}
              >
                <Card.Body p={12}>
                  <VStack gap={4}>
                    <Box p={4} borderRadius="full" bg={inputBg}>
                      <LuCircleCheck
                        size={40}
                        color="var(--chakra-colors-green-500)"
                      />
                    </Box>
                    <VStack gap={1}>
                      <Text fontWeight="semibold" color={textPrimary}>
                        All caught up!
                      </Text>
                      <Text fontSize="sm" color={textSecondary}>
                        No pending time-off requests to review
                      </Text>
                    </VStack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ) : (
              <VStack gap={4} align="stretch">
                <Text fontSize="sm" color={textSecondary}>
                  {pendingRequests.length} pending request
                  {pendingRequests.length !== 1 ? "s" : ""} awaiting approval
                </Text>
                {pendingRequests.map((request) => (
                  <Card.Root
                    key={request.id}
                    bg={cardBg}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={borderColor}
                    overflow="hidden"
                  >
                    <Box h="3px" bg={request.type.color} />
                    <Card.Body p={5}>
                      <VStack align="stretch" gap={4}>
                        {/* Request Info */}
                        <Flex
                          justify="space-between"
                          align={{ base: "start", md: "center" }}
                          direction={{ base: "column", md: "row" }}
                          gap={3}
                        >
                          <HStack gap={4}>
                            <Box>
                              <Text fontWeight="semibold" color={textPrimary}>
                                {request.user.name}
                              </Text>
                              <Text fontSize="sm" color={textSecondary}>
                                {request.user.job_title || request.user.email}
                                {request.user.department &&
                                  ` • ${request.user.department}`}
                              </Text>
                            </Box>
                          </HStack>
                          <HStack gap={2} flexWrap="wrap">
                            <Badge
                              bg={`${request.type.color}20`}
                              color={request.type.color}
                              px={2}
                              py={1}
                              borderRadius="md"
                              fontSize="xs"
                            >
                              {request.type.name}
                            </Badge>
                            <Badge
                              colorPalette="amber"
                              variant="subtle"
                              px={2}
                              py={1}
                              borderRadius="md"
                              fontSize="xs"
                            >
                              <HStack gap={1}>
                                <LuCircleDashed size={12} />
                                <Text>Pending</Text>
                              </HStack>
                            </Badge>
                          </HStack>
                        </Flex>

                        {/* Date & Hours */}
                        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
                          <Box>
                            <Text fontSize="xs" color={textSecondary} mb={1}>
                              Dates
                            </Text>
                            <Text
                              fontWeight="medium"
                              color={textPrimary}
                              fontSize="sm"
                            >
                              {parseLocalDate(request.start_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                              {request.start_date !== request.end_date && (
                                <>
                                  {" "}
                                  –{" "}
                                  {parseLocalDate(request.end_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </>
                              )}
                              {request.start_date === request.end_date && (
                                <>
                                  ,{" "}
                                  {parseLocalDate(request.start_date).getFullYear()}
                                </>
                              )}
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color={textSecondary} mb={1}>
                              Duration
                            </Text>
                            <Text
                              fontWeight="medium"
                              color={textPrimary}
                              fontSize="sm"
                            >
                              {request.total_hours} hours
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color={textSecondary} mb={1}>
                              Manager
                            </Text>
                            <Text
                              fontWeight="medium"
                              color={textPrimary}
                              fontSize="sm"
                            >
                              {request.approver?.name || "—"}
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color={textSecondary} mb={1}>
                              Submitted
                            </Text>
                            <Text
                              fontWeight="medium"
                              color={textPrimary}
                              fontSize="sm"
                            >
                              {new Date(
                                request.submitted_at,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </Text>
                          </Box>
                        </SimpleGrid>

                        {/* Reason */}
                        {request.reason && (
                          <Box p={3} bg={inputBg} borderRadius="lg">
                            <Text fontSize="xs" color={textSecondary} mb={1}>
                              Reason
                            </Text>
                            <Text fontSize="sm" color={textPrimary}>
                              {request.reason}
                            </Text>
                          </Box>
                        )}

                        {/* Notes Input */}
                        {showApprovalNotes === request.id && (
                          <Box p={3} bg={inputBg} borderRadius="lg">
                            <Text
                              fontSize="sm"
                              fontWeight="medium"
                              color={textPrimary}
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
                              bg={cardBg}
                              px={2}
                              py={2}
                            />
                          </Box>
                        )}

                        {/* Actions */}
                        <Flex justify="flex-end" gap={2} flexWrap="wrap">
                          <IconButton
                            aria-label="Add notes"
                            size="sm"
                            variant={
                              showApprovalNotes === request.id
                                ? "solid"
                                : "ghost"
                            }
                            colorPalette={
                              showApprovalNotes === request.id
                                ? "brand"
                                : "gray"
                            }
                            onClick={() => {
                              if (showApprovalNotes === request.id) {
                                setShowApprovalNotes(null);
                                setApprovalNotes("");
                              } else {
                                setShowApprovalNotes(request.id);
                                setApprovalNotes("");
                              }
                            }}
                            borderRadius="lg"
                          >
                            <LuMessageSquare size={16} />
                          </IconButton>
                          <Box
                            as="button"
                            onClick={
                              processingRequestId === request.id
                                ? undefined
                                : () =>
                                    handleDenyRequest(
                                      request.id,
                                      showApprovalNotes === request.id
                                        ? approvalNotes
                                        : undefined,
                                    )
                            }
                            aria-disabled={processingRequestId === request.id}
                            px={4}
                            py={2}
                            bg="red.500"
                            color="white"
                            borderRadius="lg"
                            fontSize="sm"
                            fontWeight="medium"
                            opacity={
                              processingRequestId === request.id ? 0.7 : 1
                            }
                            cursor={
                              processingRequestId === request.id
                                ? "not-allowed"
                                : "pointer"
                            }
                            _hover={{
                              bg:
                                processingRequestId === request.id
                                  ? "red.500"
                                  : "red.600",
                            }}
                            display="flex"
                            alignItems="center"
                            gap={2}
                          >
                            <LuCircleX size={16} />
                            Deny
                          </Box>
                          <Box
                            as="button"
                            onClick={
                              processingRequestId === request.id
                                ? undefined
                                : () =>
                                    handleApproveRequest(
                                      request.id,
                                      showApprovalNotes === request.id
                                        ? approvalNotes
                                        : undefined,
                                    )
                            }
                            aria-disabled={processingRequestId === request.id}
                            px={4}
                            py={2}
                            bg="green.500"
                            color="white"
                            borderRadius="lg"
                            fontSize="sm"
                            fontWeight="medium"
                            opacity={
                              processingRequestId === request.id ? 0.7 : 1
                            }
                            cursor={
                              processingRequestId === request.id
                                ? "not-allowed"
                                : "pointer"
                            }
                            _hover={{
                              bg:
                                processingRequestId === request.id
                                  ? "green.500"
                                  : "green.600",
                            }}
                            display="flex"
                            alignItems="center"
                            gap={2}
                          >
                            <LuCircleCheck size={16} />
                            Approve
                          </Box>
                        </Flex>
                      </VStack>
                    </Card.Body>
                  </Card.Root>
                ))}
              </VStack>
            )}
          </Tabs.Content>

          {/* Settings Tab */}
          <Tabs.Content value="settings">
            {isLoadingSettings ? (
              <VStack gap={4}>
                <Skeleton height="200px" width="100%" borderRadius="xl" />
                <Skeleton height="200px" width="100%" borderRadius="xl" />
                <Skeleton height="200px" width="100%" borderRadius="xl" />
              </VStack>
            ) : (
              <VStack align="stretch" gap={6}>
                {/* General Settings */}
                {generalSettings && (
                  <Card.Root
                    bg={cardBg}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <Card.Body p={5}>
                      <VStack align="stretch" gap={4}>
                        <Flex justify="space-between" align="center">
                          <HStack gap={2}>
                            <Box
                              p={2}
                              borderRadius="lg"
                              bg="purple.500/10"
                              color="purple.500"
                            >
                              <LuSettings size={18} />
                            </Box>
                            <Text fontWeight="semibold" color={textPrimary}>
                              General Settings
                            </Text>
                          </HStack>
                          {!isEditingGeneral ? (
                            <IconButton
                              aria-label="Edit settings"
                              size="sm"
                              variant="ghost"
                              onClick={handleEditGeneralSettings}
                              borderRadius="lg"
                            >
                              <LuPencil size={14} />
                            </IconButton>
                          ) : (
                            <HStack gap={2}>
                              <Box
                                as="button"
                                px={3}
                                py={1.5}
                                bg={inputBg}
                                color={textPrimary}
                                borderRadius="lg"
                                fontSize="sm"
                                fontWeight="medium"
                                onClick={handleCancelEditSettings}
                                _hover={{ bg: hoverBg }}
                              >
                                Cancel
                              </Box>
                              <Box
                                as="button"
                                px={3}
                                py={1.5}
                                bg="brand.500"
                                color="white"
                                borderRadius="lg"
                                fontSize="sm"
                                fontWeight="medium"
                                onClick={handleSaveGeneralSettings}
                                opacity={isSavingSettings ? 0.6 : 1}
                                _hover={{ bg: "brand.600" }}
                              >
                                {isSavingSettings ? "Saving..." : "Save"}
                              </Box>
                            </HStack>
                          )}
                        </Flex>

                        {!isEditingGeneral ? (
                          <>
                            <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
                              <VStack align="start" gap={1}>
                                <Text fontSize="xs" color={textSecondary}>
                                  Hours/Day
                                </Text>
                                <Text fontWeight="semibold" color={textPrimary}>
                                  {generalSettings.hours_per_day}
                                </Text>
                              </VStack>
                              <VStack align="start" gap={1}>
                                <Text fontSize="xs" color={textSecondary}>
                                  Accrual Period
                                </Text>
                                <Text fontWeight="semibold" color={textPrimary}>
                                  {generalSettings.accrual_period_days} days
                                </Text>
                              </VStack>
                              <VStack align="start" gap={1}>
                                <Text fontSize="xs" color={textSecondary}>
                                  Max Balance
                                </Text>
                                <Text fontWeight="semibold" color={textPrimary}>
                                  {generalSettings.max_balance} hrs
                                </Text>
                              </VStack>
                              <VStack align="start" gap={1}>
                                <Text fontSize="xs" color={textSecondary}>
                                  Max Carry-over
                                </Text>
                                <Text fontWeight="semibold" color={textPrimary}>
                                  {generalSettings.max_carry_over} hrs
                                </Text>
                              </VStack>
                            </SimpleGrid>

                            {generalSettings.transition_enabled && (
                              <Box
                                p={3}
                                bg="amber.500/10"
                                borderRadius="lg"
                                border="1px solid"
                                borderColor="amber.500/20"
                              >
                                <HStack gap={2}>
                                  <LuInfo
                                    size={16}
                                    color="var(--chakra-colors-amber-500)"
                                  />
                                  <Text fontSize="sm" color="amber.600">
                                    Transition period active until{" "}
                                    {generalSettings.transition_end_date}
                                  </Text>
                                </HStack>
                              </Box>
                            )}
                          </>
                        ) : (
                          editedSettings && (
                            <VStack align="stretch" gap={4}>
                              <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
                                <Box>
                                  <Text
                                    fontSize="xs"
                                    color={textSecondary}
                                    mb={1}
                                  >
                                    Hours/Day
                                  </Text>
                                  <Input
                                    type="number"
                                    value={editedSettings.hours_per_day}
                                    onChange={(e) =>
                                      setEditedSettings({
                                        ...editedSettings,
                                        hours_per_day:
                                          parseInt(e.target.value) || 0,
                                      })
                                    }
                                    size="sm"
                                    bg={inputBg}
                                    borderRadius="lg"
                                    px={4}
                                  />
                                </Box>
                                <Box>
                                  <Text
                                    fontSize="xs"
                                    color={textSecondary}
                                    mb={1}
                                  >
                                    Accrual Period (days)
                                  </Text>
                                  <Input
                                    type="number"
                                    value={editedSettings.accrual_period_days}
                                    onChange={(e) =>
                                      setEditedSettings({
                                        ...editedSettings,
                                        accrual_period_days:
                                          parseInt(e.target.value) || 0,
                                      })
                                    }
                                    size="sm"
                                    bg={inputBg}
                                    borderRadius="lg"
                                    px={4}
                                  />
                                </Box>
                                <Box>
                                  <Text
                                    fontSize="xs"
                                    color={textSecondary}
                                    mb={1}
                                  >
                                    Max Balance (hrs)
                                  </Text>
                                  <Input
                                    type="number"
                                    value={editedSettings.max_balance}
                                    onChange={(e) =>
                                      setEditedSettings({
                                        ...editedSettings,
                                        max_balance:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    size="sm"
                                    bg={inputBg}
                                    borderRadius="lg"
                                    px={4}
                                  />
                                </Box>
                                <Box>
                                  <Text
                                    fontSize="xs"
                                    color={textSecondary}
                                    mb={1}
                                  >
                                    Max Carry-over (hrs)
                                  </Text>
                                  <Input
                                    type="number"
                                    value={editedSettings.max_carry_over}
                                    onChange={(e) =>
                                      setEditedSettings({
                                        ...editedSettings,
                                        max_carry_over:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    size="sm"
                                    bg={inputBg}
                                    borderRadius="lg"
                                    px={4}
                                  />
                                </Box>
                              </SimpleGrid>

                              <SimpleGrid columns={{ base: 2, md: 3 }} gap={4}>
                                <Box>
                                  <Text
                                    fontSize="xs"
                                    color={textSecondary}
                                    mb={1}
                                  >
                                    Min Increment (hrs)
                                  </Text>
                                  <Input
                                    type="number"
                                    step="0.25"
                                    value={editedSettings.min_increment}
                                    onChange={(e) =>
                                      setEditedSettings({
                                        ...editedSettings,
                                        min_increment:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    size="sm"
                                    bg={inputBg}
                                    borderRadius="lg"
                                    px={4}
                                  />
                                </Box>
                                <Box>
                                  <Text
                                    fontSize="xs"
                                    color={textSecondary}
                                    mb={1}
                                  >
                                    Part-time Min Hours/Week
                                  </Text>
                                  <Input
                                    type="number"
                                    value={editedSettings.part_time_min_hours}
                                    onChange={(e) =>
                                      setEditedSettings({
                                        ...editedSettings,
                                        part_time_min_hours:
                                          parseInt(e.target.value) || 0,
                                      })
                                    }
                                    size="sm"
                                    bg={inputBg}
                                    borderRadius="lg"
                                    px={4}
                                  />
                                </Box>
                                <Box>
                                  <Text
                                    fontSize="xs"
                                    color={textSecondary}
                                    mb={1}
                                  >
                                    Full-time Hours/Week
                                  </Text>
                                  <Input
                                    type="number"
                                    value={editedSettings.full_time_hours}
                                    onChange={(e) =>
                                      setEditedSettings({
                                        ...editedSettings,
                                        full_time_hours:
                                          parseInt(e.target.value) || 0,
                                      })
                                    }
                                    size="sm"
                                    bg={inputBg}
                                    borderRadius="lg"
                                    px={4}
                                  />
                                </Box>
                              </SimpleGrid>

                              <Box p={3} bg={inputBg} borderRadius="lg">
                                <Text
                                  fontSize="sm"
                                  fontWeight="medium"
                                  color={textPrimary}
                                  mb={3}
                                >
                                  Transition Period
                                </Text>
                                <SimpleGrid
                                  columns={{ base: 1, md: 3 }}
                                  gap={4}
                                >
                                  <HStack>
                                    <input
                                      type="checkbox"
                                      checked={
                                        editedSettings.transition_enabled
                                      }
                                      onChange={(e) =>
                                        setEditedSettings({
                                          ...editedSettings,
                                          transition_enabled: e.target.checked,
                                        })
                                      }
                                    />
                                    <Text fontSize="sm" color={textPrimary}>
                                      Enabled
                                    </Text>
                                  </HStack>
                                  <Box>
                                    <Text
                                      fontSize="xs"
                                      color={textSecondary}
                                      mb={1}
                                    >
                                      Start Date
                                    </Text>
                                    <Input
                                      type="date"
                                      value={
                                        editedSettings.transition_start_date ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setEditedSettings({
                                          ...editedSettings,
                                          transition_start_date: e.target.value,
                                        })
                                      }
                                      size="sm"
                                      bg={cardBg}
                                      borderRadius="lg"
                                      px={4}
                                    />
                                  </Box>
                                  <Box>
                                    <Text
                                      fontSize="xs"
                                      color={textSecondary}
                                      mb={1}
                                    >
                                      End Date
                                    </Text>
                                    <Input
                                      type="date"
                                      value={
                                        editedSettings.transition_end_date || ""
                                      }
                                      onChange={(e) =>
                                        setEditedSettings({
                                          ...editedSettings,
                                          transition_end_date: e.target.value,
                                        })
                                      }
                                      size="sm"
                                      bg={cardBg}
                                      borderRadius="lg"
                                      px={4}
                                    />
                                  </Box>
                                </SimpleGrid>
                              </Box>
                            </VStack>
                          )
                        )}
                      </VStack>
                    </Card.Body>
                  </Card.Root>
                )}

                {/* Time-Off Types & Accrual Tiers */}
                <Card.Root
                  bg={cardBg}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <Card.Body p={5}>
                    <VStack align="stretch" gap={4}>
                      <HStack gap={2}>
                        <Box
                          p={2}
                          borderRadius="lg"
                          bg="blue.500/10"
                          color="blue.500"
                        >
                          <LuCalendar size={18} />
                        </Box>
                        <Text fontWeight="semibold" color={textPrimary}>
                          Time-Off Types & Accrual Tiers
                        </Text>
                      </HStack>

                      {timeOffTypes.length === 0 ? (
                        <Text fontSize="sm" color={textSecondary}>
                          No time-off types configured
                        </Text>
                      ) : (
                        <VStack align="stretch" gap={4}>
                          {timeOffTypes.map((type) => (
                            <Box
                              key={type.id}
                              p={4}
                              bg={inputBg}
                              borderRadius="lg"
                            >
                              <HStack justify="space-between" mb={3}>
                                <HStack gap={2}>
                                  <Badge
                                    colorPalette={
                                      type.is_active ? "green" : "gray"
                                    }
                                    variant="subtle"
                                    px={4}
                                  >
                                    {type.code}
                                  </Badge>
                                  <Text
                                    fontWeight="semibold"
                                    color={textPrimary}
                                  >
                                    {type.name}
                                  </Text>
                                </HStack>
                                <HStack gap={2}>
                                  {type.requires_approval && (
                                    <Badge
                                      colorPalette="purple"
                                      variant="subtle"
                                      fontSize="xs"
                                      px={4}
                                    >
                                      Requires Approval
                                    </Badge>
                                  )}
                                  {type.uses_accrual && (
                                    <Badge
                                      colorPalette="blue"
                                      variant="subtle"
                                      fontSize="xs"
                                      px={4}
                                    >
                                      Uses Accrual
                                    </Badge>
                                  )}
                                  {type.is_paid && (
                                    <Badge
                                      colorPalette="green"
                                      variant="subtle"
                                      fontSize="xs"
                                      px={4}
                                    >
                                      Paid
                                    </Badge>
                                  )}
                                </HStack>
                              </HStack>

                              {type.description && (
                                <Text
                                  fontSize="sm"
                                  color={textSecondary}
                                  mb={3}
                                >
                                  {type.description}
                                </Text>
                              )}

                              {type.tiers.length > 0 && (
                                <Box overflowX="auto">
                                  <Box as="table" w="full" fontSize="sm">
                                    <Box as="thead">
                                      <Box
                                        as="tr"
                                        borderBottom="1px solid"
                                        borderColor={borderColor}
                                      >
                                        <Box
                                          as="th"
                                          textAlign="left"
                                          py={2}
                                          px={3}
                                          color={textSecondary}
                                          fontWeight="medium"
                                        >
                                          Tier
                                        </Box>
                                        <Box
                                          as="th"
                                          textAlign="center"
                                          py={2}
                                          px={3}
                                          color={textSecondary}
                                          fontWeight="medium"
                                        >
                                          Tenure
                                        </Box>
                                        <Box
                                          as="th"
                                          textAlign="center"
                                          py={2}
                                          px={3}
                                          color={textSecondary}
                                          fontWeight="medium"
                                        >
                                          Rate/Period
                                        </Box>
                                        <Box
                                          as="th"
                                          textAlign="center"
                                          py={2}
                                          px={3}
                                          color={textSecondary}
                                          fontWeight="medium"
                                        >
                                          Annual
                                        </Box>
                                        <Box
                                          as="th"
                                          textAlign="center"
                                          py={2}
                                          px={3}
                                          color={textSecondary}
                                          fontWeight="medium"
                                        >
                                          Max Neg
                                        </Box>
                                      </Box>
                                    </Box>
                                    <Box as="tbody">
                                      {type.tiers.map((tier) => (
                                        <Box
                                          as="tr"
                                          key={tier.id}
                                          _hover={{ bg: hoverBg }}
                                        >
                                          <Box
                                            as="td"
                                            py={2}
                                            px={3}
                                            color={textPrimary}
                                            fontWeight="medium"
                                          >
                                            {tier.name}
                                          </Box>
                                          <Box
                                            as="td"
                                            py={2}
                                            px={3}
                                            textAlign="center"
                                            color={textSecondary}
                                          >
                                            {tier.min_tenure_years}–
                                            {tier.max_tenure_years ?? "∞"} yrs
                                          </Box>
                                          <Box
                                            as="td"
                                            py={2}
                                            px={3}
                                            textAlign="center"
                                            color={textPrimary}
                                          >
                                            {tier.accrual_rate} hrs
                                          </Box>
                                          <Box
                                            as="td"
                                            py={2}
                                            px={3}
                                            textAlign="center"
                                            color={textPrimary}
                                          >
                                            {tier.annual_hours} hrs (
                                            {tier.annual_days}d)
                                          </Box>
                                          <Box
                                            as="td"
                                            py={2}
                                            px={3}
                                            textAlign="center"
                                            color="red.500"
                                          >
                                            {tier.max_negative} hrs
                                          </Box>
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                  </Card.Body>
                </Card.Root>

                {/* Blackout Periods */}
                <Card.Root
                  bg={cardBg}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <Card.Body p={5}>
                    <VStack align="stretch" gap={4}>
                      <Flex justify="space-between" align="center">
                        <HStack gap={2}>
                          <Box
                            p={2}
                            borderRadius="lg"
                            bg="red.500/10"
                            color="red.500"
                          >
                            <LuCalendarOff size={18} />
                          </Box>
                          <Text fontWeight="semibold" color={textPrimary}>
                            Blackout Periods
                          </Text>
                        </HStack>
                        <Box
                          as="button"
                          px={3}
                          py={1.5}
                          bg="brand.500"
                          color="white"
                          borderRadius="lg"
                          fontSize="sm"
                          fontWeight="medium"
                          onClick={handleCreateBlackout}
                          _hover={{ bg: "brand.600" }}
                        >
                          <HStack gap={1}>
                            <LuPlus size={14} />
                            <Text>Add Period</Text>
                          </HStack>
                        </Box>
                      </Flex>

                      {blackoutPeriods.length === 0 ? (
                        <Box p={6} textAlign="center">
                          <Text fontSize="sm" color={textSecondary}>
                            No blackout periods configured
                          </Text>
                          <Text fontSize="xs" color={textSecondary} mt={1}>
                            Blackout periods prevent employees from requesting
                            time off during specific dates
                          </Text>
                        </Box>
                      ) : (
                        <VStack align="stretch" gap={2}>
                          {blackoutPeriods.map((period) => (
                            <Flex
                              key={period.id}
                              p={3}
                              bg={inputBg}
                              borderRadius="lg"
                              justify="space-between"
                              align="center"
                              gap={4}
                            >
                              <VStack align="start" gap={0.5} flex={1}>
                                <HStack gap={2}>
                                  <Text fontWeight="medium" color={textPrimary}>
                                    {period.name}
                                  </Text>
                                  {!period.is_active && (
                                    <Badge
                                      colorPalette="gray"
                                      variant="subtle"
                                      fontSize="xs"
                                      px={4}
                                    >
                                      Inactive
                                    </Badge>
                                  )}
                                  {period.department && (
                                    <Badge
                                      colorPalette="blue"
                                      variant="subtle"
                                      fontSize="xs"
                                      px={4}
                                    >
                                      {period.department}
                                    </Badge>
                                  )}
                                </HStack>
                                <Text fontSize="sm" color={textSecondary}>
                                  {parseLocalDate(period.start_date).toLocaleDateString()}{" "}
                                  –{" "}
                                  {parseLocalDate(period.end_date).toLocaleDateString()}
                                </Text>
                                {period.reason && (
                                  <Text fontSize="xs" color={textSecondary}>
                                    {period.reason}
                                  </Text>
                                )}
                              </VStack>
                              <HStack gap={1}>
                                <IconButton
                                  aria-label="Edit"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditBlackout(period)}
                                  borderRadius="lg"
                                >
                                  <LuPencil size={14} />
                                </IconButton>
                                <IconButton
                                  aria-label="Delete"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteBlackout(period)}
                                  borderRadius="lg"
                                  colorPalette="red"
                                >
                                  <LuTrash2 size={14} />
                                </IconButton>
                              </HStack>
                            </Flex>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                  </Card.Body>
                </Card.Root>
              </VStack>
            )}
          </Tabs.Content>
        </Box>
      </Tabs.Root>

      {/* Edit User Drawer */}
      <EditUserDrawer
        user={editingUser}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onUserUpdated={handleUserUpdated}
        availableRoles={roles}
        availableDepartments={departments}
      />

      {/* Create User Drawer */}
      <CreateUserDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onUserCreated={handleUserCreated}
        availableRoles={roles}
        availableDepartments={departments}
        availableManagers={managers}
      />

      {/* Adjustment Modal */}
      {adjustingBalance && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          zIndex={100}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
          onClick={handleCloseAdjustment}
        >
          <Card.Root
            bg={cardBg}
            borderRadius="2xl"
            maxW="500px"
            w="full"
            shadow="2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Card.Body p={0}>
              {/* Header */}
              <Flex
                justify="space-between"
                align="center"
                p={5}
                borderBottom="1px solid"
                borderColor={borderColor}
              >
                <VStack align="start" gap={0}>
                  <Text fontWeight="semibold" fontSize="lg" color={textPrimary}>
                    Adjust PTO Balance
                  </Text>
                  <Text fontSize="sm" color={textSecondary}>
                    {adjustingBalance.user?.name}
                  </Text>
                </VStack>
                <IconButton
                  aria-label="Close"
                  variant="ghost"
                  onClick={handleCloseAdjustment}
                  borderRadius="lg"
                >
                  <LuX size={20} />
                </IconButton>
              </Flex>

              {/* Current Balance Summary */}
              <Box
                p={5}
                bg={inputBg}
                borderBottom="1px solid"
                borderColor={borderColor}
              >
                <SimpleGrid columns={3} gap={4}>
                  <VStack gap={0}>
                    <Text fontSize="xs" color={textSecondary}>
                      Current Available
                    </Text>
                    <Text
                      fontSize="xl"
                      fontWeight="bold"
                      color={
                        adjustingBalance.available_hours < 0
                          ? "red.500"
                          : "green.500"
                      }
                    >
                      {adjustingBalance.available_hours}
                    </Text>
                  </VStack>
                  <VStack gap={0}>
                    <Text fontSize="xs" color={textSecondary}>
                      Current Adjustment
                    </Text>
                    <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                      {adjustingBalance.adjustment_hours > 0 ? "+" : ""}
                      {adjustingBalance.adjustment_hours}
                    </Text>
                  </VStack>
                  <VStack gap={0}>
                    <Text fontSize="xs" color={textSecondary}>
                      Max Negative
                    </Text>
                    <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
                      {adjustingBalance.max_negative}
                    </Text>
                  </VStack>
                </SimpleGrid>
              </Box>

              {/* Adjustment Form */}
              <VStack p={5} gap={4} align="stretch">
                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={textPrimary}
                    mb={2}
                  >
                    Adjustment Hours
                  </Text>
                  <HStack gap={2}>
                    <IconButton
                      aria-label="Subtract"
                      onClick={() => {
                        const current = parseFloat(adjustmentHours) || 0;
                        setAdjustmentHours(String(current - 8));
                      }}
                      variant="outline"
                      borderRadius="lg"
                      colorPalette="red"
                    >
                      <LuMinus size={16} />
                    </IconButton>
                    <Input
                      type="number"
                      value={adjustmentHours}
                      onChange={(e) => setAdjustmentHours(e.target.value)}
                      placeholder="e.g., 8 or -16"
                      textAlign="center"
                      bg={cardBg}
                      border="1px solid"
                      borderColor={borderColor}
                      borderRadius="xl"
                      fontWeight="semibold"
                      fontSize="lg"
                    />
                    <IconButton
                      aria-label="Add"
                      onClick={() => {
                        const current = parseFloat(adjustmentHours) || 0;
                        setAdjustmentHours(String(current + 8));
                      }}
                      variant="outline"
                      borderRadius="lg"
                      colorPalette="green"
                    >
                      <LuPlus size={16} />
                    </IconButton>
                  </HStack>
                  {adjustmentHours && (
                    <Text
                      fontSize="sm"
                      color={
                        parseFloat(adjustmentHours) > 0
                          ? "green.500"
                          : "red.500"
                      }
                      mt={2}
                    >
                      New available:{" "}
                      {(
                        adjustingBalance.available_hours +
                        (parseFloat(adjustmentHours) || 0)
                      ).toFixed(2)}{" "}
                      hrs
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={textPrimary}
                    mb={2}
                  >
                    Reason (required)
                  </Text>
                  <Textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Enter reason for adjustment..."
                    rows={3}
                    bg={cardBg}
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="xl"
                    px={2}
                    py={2}
                  />
                </Box>
              </VStack>

              {/* Footer */}
              <Flex
                p={5}
                gap={3}
                borderTop="1px solid"
                borderColor={borderColor}
                justify="flex-end"
              >
                <Box
                  as="button"
                  px={4}
                  py={2}
                  bg={inputBg}
                  color={textPrimary}
                  borderRadius="lg"
                  fontWeight="medium"
                  fontSize="sm"
                  onClick={handleCloseAdjustment}
                  _hover={{ bg: hoverBg }}
                >
                  Cancel
                </Box>
                <Box
                  as="button"
                  px={4}
                  py={2}
                  bg="brand.500"
                  color="white"
                  borderRadius="lg"
                  fontWeight="medium"
                  fontSize="sm"
                  onClick={handleSubmitAdjustment}
                  opacity={
                    !adjustmentHours || !adjustmentReason.trim() || isAdjusting
                      ? 0.6
                      : 1
                  }
                  cursor={
                    !adjustmentHours || !adjustmentReason.trim() || isAdjusting
                      ? "not-allowed"
                      : "pointer"
                  }
                  _hover={{ bg: "brand.600" }}
                >
                  {isAdjusting ? "Applying..." : "Apply Adjustment"}
                </Box>
              </Flex>
            </Card.Body>
          </Card.Root>
        </Box>
      )}

      {/* Blackout Period Modal */}
      {(isCreatingBlackout || editingBlackout) && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          zIndex={100}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
          onClick={handleCloseBlackoutForm}
        >
          <Card.Root
            bg={cardBg}
            borderRadius="2xl"
            maxW="500px"
            w="full"
            shadow="2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Card.Body p={0}>
              {/* Header */}
              <Flex
                justify="space-between"
                align="center"
                p={5}
                borderBottom="1px solid"
                borderColor={borderColor}
              >
                <Text fontWeight="semibold" fontSize="lg" color={textPrimary}>
                  {editingBlackout
                    ? "Edit Blackout Period"
                    : "New Blackout Period"}
                </Text>
                <IconButton
                  aria-label="Close"
                  variant="ghost"
                  onClick={handleCloseBlackoutForm}
                  borderRadius="lg"
                >
                  <LuX size={20} />
                </IconButton>
              </Flex>

              {/* Form */}
              <VStack p={5} gap={4} align="stretch">
                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={textPrimary}
                    mb={2}
                  >
                    Name *
                  </Text>
                  <Input
                    value={blackoutForm.name}
                    onChange={(e) =>
                      setBlackoutForm({ ...blackoutForm, name: e.target.value })
                    }
                    placeholder="e.g., Holiday Freeze, Year-End Close"
                    bg={inputBg}
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="xl"
                    px={4}
                  />
                </Box>

                <SimpleGrid columns={2} gap={4}>
                  <Box>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={textPrimary}
                      mb={2}
                    >
                      Start Date *
                    </Text>
                    <Input
                      type="date"
                      value={blackoutForm.start_date}
                      onChange={(e) =>
                        setBlackoutForm({
                          ...blackoutForm,
                          start_date: e.target.value,
                        })
                      }
                      bg={inputBg}
                      border="1px solid"
                      borderColor={borderColor}
                      borderRadius="xl"
                      px={4}
                    />
                  </Box>
                  <Box>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={textPrimary}
                      mb={2}
                    >
                      End Date *
                    </Text>
                    <Input
                      type="date"
                      value={blackoutForm.end_date}
                      onChange={(e) =>
                        setBlackoutForm({
                          ...blackoutForm,
                          end_date: e.target.value,
                        })
                      }
                      bg={inputBg}
                      border="1px solid"
                      borderColor={borderColor}
                      borderRadius="xl"
                      px={4}
                    />
                  </Box>
                </SimpleGrid>

                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={textPrimary}
                    mb={2}
                  >
                    Department (optional)
                  </Text>
                  <select
                    value={blackoutForm.department}
                    onChange={(e) =>
                      setBlackoutForm({
                        ...blackoutForm,
                        department: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      backgroundColor: "var(--chakra-colors-gray-50)",
                      border: "1px solid var(--chakra-colors-gray-200)",
                      borderRadius: "12px",
                      fontSize: "14px",
                      color: blackoutForm.department
                        ? "inherit"
                        : "var(--chakra-colors-gray-500)",
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <Text fontSize="xs" color={textSecondary} mt={1}>
                    {`Leave as "All Departments" to apply blackout to everyone`}
                  </Text>
                </Box>

                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={textPrimary}
                    mb={2}
                  >
                    Reason (optional)
                  </Text>
                  <Textarea
                    value={blackoutForm.reason}
                    onChange={(e) =>
                      setBlackoutForm({
                        ...blackoutForm,
                        reason: e.target.value,
                      })
                    }
                    placeholder="Why is this blackout period needed?"
                    rows={2}
                    bg={inputBg}
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="xl"
                    px={2}
                    py={2}
                  />
                </Box>
              </VStack>

              {/* Footer */}
              <Flex
                p={5}
                gap={3}
                borderTop="1px solid"
                borderColor={borderColor}
                justify="flex-end"
              >
                <Box
                  as="button"
                  px={4}
                  py={2}
                  bg={inputBg}
                  color={textPrimary}
                  borderRadius="lg"
                  fontWeight="medium"
                  fontSize="sm"
                  onClick={handleCloseBlackoutForm}
                  _hover={{ bg: hoverBg }}
                >
                  Cancel
                </Box>
                <Box
                  as="button"
                  px={4}
                  py={2}
                  bg="brand.500"
                  color="white"
                  borderRadius="lg"
                  fontWeight="medium"
                  fontSize="sm"
                  onClick={handleSaveBlackout}
                  opacity={
                    !blackoutForm.name ||
                    !blackoutForm.start_date ||
                    !blackoutForm.end_date ||
                    isSavingBlackout
                      ? 0.6
                      : 1
                  }
                  cursor={
                    !blackoutForm.name ||
                    !blackoutForm.start_date ||
                    !blackoutForm.end_date ||
                    isSavingBlackout
                      ? "not-allowed"
                      : "pointer"
                  }
                  _hover={{ bg: "brand.600" }}
                >
                  {isSavingBlackout
                    ? "Saving..."
                    : editingBlackout
                      ? "Update"
                      : "Create"}
                </Box>
              </Flex>
            </Card.Body>
          </Card.Root>
        </Box>
      )}
    </VStack>
  );
}
