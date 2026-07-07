"use client";

import { useCallback, useEffect, useState } from "react";
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
  Badge,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuArrowLeft,
  LuLaptop,
  LuPlus,
  LuSearch,
  LuInbox,
  LuTrash2,
  LuShieldAlert,
  LuUser,
} from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { assetService } from "@/lib/api";
import type { Asset, AssetOptions } from "@/lib/api";
import { AssetFormDrawer } from "@/components/onboarding/AssetFormDrawer";
import { AssetDetailDrawer } from "@/components/onboarding/AssetDetailDrawer";

export default function AssetInventoryPage() {
  const router = useRouter();
  const { hasRole, hasPermission } = useAuthStore();
  const canManage = hasPermission("assets.manage") || hasRole("super_admin");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [options, setOptions] = useState<AssetOptions | null>(null);
  const [loading, setLoading] = useState(canManage);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const rowHoverBg = useColorModeValue("gray.50", "gray.800");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const tagBg = useColorModeValue("gray.100", "gray.800");
  const backColor = useColorModeValue("gray.600", "gray.400");
  const backHover = useColorModeValue("gray.900", "gray.50");

  const loadOptions = useCallback(async () => {
    try {
      setOptions(await assetService.getOptions());
    } catch {
      setOptions(null);
    }
  }, []);

  const loadAssets = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const res = await assetService.list({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: search.trim() || undefined,
        per_page: 100,
        sort_by: "name",
        sort_dir: "asc",
      });
      setAssets(res.data ?? []);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [canManage, statusFilter, typeFilter, search]);

  useEffect(() => {
    if (canManage) loadOptions();
  }, [canManage, loadOptions]);

  useEffect(() => {
    const t = setTimeout(loadAssets, 250);
    return () => clearTimeout(t);
  }, [loadAssets]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEditFromDetail = (asset: Asset) => {
    setDetailOpen(false);
    setEditing(asset);
    setFormOpen(true);
  };

  const openDetail = (asset: Asset) => {
    setDetailId(asset.id);
    setDetailOpen(true);
  };

  const handleDelete = async (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete “${asset.name}”? This removes the asset and its assignment history.`,
      )
    ) {
      return;
    }
    setDeletingId(asset.id);
    try {
      await assetService.remove(asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      toaster.create({ title: "Asset deleted", type: "success" });
    } catch (error) {
      toaster.create({
        title: "Failed to delete",
        description: error instanceof Error ? error.message : "Try again",
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const selectStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "transparent",
    color: "inherit",
    fontSize: "14px",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    outline: "none",
  };

  const FilterSelect = ({
    value,
    onChange,
    placeholder,
    entries,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    entries: [string, string][];
  }) => (
    <Box
      bg={inputBg}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      _focusWithin={{ borderColor: "brand.500" }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        <option value="">{placeholder}</option>
        {entries.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
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
                You don&apos;t have access to asset inventory
              </Text>
              <Text color={textSecondary} fontSize="sm">
                Only IT/onboarding admins can manage device inventory.
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
            Asset Inventory
          </Heading>
          <Text color={textSecondary} mt={1}>
            Track devices, assignments, and chain-of-custody history.
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
          Add Asset
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
            <HStack gap={3} flexWrap="wrap">
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All statuses"
                entries={Object.entries(options?.statuses ?? {})}
              />
              <FilterSelect
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="All types"
                entries={Object.entries(options?.types ?? {})}
              />
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
                placeholder="Search name, tag, or serial…"
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
          ) : assets.length === 0 ? (
            <VStack gap={3} py={12} textAlign="center">
              <Box color={textMuted}>
                <LuInbox size={40} />
              </Box>
              <Text color={textPrimary} fontWeight="medium">
                No assets found
              </Text>
              <Text color={textSecondary} fontSize="sm">
                Add laptops, monitors, and other devices to start tracking them.
              </Text>
            </VStack>
          ) : (
            <VStack gap={2} align="stretch">
              {assets.map((asset) => (
                <Flex
                  key={asset.id}
                  align="center"
                  gap={3}
                  px={4}
                  py={3}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={borderColor}
                  cursor="pointer"
                  onClick={() => openDetail(asset)}
                  _hover={{ bg: rowHoverBg }}
                  transition="all 0.15s"
                >
                  <Box color={textMuted} flexShrink={0}>
                    <LuLaptop size={18} />
                  </Box>

                  <Box flex={1} minW={0}>
                    <HStack gap={2} flexWrap="wrap">
                      <Text fontWeight="semibold" color={textPrimary} truncate>
                        {asset.name}
                      </Text>
                      {asset.asset_tag && (
                        <Text fontSize="xs" color={textMuted}>
                          {asset.asset_tag}
                        </Text>
                      )}
                    </HStack>
                    <HStack gap={2} mt={0.5}>
                      <Text fontSize="sm" color={textSecondary}>
                        {asset.type_label}
                      </Text>
                      {asset.assigned_user && (
                        <HStack gap={1} color={textMuted} fontSize="sm">
                          <LuUser size={12} />
                          <Text truncate>{asset.assigned_user.name}</Text>
                        </HStack>
                      )}
                    </HStack>
                  </Box>

                  <Badge
                    colorPalette={asset.status_color ?? "gray"}
                    px={2.5}
                    py={1}
                    borderRadius="full"
                    flexShrink={0}
                  >
                    {asset.status_label}
                  </Badge>

                  <Box
                    as="button"
                    p={2}
                    borderRadius="md"
                    color={deletingId === asset.id ? textMuted : "red.400"}
                    onClick={(e) =>
                      deletingId === asset.id ? undefined : handleDelete(asset, e)
                    }
                    aria-disabled={deletingId === asset.id}
                    cursor={deletingId === asset.id ? "not-allowed" : "pointer"}
                    _hover={{ bg: "red.500/10" }}
                    transition="all 0.15s"
                    title="Delete"
                    flexShrink={0}
                  >
                    <LuTrash2 size={16} />
                  </Box>
                </Flex>
              ))}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>

      <AssetFormDrawer
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadAssets}
        item={editing}
        options={options}
      />

      <AssetDetailDrawer
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        assetId={detailId}
        options={options}
        onChanged={loadAssets}
        onEdit={openEditFromDetail}
      />
    </VStack>
  );
}
