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
  Badge,
  SimpleGrid,
  Image,
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
  LuCircleCheck,
  LuCircleHelp,
  LuPackage,
  LuWrench,
} from "react-icons/lu";
import { useAuthStore } from "@/store/auth-store";
import { assetService } from "@/lib/api";
import type { Asset, AssetOptions } from "@/lib/api";
import { AssetFormDrawer } from "@/components/onboarding/AssetFormDrawer";
import { AssetDetailDrawer } from "@/components/onboarding/AssetDetailDrawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const STATUS_HELP: Record<string, string> = {
  assignable: "Marked ready in Asset Tiger / hire-ready pool",
  available: "In stock, but not marked ready for a new hire",
  ready_for_reassignment: "Wipe complete — ready to give to a new hire",
  assigned: "Currently with a staff member",
  in_repair: "Being fixed — not ready to assign",
  repair: "Being fixed — not ready to assign",
  retired: "Taken out of service",
  needs_backup: "Returned — needs data backup before reuse",
  needs_wipe: "Returned — needs wipe before reuse",
};

function plainStatusHelp(status: string | null, label: string | null): string {
  if (!status) return label ?? "";
  return STATUS_HELP[status] ?? label ?? "";
}

export default function AssetInventoryPage() {
  const router = useRouter();
  const { hasRole, hasPermission } = useAuthStore();
  const canManage = hasPermission("assets.manage") || hasRole("super_admin");

  const [assets, setAssets] = useState<Asset[]>([]);
  /** Unfiltered inventory for headline stats (not affected by list filters). */
  const [inventory, setInventory] = useState<Asset[]>([]);
  const [options, setOptions] = useState<AssetOptions | null>(null);
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
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const tipBg = useColorModeValue("brand.50", "whiteAlpha.100");
  const tipBorder = useColorModeValue("brand.100", "whiteAlpha.200");
  const imageBg = useColorModeValue("gray.100", "gray.800");
  const backColor = useColorModeValue("gray.600", "gray.400");
  const backHover = useColorModeValue("gray.900", "gray.50");
  const statBg = useColorModeValue("gray.50", "gray.800");

  const loadOptions = useCallback(async () => {
    try {
      setOptions(await assetService.getOptions());
    } catch {
      setOptions(null);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    if (!canManage) return;
    try {
      const res = await assetService.list({
        per_page: 100,
        sort_by: "name",
        sort_dir: "asc",
      });
      setInventory(res.data ?? []);
    } catch {
      setInventory([]);
    }
  }, [canManage]);

  const loadAssets = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const res = await assetService.list({
        assignable: statusFilter === "assignable" ? true : undefined,
        status:
          statusFilter && statusFilter !== "assignable"
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
    await Promise.all([loadAssets(), loadInventory()]);
    setLastRefreshedAt(new Date());
  }, [loadAssets, loadInventory]);

  useEffect(() => {
    if (canManage) {
      loadOptions();
      loadInventory();
    }
  }, [canManage, loadOptions, loadInventory]);

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

  const summary = useMemo(() => {
    const ready = inventory.filter((a) => a.is_assignable).length;
    const withSomeone = inventory.filter(
      (a) =>
        a.status === "assigned" ||
        !!a.assigned_user_id ||
        !!a.at_assigned_person_name,
    ).length;
    return {
      total: inventory.length,
      ready,
      withSomeone,
    };
  }, [inventory]);

  const holderLabel = (asset: Asset): string => {
    if (asset.assigned_user?.name) {
      return `With ${asset.assigned_user.name}`;
    }
    if (asset.at_assigned_person_name) {
      return `With ${asset.at_assigned_person_name}`;
    }
    if (asset.status === "assigned") {
      return "Checked out in Asset Tiger";
    }
    return plainStatusHelp(asset.status, asset.status_label);
  };

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
      setInventory((prev) => prev.filter((a) => a.id !== asset.id));
      toaster.create({ title: "Device removed", type: "success" });
    } catch (error) {
      toaster.create({
        title: "Failed to remove device",
        description: error instanceof Error ? error.message : "Try again",
        type: "error",
      });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
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
                You don&apos;t have access to device inventory
              </Text>
              <Text color={textSecondary} fontSize="sm">
                Only IT / People Ops admins can manage company devices.
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
            Device Inventory
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
          Add device
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
              Click any device to see details, assign it to someone, or update
              its status. Inventory is synced from Asset Tiger. Use the status
              filter to focus on{" "}
              <Text as="span" fontWeight="medium" color={textPrimary}>
                Ready for new hires
              </Text>{" "}
              (Asset Tiger &quot;Ready for Reassignment&quot;) during intake.
            </Text>
          </Box>
        </HStack>
      </Box>

      {!loading && (
        <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
          <HStack
            p={4}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            bg={statBg}
            gap={3}
          >
            <Box color={textMuted}>
              <LuPackage size={20} />
            </Box>
            <Box>
              <Text fontSize="xs" color={textSecondary}>
                Total devices
              </Text>
              <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
                {summary.total}
              </Text>
            </Box>
          </HStack>
          <HStack
            p={4}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            bg={statBg}
            gap={3}
          >
            <Box color="green.500">
              <LuCircleCheck size={20} />
            </Box>
            <Box>
              <Text fontSize="xs" color={textSecondary}>
                Ready for new hires
              </Text>
              <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
                {summary.ready}
              </Text>
            </Box>
          </HStack>
          <HStack
            p={4}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            bg={statBg}
            gap={3}
          >
            <Box color="blue.500">
              <LuUser size={20} />
            </Box>
            <Box>
              <Text fontSize="xs" color={textSecondary}>
                Currently with staff
              </Text>
              <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
                {summary.withSomeone}
              </Text>
            </Box>
          </HStack>
        </SimpleGrid>
      )}

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
                entries={[
                  [
                    "assignable",
                    "Ready for new hires — can be offered during intake",
                  ],
                  ...Object.entries(options?.statuses ?? {}).map(
                    ([value, label]) =>
                      [
                        value,
                        STATUS_HELP[value]
                          ? `${label} — ${STATUS_HELP[value]}`
                          : label,
                      ] as [string, string],
                  ),
                ]}
              />
              <FilterSelect
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="All device types"
                entries={Object.entries(options?.types ?? {})}
              />
            </HStack>

            <Box
              position="relative"
              maxW={{ base: "full", md: "300px" }}
              w="full"
            >
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
                placeholder="Search by name, tag, or serial…"
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
                <Skeleton key={i} height="72px" borderRadius="lg" />
              ))}
            </VStack>
          ) : assets.length === 0 ? (
            <VStack gap={3} py={12} textAlign="center">
              <Box color={textMuted}>
                <LuInbox size={40} />
              </Box>
              <Text color={textPrimary} fontWeight="medium">
                {statusFilter === "assignable"
                  ? "No devices ready for new hires"
                  : "No devices match these filters"}
              </Text>
              <Text color={textSecondary} fontSize="sm" maxW="360px">
                {statusFilter === "assignable"
                  ? "Only devices marked Ready for Reassignment in Asset Tiger appear here. Switch the status filter to see the rest of inventory."
                  : "Try clearing filters, or add a laptop, desktop, or tablet so IT can track who has what."}
              </Text>
              {statusFilter === "assignable" ? (
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
                  Add your first device
                </Box>
              )}
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
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={borderColor}
                  cursor="pointer"
                  onClick={() => openDetail(asset)}
                  _hover={{ bg: rowHoverBg }}
                  transition="all 0.15s"
                >
                  <Box
                    w="52px"
                    h="52px"
                    borderRadius="lg"
                    overflow="hidden"
                    bg={imageBg}
                    border="1px solid"
                    borderColor={borderColor}
                    flexShrink={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {asset.image_url ? (
                      <Image
                        src={asset.image_url}
                        alt=""
                        w="100%"
                        h="100%"
                        fit="cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : asset.status === "repair" ? (
                      <Box color={textMuted}>
                        <LuWrench size={18} />
                      </Box>
                    ) : (
                      <Box color={textMuted}>
                        <LuLaptop size={18} />
                      </Box>
                    )}
                  </Box>

                  <Box flex={1} minW={0}>
                    <HStack gap={2} flexWrap="wrap">
                      <Text fontWeight="semibold" color={textPrimary} truncate>
                        {asset.name}
                      </Text>
                      <Text fontSize="sm" color={textSecondary}>
                        {asset.type_label}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color={textMuted} mt={0.5} truncate>
                      {[
                        asset.asset_tag ? `Tag ${asset.asset_tag}` : null,
                        asset.serial_number
                          ? `Serial ${asset.serial_number}`
                          : null,
                        asset.cost != null
                          ? `$${Number(asset.cost).toLocaleString()}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No tag or serial yet"}
                    </Text>
                    <Text fontSize="xs" color={textSecondary} mt={1}>
                      {holderLabel(asset)}
                    </Text>
                  </Box>

                  <VStack align="end" gap={1} flexShrink={0}>
                    <Badge
                      colorPalette={asset.status_color ?? "gray"}
                      px={2.5}
                      py={1}
                      borderRadius="full"
                    >
                      {asset.status_label}
                    </Badge>
                    {asset.is_assignable && (
                      <Text fontSize="xs" color="green.500" fontWeight="medium">
                        Ready to assign
                      </Text>
                    )}
                  </VStack>

                  <Box
                    as="button"
                    p={2}
                    borderRadius="md"
                    color={deletingId === asset.id ? textMuted : "red.400"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (deletingId !== asset.id) setPendingDelete(asset);
                    }}
                    aria-disabled={deletingId === asset.id}
                    cursor={
                      deletingId === asset.id ? "not-allowed" : "pointer"
                    }
                    _hover={{ bg: "red.500/10" }}
                    transition="all 0.15s"
                    title="Remove from inventory"
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
        title="Remove device from inventory?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” and its assignment history will be deleted.`
            : undefined
        }
        confirmLabel="Remove device"
        destructive
        confirming={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </VStack>
  );
}
