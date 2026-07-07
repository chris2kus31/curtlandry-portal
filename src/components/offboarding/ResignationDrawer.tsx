"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import {
  Box,
  Drawer,
  Portal,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Flex,
  Spinner,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuX,
  LuUserMinus,
  LuUser,
  LuCalendar,
  LuSearch,
  LuSave,
} from "react-icons/lu";
import { offboardingService } from "@/lib/api";
import type {
  OffboardingFormOptions,
  OffboardingCase,
  ResignationPayload,
} from "@/lib/api";

interface ResignationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (created: OffboardingCase) => void;
  options: OffboardingFormOptions | null;
  optionsLoading?: boolean;
}

export function ResignationDrawer({
  isOpen,
  onClose,
  onCreated,
  options,
  optionsLoading = false,
}: ResignationDrawerProps) {
  const [userId, setUserId] = useState("");
  const [lastDay, setLastDay] = useState("");
  const [reason, setReason] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const drawerBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const labelColor = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const footerBg = useColorModeValue("gray.50", "gray.800");
  const errorColor = useColorModeValue("red.500", "red.400");
  const rowHoverBg = useColorModeValue("gray.50", "gray.800");
  const selectedBg = useColorModeValue("brand.500/10", "brand.500/20");

  useEffect(() => {
    if (isOpen) {
      setUserId("");
      setLastDay("");
      setReason("");
      setEmployeeSearch("");
      setErrors({});
    }
  }, [isOpen]);

  const employees = useMemo(() => options?.employees ?? [], [options]);

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) => {
      const name = e.name?.toLowerCase() ?? "";
      const email = e.email?.toLowerCase() ?? "";
      const dept = e.department?.toLowerCase() ?? "";
      return name.includes(term) || email.includes(term) || dept.includes(term);
    });
  }, [employees, employeeSearch]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => String(e.id) === userId) ?? null,
    [employees, userId],
  );

  const handleSubmit = async () => {
    const next: Record<string, string> = {};
    if (!userId) next.user_id = "Select an employee";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsSaving(true);
    try {
      const payload: ResignationPayload = {
        user_id: parseInt(userId, 10),
        last_day: lastDay || undefined,
        reason_note: reason.trim() || undefined,
      };

      const created = await offboardingService.submit(payload);

      toaster.create({
        title: "Resignation submitted",
        description: `${selectedEmployee?.name ?? "Employee"} has been submitted. IT & HR have been notified.`,
        type: "success",
      });

      onCreated(created);
      onClose();
    } catch (error) {
      toaster.create({
        title: "Failed to submit resignation",
        description: error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const FieldLabel = ({
    icon,
    children,
    required,
  }: {
    icon?: ReactNode;
    children: ReactNode;
    required?: boolean;
  }) => (
    <HStack gap={2} mb={1.5}>
      {icon}
      <Text fontSize="sm" color={textSecondary}>
        {children}
        {required && (
          <Text as="span" color="red.500">
            {" "}
            *
          </Text>
        )}
      </Text>
    </HStack>
  );

  const SectionTitle = ({ children }: { children: ReactNode }) => (
    <Text
      fontSize="xs"
      fontWeight="semibold"
      color={labelColor}
      mb={3}
      textTransform="uppercase"
      letterSpacing="wide"
    >
      {children}
    </Text>
  );

  const iconColor = "var(--chakra-colors-gray-400)";

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      placement="end"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg={drawerBg} maxW="480px" w="full">
            {/* Header */}
            <Box
              p={4}
              borderBottom="1px solid"
              borderColor={borderColor}
              bg={headerBg}
            >
              <Flex justify="space-between" align="center">
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="red.500" color="white">
                    <LuUserMinus size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color={textPrimary}>
                      Submit Resignation
                    </Text>
                    <Text fontSize="sm" color={textSecondary}>
                      Notifies IT &amp; HR to begin offboarding
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
              {optionsLoading ? (
                <Flex justify="center" align="center" py={16}>
                  <Spinner size="lg" color="brand.500" />
                </Flex>
              ) : (
                <VStack gap={5} align="stretch">
                  {/* Employee */}
                  <Box>
                    <SectionTitle>Departing Employee</SectionTitle>
                    <FieldLabel
                      icon={<LuUser size={14} color={iconColor} />}
                      required
                    >
                      Employee
                    </FieldLabel>

                    {selectedEmployee ? (
                      <HStack
                        p={3}
                        bg={selectedBg}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="brand.500"
                        justify="space-between"
                      >
                        <Box minW={0}>
                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            color={textPrimary}
                            truncate
                          >
                            {selectedEmployee.name}
                          </Text>
                          <Text fontSize="xs" color={textSecondary} truncate>
                            {selectedEmployee.email}
                            {selectedEmployee.department
                              ? ` · ${selectedEmployee.department}`
                              : ""}
                          </Text>
                        </Box>
                        <Box
                          as="button"
                          fontSize="sm"
                          color="brand.500"
                          fontWeight="medium"
                          onClick={() => setUserId("")}
                          flexShrink={0}
                        >
                          Change
                        </Box>
                      </HStack>
                    ) : (
                      <VStack gap={2} align="stretch">
                        <Box position="relative">
                          <Box
                            position="absolute"
                            left={3}
                            top="50%"
                            transform="translateY(-50%)"
                            color={textMuted}
                            pointerEvents="none"
                          >
                            <LuSearch size={16} />
                          </Box>
                          <Input
                            value={employeeSearch}
                            onChange={(e) => setEmployeeSearch(e.target.value)}
                            placeholder="Search by name, email, dept…"
                            bg={inputBg}
                            border="1px solid"
                            borderColor={
                              errors.user_id ? "red.500" : borderColor
                            }
                            borderRadius="lg"
                            pl={9}
                            px={4}
                            _focus={{ borderColor: "brand.500" }}
                          />
                        </Box>
                        {errors.user_id && (
                          <Text fontSize="xs" color={errorColor}>
                            {errors.user_id}
                          </Text>
                        )}
                        <Box
                          maxH="240px"
                          overflowY="auto"
                          border="1px solid"
                          borderColor={borderColor}
                          borderRadius="lg"
                        >
                          {filteredEmployees.length === 0 ? (
                            <Text
                              fontSize="sm"
                              color={textSecondary}
                              px={4}
                              py={3}
                            >
                              No matching employees.
                            </Text>
                          ) : (
                            filteredEmployees.map((emp) => (
                              <Box
                                key={emp.id}
                                as="button"
                                w="full"
                                textAlign="left"
                                px={4}
                                py={2.5}
                                borderBottom="1px solid"
                                borderColor={borderColor}
                                _hover={{ bg: rowHoverBg }}
                                onClick={() => setUserId(String(emp.id))}
                              >
                                <Text
                                  fontSize="sm"
                                  fontWeight="medium"
                                  color={textPrimary}
                                  truncate
                                >
                                  {emp.name}
                                </Text>
                                <Text
                                  fontSize="xs"
                                  color={textSecondary}
                                  truncate
                                >
                                  {emp.email}
                                  {emp.department ? ` · ${emp.department}` : ""}
                                </Text>
                              </Box>
                            ))
                          )}
                        </Box>
                      </VStack>
                    )}
                  </Box>

                  {/* Details */}
                  <Box>
                    <SectionTitle>Details</SectionTitle>
                    <VStack gap={3} align="stretch">
                      <Box w="full">
                        <FieldLabel
                          icon={<LuCalendar size={14} color={iconColor} />}
                        >
                          Last Day
                        </FieldLabel>
                        <Input
                          type="date"
                          value={lastDay}
                          onChange={(e) => setLastDay(e.target.value)}
                          bg={inputBg}
                          border="1px solid"
                          borderColor={borderColor}
                          borderRadius="lg"
                          px={4}
                          _focus={{ borderColor: "brand.500" }}
                        />
                        <Text fontSize="xs" color={textSecondary} mt={1}>
                          The account is auto-deactivated on/after this day as a
                          safety net.
                        </Text>
                      </Box>
                      <Box w="full">
                        <FieldLabel>Reason / Note</FieldLabel>
                        <Textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Optional context for HR & IT…"
                          bg={inputBg}
                          border="1px solid"
                          borderColor={borderColor}
                          borderRadius="lg"
                          px={4}
                          py={2}
                          rows={3}
                          _focus={{ borderColor: "brand.500" }}
                        />
                      </Box>
                    </VStack>
                  </Box>
                </VStack>
              )}
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
                  px={4}
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
                  px={4}
                  borderRadius="lg"
                  fontWeight="medium"
                  bg="brand.500"
                  color="white"
                  onClick={isSaving ? undefined : handleSubmit}
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
                      Submit
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
