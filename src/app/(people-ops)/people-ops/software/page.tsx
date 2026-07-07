"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  Heading,
  HStack,
  Text,
  VStack,
  Flex,
  Input,
  Skeleton,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuArrowLeft,
  LuPackage,
  LuPlus,
  LuSearch,
  LuInbox,
  LuPencil,
  LuTrash2,
  LuShieldAlert,
  LuTriangleAlert,
} from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { onboardingService, softwareService } from "@/lib/api";
import type { SoftwareCatalogItem } from "@/lib/api";
import { SoftwareCatalogDrawer } from "@/components/onboarding/SoftwareCatalogDrawer";

type CatalogFilter = "active" | "all";

export default function SoftwareCatalogPage() {
  const router = useRouter();
  const { hasRole, hasPermission } = useAuthStore();
  const canManage = hasPermission("software.manage") || hasRole("super_admin");

  const [items, setItems] = useState<SoftwareCatalogItem[]>([]);
  const [loading, setLoading] = useState(canManage);
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<CatalogFilter>("active");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SoftwareCatalogItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const rowHoverBg = useColorModeValue("gray.50", "gray.800");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const segBg = useColorModeValue("gray.100", "gray.800");
  const tagBg = useColorModeValue("gray.100", "gray.800");
  const backColor = useColorModeValue("gray.600", "gray.400");
  const backHover = useColorModeValue("gray.900", "gray.50");

  const loadItems = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const res = await softwareService.list({
        is_active: filter === "active" ? true : undefined,
        per_page: 100,
        sort_by: "name",
        sort_dir: "asc",
      });
      setItems(res.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canManage, filter]);

  const loadDepartments = useCallback(async () => {
    try {
      const data = await onboardingService.getOptions();
      setDepartments(data.departments ?? {});
    } catch {
      setDepartments({});
    }
  }, []);

  useEffect(() => {
    if (canManage) loadDepartments();
  }, [canManage, loadDepartments]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => {
      const name = i.name?.toLowerCase() ?? "";
      const dept = i.department?.toLowerCase() ?? "";
      return name.includes(term) || dept.includes(term);
    });
  }, [items, search]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (item: SoftwareCatalogItem) => {
    setEditing(item);
    setDrawerOpen(true);
  };

  const handleDelete = async (item: SoftwareCatalogItem) => {
    if (
      !window.confirm(
        `Remove “${item.name}” from the catalog? Existing cases keep their saved selections.`,
      )
    ) {
      return;
    }
    setDeletingId(item.id);
    try {
      await softwareService.remove(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toaster.create({ title: "Software removed", type: "success" });
    } catch (error) {
      toaster.create({
        title: "Failed to remove",
        description: error instanceof Error ? error.message : "Try again",
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const Tag = ({
    children,
    color,
    bg,
  }: {
    children: React.ReactNode;
    color?: string;
    bg?: string;
  }) => (
    <Box
      px={2}
      py={0.5}
      borderRadius="md"
      fontSize="xs"
      fontWeight="medium"
      bg={bg ?? tagBg}
      color={color ?? textSecondary}
      whiteSpace="nowrap"
    >
      {children}
    </Box>
  );

  const BackButton = (
    <Box
      as="button"
      onClick={() => router.push("/people-ops?tab=onboarding")}
      display="inline-flex"
      alignItems="center"
      gap={2}
      color={backColor}
      fontSize="sm"
      fontWeight="medium"
      w="fit-content"
      _hover={{ color: backHover }}
      transition="color 0.15s"
    >
      <LuArrowLeft size={16} />
      Back to People Ops
    </Box>
  );

  if (!canManage) {
    return (
      <VStack gap={6} align="stretch">
        {BackButton}
        <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <Card.Body>
            <VStack gap={3} py={10} textAlign="center">
              <Box color={textMuted}>
                <LuShieldAlert size={40} />
              </Box>
              <Text color={textPrimary} fontWeight="medium">
                You don&apos;t have access to the software catalog
              </Text>
              <Text color={textSecondary} fontSize="sm">
                Only IT/onboarding admins can manage the software catalog.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      {BackButton}

      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={4}
      >
        <Box>
          <Heading as="h1" size="xl" color={textPrimary} fontWeight="bold">
            Software Catalog
          </Heading>
          <Text color={textSecondary} mt={1}>
            The list managers pick from when onboarding a new hire.
          </Text>
        </Box>
        <Box
          as="button"
          onClick={openCreate}
          bg="brand.500"
          color="white"
          px={4}
          py={2.5}
          borderRadius="lg"
          fontWeight="medium"
          display="flex"
          alignItems="center"
          gap={2}
          flexShrink={0}
          _hover={{ bg: "brand.600" }}
          transition="all 0.15s"
        >
          <LuPlus size={18} />
          Add Software
        </Box>
      </Flex>

      <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <Card.Body>
          <Flex
            justify="space-between"
            align={{ base: "stretch", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap={3}
            mb={5}
          >
            <HStack gap={1} bg={segBg} p={1} borderRadius="lg" w="fit-content">
              {(["active", "all"] as CatalogFilter[]).map((key) => {
                const active = filter === key;
                return (
                  <Box
                    key={key}
                    as="button"
                    px={4}
                    py={1.5}
                    borderRadius="md"
                    fontSize="sm"
                    fontWeight="medium"
                    textTransform="capitalize"
                    bg={active ? cardBg : "transparent"}
                    color={active ? textPrimary : textSecondary}
                    boxShadow={active ? "sm" : "none"}
                    onClick={() => setFilter(key)}
                    transition="all 0.15s"
                  >
                    {key}
                  </Box>
                );
              })}
            </HStack>

            <Box position="relative" maxW={{ base: "full", md: "280px" }} w="full">
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or department…"
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="lg"
                pl={9}
                px={4}
                _focus={{ borderColor: "brand.500" }}
              />
            </Box>
          </Flex>

          {loading ? (
            <VStack gap={3} align="stretch">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height="56px" borderRadius="lg" />
              ))}
            </VStack>
          ) : filtered.length === 0 ? (
            <VStack gap={3} py={12} textAlign="center">
              <Box color={textMuted}>
                <LuInbox size={40} />
              </Box>
              <Text color={textPrimary} fontWeight="medium">
                No software yet
              </Text>
              <Text color={textSecondary} fontSize="sm">
                Add the apps and licenses your team installs for new hires.
              </Text>
            </VStack>
          ) : (
            <VStack gap={2} align="stretch">
              {filtered.map((item) => (
                <Flex
                  key={item.id}
                  align="center"
                  gap={3}
                  px={4}
                  py={3}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={borderColor}
                  _hover={{ bg: rowHoverBg }}
                  transition="all 0.15s"
                >
                  <Box
                    color={item.requires_approval ? "orange.400" : textMuted}
                    flexShrink={0}
                  >
                    <LuPackage size={18} />
                  </Box>

                  <Box flex={1} minW={0}>
                    <HStack gap={2} flexWrap="wrap">
                      <Text fontWeight="semibold" color={textPrimary} truncate>
                        {item.name}
                      </Text>
                      {!item.is_active && <Tag>Inactive</Tag>}
                    </HStack>
                    {item.notes && (
                      <Text fontSize="sm" color={textSecondary} truncate>
                        {item.notes}
                      </Text>
                    )}
                  </Box>

                  <Tag>{item.department || "All depts"}</Tag>

                  {item.requires_approval && (
                    <Tag color="orange.600" bg="orange.500/10">
                      <HStack gap={1}>
                        <LuTriangleAlert size={12} />
                        <Text as="span">Approval</Text>
                      </HStack>
                    </Tag>
                  )}

                  <HStack gap={1} flexShrink={0}>
                    <Box
                      as="button"
                      p={2}
                      borderRadius="md"
                      color={textMuted}
                      onClick={() => openEdit(item)}
                      _hover={{ bg: tagBg, color: textPrimary }}
                      transition="all 0.15s"
                      title="Edit"
                    >
                      <LuPencil size={16} />
                    </Box>
                    <Box
                      as="button"
                      p={2}
                      borderRadius="md"
                      color={deletingId === item.id ? textMuted : "red.400"}
                      onClick={
                        deletingId === item.id
                          ? undefined
                          : () => handleDelete(item)
                      }
                      aria-disabled={deletingId === item.id}
                      cursor={deletingId === item.id ? "not-allowed" : "pointer"}
                      _hover={{ bg: "red.500/10" }}
                      transition="all 0.15s"
                      title="Remove"
                    >
                      <LuTrash2 size={16} />
                    </Box>
                  </HStack>
                </Flex>
              ))}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>

      <SoftwareCatalogDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={loadItems}
        item={editing}
        departments={departments}
      />
    </VStack>
  );
}
