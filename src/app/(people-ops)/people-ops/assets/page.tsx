"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Text,
  VStack,
  Flex,
  Skeleton,
} from "@chakra-ui/react";
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
import { apiErrorMessage } from "@/lib/api/api-error";
import type { Asset, AssetInventoryCounts, AssetOptions } from "@/lib/api";
import { AssetFormDrawer } from "@/components/onboarding/AssetFormDrawer";
import { AssetDetailDrawer } from "@/components/onboarding/AssetDetailDrawer";
import { AssetCategorySettings } from "@/components/onboarding/assets/AssetCategorySettings";
import { AssetInventoryFilters } from "@/components/onboarding/assets/AssetInventoryFilters";
import { AssetInventoryRow } from "@/components/onboarding/assets/AssetInventoryRow";
import { AssetInventoryStats } from "@/components/onboarding/assets/AssetInventoryStats";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function isAssignableStatusFilter(
  options: AssetOptions | null,
  value: string,
): boolean {
  if (!value) return false;
  const fromApi = options?.status_filters?.find((f) => f.value === value);
  if (fromApi) return !!fromApi.assignable;
  return value === "assignable";
}

function assignableFilterLabel(options: AssetOptions | null): string {
  return (
    options?.status_filters?.find((f) => f.assignable)?.label ??
    "Ready for new hires"
  );
}

export default function AssetInventoryPage() {
  const router = useRouter();
  const { hasRole, hasPermission } = useAuthStore();
  const canManage = hasPermission("assets.manage") || hasRole("super_admin");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [options, setOptions] = useState<AssetOptions | null>(null);
  const [stats, setStats] = useState<AssetInventoryCounts | null>(null);
  const [statsLoading, setStatsLoading] = useState(canManage);
  const [loading, setLoading] = useState(canManage);
  /** Default: full synced inventory. Assignable filter value comes from the API. */
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null);

  const loadOptions = useCallback(async () => {
    if (!canManage) return;
    try {
      setOptions(await assetService.getOptions());
    } catch {
      setOptions(null);
    }
  }, [canManage]);

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
      const assignable = isAssignableStatusFilter(options, statusFilter);
      const res = await assetService.list({
        assignable: assignable ? true : undefined,
        status: statusFilter && !assignable ? statusFilter : undefined,
        type: typeFilter || undefined,
        search: search.trim() || undefined,
        per_page: 25,
        page,
        sort_by: "name",
        sort_dir: "asc",
      });
      setAssets(res.data ?? []);
      setLastPage(res.meta?.last_page ?? 1);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setAssets([]);
      setLastPage(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canManage, options, statusFilter, typeFilter, search, page]);

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
    setPage(1);
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    const t = setTimeout(async () => {
      await loadAssets();
      setLastRefreshedAt(new Date());
    }, 250);
    return () => clearTimeout(t);
  }, [loadAssets]);

  // Refetch when the tab becomes visible again — not on a blind hourly timer.
  useEffect(() => {
    if (!canManage) return;
    const onFocus = () => {
      void refreshAssets();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
        description: apiErrorMessage(error, "Try again"),
        type: "error",
      });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const hireReadyLabel = assignableFilterLabel(options);

  const BackButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.push("/people-ops?tab=onboarding")}
      color="fg.muted"
      fontWeight="medium"
      w="fit-content"
      px={0}
      _hover={{ color: "fg", bg: "transparent" }}
    >
      <LuArrowLeft size={16} />
      Back to People Ops
    </Button>
  );

  if (!canManage) {
    return (
      <VStack gap={6} align="stretch">
        {BackButton}
        <Card.Root bg="bg.card" borderColor="border.primary" borderWidth="1px">
          <Card.Body>
            <VStack gap={3} py={10} textAlign="center">
              <Box color="fg.muted">
                <LuShieldAlert size={40} />
              </Box>
              <Text color="fg" fontWeight="medium">
                You don&apos;t have access to asset inventory
              </Text>
              <Text color="fg.muted" fontSize="sm">
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
          <Heading as="h1" size="xl" color="fg" fontWeight="bold">
            Asset Inventory
          </Heading>
          <Text color="fg.muted" mt={1} maxW="640px">
            Synced from Asset Tiger — what we have, who has each one, and which
            are ready for a new hire. Refreshes after you make a change or when
            you return to this tab.
          </Text>
          {lastRefreshedAt && (
            <Text color="fg.muted" fontSize="xs" mt={1}>
              Last refreshed{" "}
              {lastRefreshedAt.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          )}
        </Box>
        <Button
          onClick={openCreate}
          colorPalette="brand"
          flexShrink={0}
          px={4}
        >
          <LuPlus size={18} />
          Add asset
        </Button>
      </Flex>

      <Box
        p={4}
        borderRadius="xl"
        border="1px solid"
        borderColor="border.brand"
        bg="brand.muted"
      >
        <HStack align="start" gap={3}>
          <Box color="brand.500" mt={0.5} flexShrink={0}>
            <LuCircleHelp size={18} />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="fg" mb={1}>
              How to read this page
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Click any asset to see details, assign it to someone, or update
              its status. Inventory is synced from Asset Tiger. Use the status
              filter to focus on{" "}
              <Text as="span" fontWeight="medium" color="fg">
                {hireReadyLabel}
              </Text>{" "}
              during intake.
            </Text>
            <Text fontSize="sm" color="fg.muted" mt={2}>
              Use Device categories below to choose which Asset Tiger groups we
              track and which ones managers can pick during intake.
            </Text>
          </Box>
        </HStack>
      </Box>

      <AssetCategorySettings />

      <AssetInventoryStats
        stats={stats}
        loading={statsLoading}
        options={options}
      />

      <Card.Root bg="bg.card" borderColor="border.primary" borderWidth="1px">
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
              <Box color="fg.muted">
                <LuInbox size={40} />
              </Box>
              <Text color="fg" fontWeight="medium">
                {isAssignableStatusFilter(options, statusFilter)
                  ? `No assets in “${hireReadyLabel}”`
                  : "No assets match these filters"}
              </Text>
              <Text color="fg.muted" fontSize="sm" maxW="360px">
                {isAssignableStatusFilter(options, statusFilter)
                  ? "Only hire-ready inventory appears here. Switch the status filter to see the rest."
                  : "Try clearing filters, or add a laptop, desktop, or tablet so IT can track who has what."}
              </Text>
              {isAssignableStatusFilter(options, statusFilter) ? (
                <Button
                  mt={2}
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter("")}
                >
                  Show all statuses
                </Button>
              ) : (
                <Button mt={2} colorPalette="brand" size="sm" onClick={openCreate}>
                  <LuPlus size={16} />
                  Add your first asset
                </Button>
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
              {lastPage > 1 && (
                <Flex
                  justify="space-between"
                  align="center"
                  pt={3}
                  gap={3}
                  flexWrap="wrap"
                >
                  <Text fontSize="sm" color="fg.muted">
                    Page {page} of {lastPage}
                    {total > 0 ? ` · ${total} devices` : ""}
                  </Text>
                  <HStack gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => page > 1 && setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= lastPage}
                      onClick={() =>
                        page < lastPage && setPage((p) => p + 1)
                      }
                    >
                      Next
                    </Button>
                  </HStack>
                </Flex>
              )}
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
