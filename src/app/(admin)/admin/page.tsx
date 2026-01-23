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
  IconButton,
  Input,
  SimpleGrid,
  Flex,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
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
} from "react-icons/lu";
import { httpClient } from "@/lib/api";
import { EditUserDrawer } from "@/components/admin/EditUserDrawer";

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

interface ColorProps {
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  inputBg: string;
  hoverBg: string;
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
  colors,
}: {
  user: User;
  onEdit: (user: User) => void;
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
              <Text fontWeight="semibold" fontSize="md" color={colors.textPrimary}>
                {user.first_name} {user.last_name}
              </Text>
              <HStack gap={1.5} color={colors.textSecondary} fontSize="sm">
                <LuMail size={14} />
                <Text>{user.email}</Text>
              </HStack>
            </VStack>
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
          <Flex justify="space-between" align="center" pt={3} borderTop="1px solid" borderColor={colors.borderColor}>
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
                <Badge colorPalette="gray" variant="subtle" fontSize="xs" borderRadius="full" px={2} py={0.5}>
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
                <Text fontWeight="semibold" fontSize="md" color={colors.textPrimary}>
                  {role.display_name}
                </Text>
                <Badge colorPalette="gray" variant="outline" fontSize="xs" borderRadius="full" px={4}>
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
              <Text fontSize="2xl" fontWeight="bold" color={`${getRoleColor(role.name)}.500`}>
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
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      const res = await httpClient.get<{ data: User[] }>("/portal/admin/users");
      setUsers(res.data || []);
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
      const res = await httpClient.get<{ data: Role[] }>("/portal/admin/roles");
      setRoles(res.data || []);
      setRolesLoaded(true);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      setRoles([]);
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "users" && !usersLoaded && !isLoadingUsers) {
      fetchUsers();
    } else if (activeTab === "roles" && !rolesLoaded && !isLoadingRoles) {
      fetchRoles();
    }
  }, [activeTab, usersLoaded, rolesLoaded, isLoadingUsers, isLoadingRoles, fetchUsers, fetchRoles]);

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
  };

  const filteredUsers = users.filter(
    (user) =>
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Card.Root bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
          <Card.Body p={4}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="xs" color={textSecondary} fontWeight="medium">Total Users</Text>
                <Text fontSize="2xl" fontWeight="bold" color="brand.500">
                  {!usersLoaded ? "—" : users.length}
                </Text>
              </VStack>
              <Box p={2.5} borderRadius="lg" bg="brand.500/10" color="brand.500">
                <LuUsers size={20} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        <Card.Root bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
          <Card.Body p={4}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="xs" color={textSecondary} fontWeight="medium">Active</Text>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {!usersLoaded ? "—" : users.filter((u) => u.is_active).length}
                </Text>
              </VStack>
              <Box p={2.5} borderRadius="lg" bg="green.500/10" color="green.500">
                <LuUserPlus size={20} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        <Card.Root bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
          <Card.Body p={4}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="xs" color={textSecondary} fontWeight="medium">Roles</Text>
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {!rolesLoaded ? "—" : roles.length}
                </Text>
              </VStack>
              <Box p={2.5} borderRadius="lg" bg="purple.500/10" color="purple.500">
                <LuShieldCheck size={20} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        <Card.Root bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
          <Card.Body p={4}>
            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="xs" color={textSecondary} fontWeight="medium">Inactive</Text>
                <Text fontSize="2xl" fontWeight="bold" color="red.500">
                  {!usersLoaded ? "—" : users.filter((u) => !u.is_active).length}
                </Text>
              </VStack>
              <Box p={2.5} borderRadius="lg" bg="red.500/10" color="red.500">
                <LuUsers size={20} />
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {/* Tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(e) => setActiveTab(e.value)}
        variant="enclosed"
      >
        <Tabs.List bg={tabBg} p={1} borderRadius="xl" gap={1}>
          <Tabs.Trigger
            value="users"
            px={5}
            py={2.5}
            borderRadius="lg"
            fontWeight="medium"
            fontSize="sm"
            _selected={{ bg: activeTabBg, shadow: "sm" }}
          >
            <HStack gap={2}>
              <LuUsers size={16} />
              <Text>Users</Text>
              <Badge bg="brand.500" color="white" borderRadius="full" fontSize="xs" px={2} minW="20px">
                {users.length}
              </Badge>
            </HStack>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="roles"
            px={5}
            py={2.5}
            borderRadius="lg"
            fontWeight="medium"
            fontSize="sm"
            _selected={{ bg: activeTabBg, shadow: "sm" }}
          >
            <HStack gap={2}>
              <LuShieldCheck size={16} />
              <Text>Roles</Text>
            </HStack>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="balances"
            px={5}
            py={2.5}
            borderRadius="lg"
            fontWeight="medium"
            fontSize="sm"
            _selected={{ bg: activeTabBg, shadow: "sm" }}
          >
            <HStack gap={2}>
              <LuCalendar size={16} />
              <Text display={{ base: "none", sm: "block" }}>PTO Balances</Text>
              <Text display={{ base: "block", sm: "none" }}>PTO</Text>
            </HStack>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="settings"
            px={5}
            py={2.5}
            borderRadius="lg"
            fontWeight="medium"
            fontSize="sm"
            _selected={{ bg: activeTabBg, shadow: "sm" }}
          >
            <HStack gap={2}>
              <LuSettings size={16} />
              <Text display={{ base: "none", sm: "block" }}>Settings</Text>
            </HStack>
          </Tabs.Trigger>
        </Tabs.List>

        <Box mt={6}>
          {/* Users Tab */}
          <Tabs.Content value="users">
            <VStack align="stretch" gap={4}>
              {/* Search */}
              <Box
                position="relative"
                maxW={{ base: "100%", md: "400px" }}
              >
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
                  _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)" }}
                />
              </Box>

              {/* User Grid */}
              {isLoadingUsers ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} height="180px" borderRadius="xl" />
                  ))}
                </SimpleGrid>
              ) : filteredUsers.length === 0 ? (
                <Card.Root bg={cardBg} borderRadius="2xl" border="1px solid" borderColor={borderColor}>
                  <Card.Body p={12}>
                    <VStack gap={3}>
                      <Box p={4} borderRadius="full" bg={inputBg}>
                        <LuUsers size={32} color="var(--chakra-colors-gray-400)" />
                      </Box>
                      <Text fontWeight="medium" color={textPrimary}>
                        {searchQuery ? "No users match your search" : "No users found"}
                      </Text>
                      <Text fontSize="sm" color={textSecondary}>
                        {searchQuery ? "Try a different search term" : "Users will appear here once added"}
                      </Text>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                  {filteredUsers.map((user) => (
                    <UserCard key={user.id} user={user} onEdit={handleEditUser} colors={colors} />
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
              <Card.Root bg={cardBg} borderRadius="2xl" border="1px solid" borderColor={borderColor}>
                <Card.Body p={12}>
                  <VStack gap={3}>
                    <Box p={4} borderRadius="full" bg={inputBg}>
                      <LuShieldCheck size={32} color="var(--chakra-colors-gray-400)" />
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
            <Card.Root bg={cardBg} borderRadius="2xl" border="1px solid" borderColor={borderColor}>
              <Card.Body p={{ base: 8, md: 12 }}>
                <VStack gap={4}>
                  <Box
                    p={4}
                    borderRadius="full"
                    bg="linear-gradient(135deg, rgba(0, 188, 139, 0.1), rgba(0, 149, 193, 0.1))"
                  >
                    <LuCalendar size={32} color="var(--chakra-colors-brand-500)" />
                  </Box>
                  <VStack gap={1}>
                    <Text fontWeight="semibold" fontSize="lg" color={textPrimary}>
                      PTO Balance Management
                    </Text>
                    <Text fontSize="sm" color={textSecondary} textAlign="center" maxW="400px">
                      Coming soon — Manage employee PTO balances, accruals, adjustments, and carry-over settings
                    </Text>
                  </VStack>
                </VStack>
              </Card.Body>
            </Card.Root>
          </Tabs.Content>

          {/* Settings Tab */}
          <Tabs.Content value="settings">
            <Card.Root bg={cardBg} borderRadius="2xl" border="1px solid" borderColor={borderColor}>
              <Card.Body p={{ base: 8, md: 12 }}>
                <VStack gap={4}>
                  <Box
                    p={4}
                    borderRadius="full"
                    bg="linear-gradient(135deg, rgba(109, 40, 145, 0.1), rgba(0, 149, 193, 0.1))"
                  >
                    <LuSettings size={32} color="var(--chakra-colors-purple-500)" />
                  </Box>
                  <VStack gap={1}>
                    <Text fontWeight="semibold" fontSize="lg" color={textPrimary}>
                      System Settings
                    </Text>
                    <Text fontSize="sm" color={textSecondary} textAlign="center" maxW="400px">
                      Coming soon — Configure time-off types, blackout periods, accrual rules, and notification settings
                    </Text>
                  </VStack>
                </VStack>
              </Card.Body>
            </Card.Root>
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
      />
    </VStack>
  );
}
