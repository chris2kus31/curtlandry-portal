"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Drawer,
  Portal,
  VStack,
  HStack,
  Text,
  Input,
  Flex,
  Spinner,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuX,
  LuUser,
  LuUsers,
  LuBuilding,
  LuBriefcase,
  LuShieldCheck,
  LuSave,
  LuPower,
} from "react-icons/lu";
import { adminService } from "@/lib/api";

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
  is_manager?: boolean;
  reports_to?: number | null;
  roles: string[];
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
}

interface Manager {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  department?: string;
}

interface EditUserDrawerProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  availableRoles: Role[];
  availableDepartments: string[];
  availableManagers?: Manager[];
}

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

export function EditUserDrawer({
  user,
  isOpen,
  onClose,
  onUserUpdated,
  availableRoles,
  availableDepartments,
  availableManagers = [],
}: EditUserDrawerProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    department: "",
    job_title: "",
    reports_to: "" as string | number,
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Colors - ALL hooks must be called before any conditional returns
  const drawerBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const labelColor = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const footerBg = useColorModeValue("gray.50", "gray.800");

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        department: user.department || "",
        job_title: user.job_title || "",
        reports_to: user.reports_to ?? "",
      });
      setSelectedRoles(user.roles || []);
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName],
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const reportsTo = formData.reports_to === "" ? null : Number(formData.reports_to);

      await adminService.updateUser(user.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        department: formData.department || undefined,
        job_title: formData.job_title || undefined,
        reports_to: reportsTo,
      });

      // Update roles if changed
      const rolesChanged =
        JSON.stringify([...selectedRoles].sort()) !==
        JSON.stringify([...user.roles].sort());

      if (rolesChanged) {
        await adminService.updateUserRoles(user.id, selectedRoles);
      }

      toaster.create({
        title: "User updated",
        description: `${formData.first_name} ${formData.last_name} has been updated`,
        type: "success",
      });

      onUserUpdated();
      onClose();
    } catch (error: unknown) {
      console.error("Failed to update user:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: string }).message)
            : "Please try again";
      toaster.create({
        title: "Update failed",
        description: message,
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;

    setIsTogglingStatus(true);
    try {
      if (user.is_active) {
        await adminService.deactivateUser(user.id);
      } else {
        await adminService.reactivateUser(user.id);
      }

      toaster.create({
        title: user.is_active ? "User deactivated" : "User reactivated",
        description: `${user.first_name} ${user.last_name} has been ${user.is_active ? "deactivated" : "reactivated"}`,
        type: "success",
      });

      onUserUpdated();
      onClose();
    } catch (error: unknown) {
      console.error("Failed to toggle user status:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: string }).message)
            : "Please try again";
      toaster.create({
        title: "Action failed",
        description: message,
        type: "error",
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  if (!user) return null;

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      placement="end"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg={drawerBg} maxW="400px" w="full">
            {/* Header */}
            <Box
              p={4}
              borderBottom="1px solid"
              borderColor={borderColor}
              bg={headerBg}
            >
              <Flex justify="space-between" align="center">
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="brand.500" color="white">
                    <LuUser size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color={textPrimary}>
                      Edit User
                    </Text>
                    <Text fontSize="sm" color={textSecondary}>
                      {user.email}
                    </Text>
                  </Box>
                </HStack>
                <Box
                  as="button"
                  p={2}
                  borderRadius="lg"
                  color={textSecondary}
                  _hover={{ bg: hoverBg }}
                  onClick={onClose}
                >
                  <LuX size={20} />
                </Box>
              </Flex>
            </Box>

            {/* Body */}
            <Box p={5} overflowY="auto" flex={1}>
              <VStack gap={5} align="stretch">
                {/* Name Fields */}
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color={labelColor}
                    mb={3}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Personal Information
                  </Text>
                  <VStack gap={3}>
                    <Box w="full">
                      <Text fontSize="sm" color={textSecondary} mb={1.5}>
                        First Name
                      </Text>
                      <Input
                        value={formData.first_name}
                        onChange={(e) =>
                          handleInputChange("first_name", e.target.value)
                        }
                        bg={inputBg}
                        border="1px solid"
                        borderColor={borderColor}
                        borderRadius="lg"
                        _focus={{ borderColor: "brand.500" }}
                        px={4}
                      />
                    </Box>
                    <Box w="full">
                      <Text fontSize="sm" color={textSecondary} mb={1.5}>
                        Last Name
                      </Text>
                      <Input
                        value={formData.last_name}
                        onChange={(e) =>
                          handleInputChange("last_name", e.target.value)
                        }
                        bg={inputBg}
                        border="1px solid"
                        borderColor={borderColor}
                        borderRadius="lg"
                        _focus={{ borderColor: "brand.500" }}
                        px={4}
                      />
                    </Box>
                  </VStack>
                </Box>

                {/* Work Info */}
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color={labelColor}
                    mb={3}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Work Information
                  </Text>
                  <VStack gap={3}>
                    <Box w="full">
                      <HStack gap={2} mb={1.5}>
                        <LuBuilding
                          size={14}
                          color="var(--chakra-colors-gray-400)"
                        />
                        <Text fontSize="sm" color={textSecondary}>
                          Department
                        </Text>
                      </HStack>
                      <Box
                        position="relative"
                        bg={inputBg}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={borderColor}
                        _focusWithin={{ borderColor: "brand.500" }}
                      >
                        <select
                          value={formData.department}
                          onChange={(e) =>
                            handleInputChange("department", e.target.value)
                          }
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: "transparent",
                            color: "inherit",
                            fontSize: "14px",
                            cursor: "pointer",
                            appearance: "none",
                            WebkitAppearance: "none",
                            outline: "none",
                          }}
                        >
                          <option value="">Select Department</option>
                          {availableDepartments.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
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
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        </Box>
                      </Box>
                    </Box>
                    <Box w="full">
                      <HStack gap={2} mb={1.5}>
                        <LuBriefcase
                          size={14}
                          color="var(--chakra-colors-gray-400)"
                        />
                        <Text fontSize="sm" color={textSecondary}>
                          Job Title
                        </Text>
                      </HStack>
                      <Input
                        value={formData.job_title}
                        onChange={(e) =>
                          handleInputChange("job_title", e.target.value)
                        }
                        placeholder="e.g., Software Engineer"
                        bg={inputBg}
                        border="1px solid"
                        borderColor={borderColor}
                        borderRadius="lg"
                        _focus={{ borderColor: "brand.500" }}
                        px={4}
                      />
                    </Box>
                    {availableManagers.length > 0 && (
                      <Box w="full">
                        <HStack gap={2} mb={1.5}>
                          <LuUsers
                            size={14}
                            color="var(--chakra-colors-gray-400)"
                          />
                          <Text fontSize="sm" color={textSecondary}>
                            Reports To
                          </Text>
                        </HStack>
                        <Box
                          position="relative"
                          bg={inputBg}
                          borderRadius="lg"
                          border="1px solid"
                          borderColor={borderColor}
                          _focusWithin={{ borderColor: "brand.500" }}
                        >
                          <select
                            value={formData.reports_to}
                            onChange={(e) =>
                              handleInputChange("reports_to", e.target.value)
                            }
                            style={{
                              width: "100%",
                              padding: "10px 16px",
                              borderRadius: "8px",
                              border: "none",
                              backgroundColor: "transparent",
                              color: "inherit",
                              fontSize: "14px",
                              cursor: "pointer",
                              appearance: "none",
                              WebkitAppearance: "none",
                              outline: "none",
                            }}
                          >
                            <option value="">No Manager</option>
                            {availableManagers
                              .filter((m) => m.id !== user?.id)
                              .map((mgr) => (
                                <option key={mgr.id} value={mgr.id}>
                                  {mgr.first_name && mgr.last_name
                                    ? `${mgr.first_name} ${mgr.last_name}`
                                    : mgr.name || mgr.email}
                                  {mgr.department ? ` (${mgr.department})` : ""}
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
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </VStack>
                </Box>

                {/* Roles */}
                <Box>
                  <HStack gap={2} mb={3}>
                    <LuShieldCheck
                      size={14}
                      color="var(--chakra-colors-gray-400)"
                    />
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color={labelColor}
                      textTransform="uppercase"
                      letterSpacing="wide"
                    >
                      Roles
                    </Text>
                  </HStack>
                  <Flex gap={2} flexWrap="wrap">
                    {availableRoles.map((role) => {
                      const isSelected = selectedRoles.includes(role.name);
                      const colorScheme = getRoleColor(role.name);

                      return (
                        <Box
                          key={role.id}
                          as="button"
                          px={3}
                          py={1.5}
                          borderRadius="full"
                          fontSize="sm"
                          fontWeight="medium"
                          border="2px solid"
                          borderColor={
                            isSelected ? `${colorScheme}.500` : borderColor
                          }
                          bg={isSelected ? `${colorScheme}.500` : "transparent"}
                          color={isSelected ? "white" : textSecondary}
                          onClick={() => toggleRole(role.name)}
                          transition="all 0.15s"
                          _hover={{
                            borderColor: `${colorScheme}.400`,
                            bg: isSelected
                              ? `${colorScheme}.600`
                              : `${colorScheme}.50`,
                          }}
                        >
                          {role.display_name}
                        </Box>
                      );
                    })}
                  </Flex>
                  {selectedRoles.length === 0 && (
                    <Text fontSize="xs" color={textSecondary} mt={2}>
                      User will have basic employee access
                    </Text>
                  )}
                </Box>

                {/* Status */}
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color={labelColor}
                    mb={3}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Account Status
                  </Text>
                  <Flex
                    p={4}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={borderColor}
                    bg={inputBg}
                    justify="space-between"
                    align="center"
                  >
                    <HStack gap={3}>
                      <Box
                        w={3}
                        h={3}
                        borderRadius="full"
                        bg={user.is_active ? "green.500" : "red.500"}
                      />
                      <Box>
                        <Text fontWeight="medium" color={textPrimary}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Text>
                        <Text fontSize="xs" color={textSecondary}>
                          {user.is_active
                            ? "User can access the portal"
                            : "User cannot log in"}
                        </Text>
                      </Box>
                    </HStack>
                    <Box
                      as="button"
                      px={3}
                      py={1.5}
                      borderRadius="lg"
                      fontSize="sm"
                      fontWeight="medium"
                      bg={user.is_active ? "red.500" : "green.500"}
                      color="white"
                      onClick={
                        isTogglingStatus ? undefined : handleToggleStatus
                      }
                      aria-disabled={isTogglingStatus}
                      opacity={isTogglingStatus ? 0.7 : 1}
                      cursor={isTogglingStatus ? "not-allowed" : "pointer"}
                      _hover={{ opacity: 0.9 }}
                      display="flex"
                      alignItems="center"
                      gap={1.5}
                    >
                      {isTogglingStatus ? (
                        <Spinner size="xs" />
                      ) : (
                        <LuPower size={14} />
                      )}
                      {user.is_active ? "Deactivate" : "Activate"}
                    </Box>
                  </Flex>
                </Box>
              </VStack>
            </Box>

            {/* Footer */}
            <Box
              p={4}
              borderTop="1px solid"
              borderColor={borderColor}
              bg={footerBg}
            >
              <HStack gap={3}>
                <Box
                  as="button"
                  flex={1}
                  py={2.5}
                  borderRadius="lg"
                  fontWeight="medium"
                  border="1px solid"
                  borderColor={borderColor}
                  color={textPrimary}
                  bg="transparent"
                  onClick={onClose}
                  _hover={{ bg: hoverBg }}
                >
                  Cancel
                </Box>
                <Box
                  as="button"
                  flex={1}
                  py={2.5}
                  borderRadius="lg"
                  fontWeight="medium"
                  bg="brand.500"
                  color="white"
                  onClick={isSaving ? undefined : handleSave}
                  aria-disabled={isSaving}
                  opacity={isSaving ? 0.7 : 1}
                  cursor={isSaving ? "not-allowed" : "pointer"}
                  _hover={{ bg: isSaving ? "brand.500" : "brand.600" }}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={2}
                >
                  {isSaving ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <LuSave size={16} />
                      Save Changes
                    </>
                  )}
                </Box>
              </HStack>
            </Box>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
