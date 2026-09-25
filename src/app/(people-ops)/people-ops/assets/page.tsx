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
  Skeleton,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuArrowLeft,
  LuPlus,
  LuInbox,
  LuShieldAlert,
  LuCircleHelp,
} from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { assetService } from "@/lib/api";
import type { Asset, AssetInventoryCounts, AssetOptions } from "@/lib/api";
import { AssetFormDrawer } from "@/components/onboarding/AssetFormDrawer";
import { AssetDetailDrawer } from "@/components/onboarding/AssetDetailDrawer";
import {
  AssetInventoryFilters,
  ASSIGNABLE_FILTER,
} from "@/components/onboarding/assets/AssetInventoryFilters";
import { AssetInventoryRow } from "@/components/onboarding/assets/AssetInventoryRow";
import { AssetInventoryStats } from "@/components/onboarding/assets/AssetInventoryStats";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function AssetInventoryPage() {
  const router = useRouter();
  const { hasRole, hasPermission } = useAuthStore();
  const canManage = hasPermission("assets.manage") || hasRole("super_admin");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [options, setOptions] = useState<AssetOptions | null>(null);
  const [stats, setStats] = useState<AssetInventoryCounts | null>(null);
  const [statsLoading, setStatsLoading] = useState(canManage);
  const [loading, setLoading] = useState(canManage);
  /** Default: full synced inventory. Use "Ready for new hires" to narrow to AT hire-ready. */
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null);

  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const rowHoverBg = useColorModeValue("gray.50", "gray.800");
  const tipBg = useColorModeValue("brand.50", "whiteAlpha.100");
  const tipBorder = useColorModeValue("brand.100", "whiteAlpha.200");
  const backColor = useColorModeValue("gray.600", "gray.400");
  const backHover = useColorModeValue("gray.900", "gray.50");

  // Reference data for the filters and drawers: statuses, help text, types.
  const loadOptions = useCallback(async () => {
    if (!canManage) return;
    try {
      setOptions(await assetService.getOptions());
    } catch {
      setOptions(null);
    }
  }, [canManage]);

  // Counters cover the full inventory, so they come from their own endpoint
  // rather than the filtered list.
  const loadStats = useCallback(async () => {
    if (!canManage) return;
    try {
      setStats(await assetService.getStats());
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [canManage]);

  const loadAssets = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const res = await assetService.list({
        assignable: statusFilter === ASSIGNABLE_FILTER ? true : undefined,
        status:
          statusFilter && statusFilter !== ASSIGNABLE_FILTER
            ? statusFilter
            : undefined,
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

  const refreshAssets = useCallback(async () => {
    await Promise.all([loadAssets(), loadOptions(), loadStats()]);
    setLastRefreshedAt(new Date());
  }, [loadAssets, loadOptions, loadStats]);

  useEffect(() => {
    if (canManage) {
      void loadOptions();
      void loadStats();
    }
  }, [canManage, loadOptions, loadStats]);

  useEffect(() => {
    const t = setTimeout(async () => {
      await loadAssets();
      setLastRefreshedAt(new Date());
    }, 250);
    return () => clearTimeout(t);
  }, [loadAssets]);

  // Keep the inventory list in sync with the Laravel / Asset Tiger backend.
  useEffect(() => {
    if (!canManage) return;
    const HOUR_MS = 60 * 60 * 1000;
    const id = window.setInterval(() => {
      void refreshAssets();
    }, HOUR_MS);
    return () => window.clearInterval(id);
  }, [canManage, refreshAssets]);

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

  const confirmDelete = async () => {
    const asset = pendingDelete;
    if (!asset) return;
    setDeletingId(asset.id);
    try {
      await assetService.remove(asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      await loadStats();
      toaster.create({ title: "Asset removed", type: "success" });
    } catch (error) {
      toaster.create({
        title: "Failed to remove asset",
        description: error instanceof Error ? error.message : "Try again",
        type: "error",
      });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

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
                Only IT / People Ops admins can manage company assets.
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
          <Text color={textSecondary} mt={1} maxW="640px">
            Synced from Asset Tiger — what we have, who has each one, and which
            are ready for a new hire. This list refreshes automatically every
            hour.
          </Text>
          {lastRefreshedAt && (
            <Text color={textMuted} fontSize="xs" mt={1}>
              Last refreshed{" "}
              {lastRefreshedAt.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          )}
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
          Add asset
        </Box>
      </Flex>

      <Box
        p={4}
        borderRadius="xl"
        border="1px solid"
        borderColor={tipBorder}
        bg={tipBg}
      >
        <HStack align="start" gap={3}>
          <Box color="brand.500" mt={0.5} flexShrink={0}>
            <LuCircleHelp size={18} />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={1}>
              How to read this page
            </Text>
            <Text fontSize="sm" color={textSecondary}>
              Click any asset to see details, assign it to someone, or update
              its status. Inventory is synced from Asset Tiger. Use the status
              filter to focus on{" "}
              <Text as="span" fontWeight="medium" color={textPrimary}>
                Ready for new hires
              </Text>{" "}
              (Asset Tiger &quot;Ready for Reassignment&quot;) during intake.
            </Text>
            <Text fontSize="sm" color={textSecondary} mt={2}>
              Device categories — which ones we track and which ones managers
              can pick from during intake — come from Asset Tiger and are
              configured on the API, not here.
            </Text>
          </Box>
        </HStack>
      </Box>

      <AssetInventoryStats stats={stats} loading={statsLoading} />

      <Card.Root bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <Card.Body>
          <AssetInventoryFilters
            options={options}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            search={search}
            onSearchChange={setSearch}
          />

          {loading ? (
            <VStack gap={3} align="stretch">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height="72px" borderRadius="lg" />
              ))}
            </VStack>
          ) : assets.length === 0 ? (
            <VStack gap={3} py={12} textAlign="center">
              <Box color={textMuted}>
                <LuInbox size={40} />
              </Box>
              <Text color={textPrimary} fontWeight="medium">
                {statusFilter === ASSIGNABLE_FILTER
                  ? "No assets ready for new hires"
                  : "No assets match these filters"}
              </Text>
              <Text color={textSecondary} fontSize="sm" maxW="360px">
                {statusFilter === ASSIGNABLE_FILTER
                  ? "Only assets marked Ready for Reassignment in Asset Tiger appear here. Switch the status filter to see the rest of inventory."
                  : "Try clearing filters, or add a laptop, desktop, or tablet so IT can track who has what."}
              </Text>
              {statusFilter === ASSIGNABLE_FILTER ? (
                <Box
                  as="button"
                  mt={2}
                  onClick={() => setStatusFilter("")}
                  border="1px solid"
                  borderColor={borderColor}
                  color={textPrimary}
                  px={4}
                  py={2}
                  borderRadius="lg"
                  fontWeight="medium"
                  fontSize="sm"
                  display="inline-flex"
                  alignItems="center"
                  gap={2}
                  _hover={{ bg: rowHoverBg }}
                >
                  Show all statuses
                </Box>
              ) : (
                <Box
                  as="button"
                  mt={2}
                  onClick={openCreate}
                  bg="brand.500"
                  color="white"
                  px={4}
                  py={2}
                  borderRadius="lg"
                  fontWeight="medium"
                  fontSize="sm"
                  display="inline-flex"
                  alignItems="center"
                  gap={2}
                  _hover={{ bg: "brand.600" }}
                >
                  <LuPlus size={16} />
                  Add your first asset
                </Box>
              )}
            </VStack>
          ) : (
            <VStack gap={2} align="stretch">
              {assets.map((asset) => (
                <AssetInventoryRow
                  key={asset.id}
                  asset={asset}
                  deleting={deletingId === asset.id}
                  onOpen={openDetail}
                  onDelete={setPendingDelete}
                />
              ))}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>

      <AssetFormDrawer
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refreshAssets}
        item={editing}
        options={options}
      />

      <AssetDetailDrawer
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        assetId={detailId}
        options={options}
        onChanged={refreshAssets}
        onEdit={openEditFromDetail}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove asset from inventory?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” and its assignment history will be deleted.`
            : undefined
        }
        confirmLabel="Remove asset"
        destructive
        confirming={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </VStack>
  );
}
