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
  LuUserPlus,
  LuBuilding,
  LuBriefcase,
  LuShieldCheck,
  LuSave,
  LuMail,
  LuCalendar,
  LuClock,
  LuUsers,
} from "react-icons/lu";
import { adminService } from "@/lib/api";

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
}

interface Manager {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface CreateUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
  availableRoles: Role[];
  availableDepartments: string[];
  availableManagers: Manager[];
}

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "contractor", label: "Contractor" },
  { value: "intern", label: "Intern" },
];

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

export function CreateUserDrawer({
  isOpen,
  onClose,
  onUserCreated,
  availableRoles,
  availableDepartments,
  availableManagers,
}: CreateUserDrawerProps) {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    department: "",
    job_title: "",
    hire_date: "",
    employment_type: "full_time",
    weekly_hours: "40",
    reports_to: "",
    is_manager: false,
    initial_pto_balance: "",
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  const errorColor = useColorModeValue("red.500", "red.400");

  // Reset form when drawer opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        department: "",
        job_title: "",
        hire_date: "",
        employment_type: "full_time",
        weekly_hours: "40",
        reports_to: "",
        is_manager: false,
        initial_pto_balance: "",
      });
      setSelectedRoles([]);
      setErrors({});
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName],
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    if (formData.hire_date) {
      const hireDate = new Date(formData.hire_date);
      const today = new Date();
      if (hireDate > today) {
        newErrors.hire_date = "Hire date cannot be in the future";
      }
    }

    if (formData.weekly_hours) {
      const hours = parseFloat(formData.weekly_hours);
      if (isNaN(hours) || hours < 0 || hours > 80) {
        newErrors.weekly_hours = "Weekly hours must be between 0 and 80";
      }
    }

    if (formData.initial_pto_balance) {
      const balance = parseFloat(formData.initial_pto_balance);
      if (isNaN(balance)) {
        newErrors.initial_pto_balance = "Invalid balance value";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // Create user
      const userData: Parameters<typeof adminService.createUser>[0] = {
        email: formData.email.trim().toLowerCase(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        department: formData.department || undefined,
        job_title: formData.job_title || undefined,
        hire_date: formData.hire_date || undefined,
        employment_type: formData.employment_type,
        weekly_hours: formData.weekly_hours
          ? parseFloat(formData.weekly_hours)
          : 40,
        reports_to: formData.reports_to
          ? parseInt(formData.reports_to)
          : undefined,
        is_manager: formData.is_manager,
        roles: selectedRoles.length > 0 ? selectedRoles : undefined,
        initial_pto_balance: formData.initial_pto_balance
          ? parseFloat(formData.initial_pto_balance)
          : undefined,
      };

      const newUser = await adminService.createUser(userData);

      // Update roles if any selected (backend already assigns default role)
      if (selectedRoles.length > 0) {
        await adminService.updateUserRoles(newUser.id, selectedRoles);
      }

      toaster.create({
        title: "User created",
        description: `${formData.first_name} ${formData.last_name} has been added successfully`,
        type: "success",
      });

      onUserCreated();
      onClose();
    } catch (error) {
      console.error("Failed to create user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Please try again";

      // Check for specific validation errors
      if (errorMessage.toLowerCase().includes("email")) {
        setErrors({ email: "This email is already in use" });
      } else {
        toaster.create({
          title: "Failed to create user",
          description: errorMessage,
          type: "error",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      placement="end"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg={drawerBg} maxW="450px" w="full">
            {/* Header */}
            <Box
              p={4}
              borderBottom="1px solid"
              borderColor={borderColor}
              bg={headerBg}
            >
              <Flex justify="space-between" align="center">
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="green.500" color="white">
                    <LuUserPlus size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color={textPrimary}>
                      Add New Employee
                    </Text>
                    <Text fontSize="sm" color={textSecondary}>
                      Create a new user account
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
                {/* Basic Info */}
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color={labelColor}
                    mb={3}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Basic Information
                  </Text>
                  <VStack gap={3}>
                    <Box w="full">
                      <HStack gap={2} mb={1.5}>
                        <LuMail
                          size={14}
                          color="var(--chakra-colors-gray-400)"
                        />
                        <Text fontSize="sm" color={textSecondary}>
                          Email <Text as="span" color="red.500">*</Text>
                        </Text>
                      </HStack>
                      <Input
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        placeholder="employee@company.com"
                        bg={inputBg}
                        border="1px solid"
                        borderColor={errors.email ? "red.500" : borderColor}
                        borderRadius="lg"
                        _focus={{ borderColor: errors.email ? "red.500" : "brand.500" }}
                        px={4}
                      />
                      {errors.email && (
                        <Text fontSize="xs" color={errorColor} mt={1}>
                          {errors.email}
                        </Text>
                      )}
                    </Box>
                    <HStack gap={3} w="full">
                      <Box flex={1}>
                        <Text fontSize="sm" color={textSecondary} mb={1.5}>
                          First Name <Text as="span" color="red.500">*</Text>
                        </Text>
                        <Input
                          value={formData.first_name}
                          onChange={(e) =>
                            handleInputChange("first_name", e.target.value)
                          }
                          placeholder="John"
                          bg={inputBg}
                          border="1px solid"
                          borderColor={errors.first_name ? "red.500" : borderColor}
                          borderRadius="lg"
                          _focus={{ borderColor: errors.first_name ? "red.500" : "brand.500" }}
                          px={4}
                        />
                        {errors.first_name && (
                          <Text fontSize="xs" color={errorColor} mt={1}>
                            {errors.first_name}
                          </Text>
                        )}
                      </Box>
                      <Box flex={1}>
                        <Text fontSize="sm" color={textSecondary} mb={1.5}>
                          Last Name <Text as="span" color="red.500">*</Text>
                        </Text>
                        <Input
                          value={formData.last_name}
                          onChange={(e) =>
                            handleInputChange("last_name", e.target.value)
                          }
                          placeholder="Doe"
                          bg={inputBg}
                          border="1px solid"
                          borderColor={errors.last_name ? "red.500" : borderColor}
                          borderRadius="lg"
                          _focus={{ borderColor: errors.last_name ? "red.500" : "brand.500" }}
                          px={4}
                        />
                        {errors.last_name && (
                          <Text fontSize="xs" color={errorColor} mt={1}>
                            {errors.last_name}
                          </Text>
                        )}
                      </Box>
                    </HStack>
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
                          <option value="">Select Manager</option>
                          {availableManagers.map((mgr) => (
                            <option key={mgr.id} value={mgr.id}>
                              {mgr.first_name} {mgr.last_name}
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
                  </VStack>
                </Box>

                {/* Employment Details */}
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color={labelColor}
                    mb={3}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Employment Details
                  </Text>
                  <VStack gap={3}>
                    <HStack gap={3} w="full">
                      <Box flex={1}>
                        <HStack gap={2} mb={1.5}>
                          <LuCalendar
                            size={14}
                            color="var(--chakra-colors-gray-400)"
                          />
                          <Text fontSize="sm" color={textSecondary}>
                            Hire Date
                          </Text>
                        </HStack>
                        <Input
                          type="date"
                          value={formData.hire_date}
                          onChange={(e) =>
                            handleInputChange("hire_date", e.target.value)
                          }
                          bg={inputBg}
                          border="1px solid"
                          borderColor={errors.hire_date ? "red.500" : borderColor}
                          borderRadius="lg"
                          _focus={{ borderColor: errors.hire_date ? "red.500" : "brand.500" }}
                          px={4}
                        />
                        {errors.hire_date && (
                          <Text fontSize="xs" color={errorColor} mt={1}>
                            {errors.hire_date}
                          </Text>
                        )}
                      </Box>
                      <Box flex={1}>
                        <Text fontSize="sm" color={textSecondary} mb={1.5}>
                          Employment Type
                        </Text>
                        <Box
                          position="relative"
                          bg={inputBg}
                          borderRadius="lg"
                          border="1px solid"
                          borderColor={borderColor}
                          _focusWithin={{ borderColor: "brand.500" }}
                        >
                          <select
                            value={formData.employment_type}
                            onChange={(e) =>
                              handleInputChange("employment_type", e.target.value)
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
                            {EMPLOYMENT_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
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
                    </HStack>
                    <HStack gap={3} w="full">
                      <Box flex={1}>
                        <HStack gap={2} mb={1.5}>
                          <LuClock
                            size={14}
                            color="var(--chakra-colors-gray-400)"
                          />
                          <Text fontSize="sm" color={textSecondary}>
                            Weekly Hours
                          </Text>
                        </HStack>
                        <Input
                          type="number"
                          value={formData.weekly_hours}
                          onChange={(e) =>
                            handleInputChange("weekly_hours", e.target.value)
                          }
                          placeholder="40"
                          min="0"
                          max="80"
                          bg={inputBg}
                          border="1px solid"
                          borderColor={errors.weekly_hours ? "red.500" : borderColor}
                          borderRadius="lg"
                          _focus={{ borderColor: errors.weekly_hours ? "red.500" : "brand.500" }}
                          px={4}
                        />
                        {errors.weekly_hours && (
                          <Text fontSize="xs" color={errorColor} mt={1}>
                            {errors.weekly_hours}
                          </Text>
                        )}
                      </Box>
                      <Box flex={1}>
                        <Text fontSize="sm" color={textSecondary} mb={1.5}>
                          Initial PTO Balance
                        </Text>
                        <Input
                          type="number"
                          value={formData.initial_pto_balance}
                          onChange={(e) =>
                            handleInputChange("initial_pto_balance", e.target.value)
                          }
                          placeholder="0"
                          step="0.5"
                          bg={inputBg}
                          border="1px solid"
                          borderColor={errors.initial_pto_balance ? "red.500" : borderColor}
                          borderRadius="lg"
                          _focus={{ borderColor: errors.initial_pto_balance ? "red.500" : "brand.500" }}
                          px={4}
                        />
                        {errors.initial_pto_balance && (
                          <Text fontSize="xs" color={errorColor} mt={1}>
                            {errors.initial_pto_balance}
                          </Text>
                        )}
                        <Text fontSize="xs" color={textSecondary} mt={1}>
                          Starting hours (can be negative)
                        </Text>
                      </Box>
                    </HStack>
                    <Box w="full">
                      <HStack
                        p={3}
                        bg={inputBg}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={borderColor}
                        cursor="pointer"
                        onClick={() => handleInputChange("is_manager", !formData.is_manager)}
                        _hover={{ borderColor: "brand.400" }}
                        transition="all 0.15s"
                      >
                        <Box
                          w={5}
                          h={5}
                          borderRadius="md"
                          border="2px solid"
                          borderColor={formData.is_manager ? "green.500" : borderColor}
                          bg={formData.is_manager ? "green.500" : "transparent"}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          transition="all 0.15s"
                        >
                          {formData.is_manager && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                              <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                          )}
                        </Box>
                        <Box flex={1}>
                          <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
                            This employee is a manager
                          </Text>
                          <Text fontSize="xs" color={textSecondary}>
                            Can have direct reports and approve time off
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
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
                  <Text fontSize="xs" color={textSecondary} mt={2}>
                    {selectedRoles.length === 0
                      ? "Default employee role will be assigned"
                      : `${selectedRoles.length} role(s) selected`}
                  </Text>
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
                  bg="green.500"
                  color="white"
                  onClick={isSaving ? undefined : handleSave}
                  aria-disabled={isSaving}
                  opacity={isSaving ? 0.7 : 1}
                  cursor={isSaving ? "not-allowed" : "pointer"}
                  _hover={{ bg: isSaving ? "green.500" : "green.600" }}
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
                      Create Employee
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
