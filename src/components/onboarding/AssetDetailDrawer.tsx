"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  Portal,
  VStack,
  HStack,
  Text,
  Textarea,
  Flex,
  Spinner,
  Badge,
  NativeSelect,
  IconButton,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import {
  LuX,
  LuLaptop,
  LuUser,
  LuHistory,
  LuArrowRight,
  LuPencil,
} from "react-icons/lu";
import { assetService, offboardingService } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api/api-error";
import type {
  Asset,
  AssetOptions,
  OffboardingEmployeeOption,
} from "@/lib/api";

interface AssetDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number | null;
  options: AssetOptions | null;
  onChanged: () => void;
  onEdit: (asset: Asset) => void;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AssetDetailDrawer({
  isOpen,
  onClose,
  assetId,
  options,
  onChanged,
  onEdit,
}: AssetDetailDrawerProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [statusTarget, setStatusTarget] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [employees, setEmployees] = useState<OffboardingEmployeeOption[]>([]);
  const [assignUser, setAssignUser] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [releaseTarget, setReleaseTarget] = useState("needs_backup");
  const [releaseNote, setReleaseNote] = useState("");


  const load = useCallback(async () => {
    if (!assetId) return;
    setIsLoading(true);
    try {
      const data = await assetService.get(assetId);
      setAsset(data);
    } catch {
      toaster.create({ title: "Failed to load asset", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (isOpen && assetId) {
      setStatusTarget("");
      setStatusNote("");
      setAssignUser("");
      setAssignNote("");
      setReleaseTarget("needs_backup");
      setReleaseNote("");
      void load();
    } else if (!isOpen) {
      setAsset(null);
    }
  }, [isOpen, assetId, load]);

  useEffect(() => {
    if (isOpen && employees.length === 0) {
      offboardingService
        .getOptions()
        .then((opts) => setEmployees(opts.employees))
        .catch(() => {
          /* assign picker simply stays empty */
        });
    }
  }, [isOpen, employees.length]);

  const refresh = async () => {
    await load();
    onChanged();
  };

  const handleStatusChange = async () => {
    if (!asset) return;
    if (!statusTarget) {
      toaster.create({
        title: "Select a status first",
        description: "Choose the new status before updating.",
        type: "warning",
      });
      return;
    }
    setBusy(true);
    try {
      await assetService.changeStatus(asset.id, statusTarget, statusNote || undefined);
      toaster.create({ title: "Status updated", type: "success" });
      setStatusTarget("");
      setStatusNote("");
      await refresh();
    } catch (error) {
      toaster.create({
        title: "Could not change status",
        description: apiErrorMessage(error),
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!asset) return;
    if (!assignUser) {
      toaster.create({
        title: "Select an employee first",
        description: "You must choose who this asset is going to before assigning.",
        type: "warning",
      });
      return;
    }
    setBusy(true);
    try {
      await assetService.assign(asset.id, Number(assignUser), assignNote || undefined);
      toaster.create({ title: "Asset assigned", type: "success" });
      setAssignUser("");
      setAssignNote("");
      await refresh();
    } catch (error) {
      toaster.create({
        title: "Could not assign",
        description: apiErrorMessage(error),
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async () => {
    if (!asset) return;
    setBusy(true);
    try {
      await assetService.release(asset.id, releaseTarget, releaseNote || undefined);
      toaster.create({ title: "Asset released", type: "success" });
      setReleaseNote("");
      await refresh();
    } catch (error) {
      toaster.create({
        title: "Could not release",
        description: apiErrorMessage(error),
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const transitions = asset?.status
    ? options?.transitions?.[asset.status] ?? []
    : [];
  const statusLabels = options?.statuses ?? {};
  const sortedHistory = (asset?.assignments ?? [])
    .slice()
    .sort((a, b) =>
      (b.assigned_at ?? "").localeCompare(a.assigned_at ?? ""),
    );

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      placement="end"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg="bg.card" maxW="480px" w="full">
            <Box
              p={4}
              borderBottom="1px solid"
              borderColor="border.primary"
              bg="bg.secondary"
            >
              <Flex justify="space-between" align="center">
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="brand.500" color="white">
                    <LuLaptop size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color="fg">
                      {asset?.name ?? "Asset"}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      {asset?.type_label ?? "Device details"}
                    </Text>
                  </Box>
                </HStack>
                <HStack gap={1}>
                  {asset && (
                    <IconButton
                      aria-label="Edit asset"
                      variant="ghost"
                      size="sm"
                      color="fg.muted"
                      onClick={() => onEdit(asset)}
                    >
                      <LuPencil size={18} />
                    </IconButton>
                  )}
                  <IconButton
                    aria-label="Close"
                    variant="ghost"
                    size="sm"
                    color="fg.muted"
                    onClick={onClose}
                  >
                    <LuX size={20} />
                  </IconButton>
                </HStack>
              </Flex>
            </Box>

            <Box p={5} overflowY="auto" flex={1}>
              {isLoading || !asset ? (
                <Flex justify="center" py={10}>
                  <Spinner color="brand.500" />
                </Flex>
              ) : (
                <VStack gap={5} align="stretch">
                  {/* Status + assignee */}
                  <HStack justify="space-between">
                    <Badge
                      colorPalette={asset.status_color ?? "gray"}
                      px={2.5}
                      py={1}
                      borderRadius="full"
                    >
                      {asset.status_label}
                    </Badge>
                    {asset.assigned_user ? (
                      <HStack gap={1.5} color="fg.muted" fontSize="sm">
                        <LuUser size={14} />
                        <Text>{asset.assigned_user.name}</Text>
                      </HStack>
                    ) : asset.holder_label ? (
                      <Text fontSize="sm" color="fg.muted">
                        {asset.holder_label}
                      </Text>
                    ) : (
                      <Text fontSize="sm" color="fg.muted">
                        Unassigned
                      </Text>
                    )}
                  </HStack>

                  {/* Info card */}
                  <Box bg="bg.secondary" borderRadius="lg" p={4}>
                    <VStack gap={2} align="stretch" fontSize="sm">
                      <HStack justify="space-between">
                        <Text color="fg.muted">Asset tag</Text>
                        <Text color="fg">{asset.asset_tag || "—"}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="fg.muted">Serial #</Text>
                        <Text color="fg">
                          {asset.serial_number || "—"}
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="fg.muted">Purchase Date</Text>
                        <Text color="fg">
                          {fmtDate(asset.purchase_date)}
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="fg.muted">Cost</Text>
                        <Text color="fg">
                          {asset.cost != null
                            ? `$${asset.cost.toLocaleString()}`
                            : "—"}
                        </Text>
                      </HStack>
                      {asset.notes && (
                        <Box pt={1}>
                          <Text color="fg.muted" mb={1}>
                            Notes
                          </Text>
                          <Text color="fg">{asset.notes}</Text>
                        </Box>
                      )}
                    </VStack>
                  </Box>

                  {/* Assign (only when assignable) */}
                  {asset.is_assignable && (
                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color="fg"
                        mb={2}
                      >
                        Assign to employee
                      </Text>
                      <VStack gap={2} align="stretch">
                        <NativeSelect.Root
                          size="md"
                          bg="bg.secondary"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="border.primary"
                          _focusWithin={{ borderColor: "brand.500" }}
                        >
                          <NativeSelect.Field
                            value={assignUser}
                            onChange={(e) => setAssignUser(e.target.value)}
                            ps={4}
                            pe={8}
                            py={2.5}
                            fontSize="sm"
                            border="none"
                            bg="transparent"
                          >
                            <option value="">Select employee…</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                                {emp.department ? ` · ${emp.department}` : ""}
                              </option>
                            ))}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                        {!assignUser && (
                          <Text fontSize="xs" color="fg.muted">
                            Choose an employee before you can assign this asset.
                          </Text>
                        )}
                        <Textarea
                          value={assignNote}
                          onChange={(e) => setAssignNote(e.target.value)}
                          placeholder="Note (optional)"
                          bg="bg.secondary"
                          border="1px solid"
                          borderColor="border.primary"
                          borderRadius="lg"
                          px={4}
                          py={2}
                          rows={2}
                          fontSize="sm"
                        />
                        <ActionButton
                          label="Assign"
                          disabled={!assignUser || busy || employees.length === 0}
                          busy={busy}
                          onClick={handleAssign}
                        />
                      </VStack>
                    </Box>
                  )}

                  {/* Release (only when assigned) */}
                  {asset.status === "assigned" && (
                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color="fg"
                        mb={2}
                      >
                        Release device
                      </Text>
                      <VStack gap={2} align="stretch">
                        <NativeSelect.Root
                          size="md"
                          bg="bg.secondary"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="border.primary"
                          _focusWithin={{ borderColor: "brand.500" }}
                        >
                          <NativeSelect.Field
                            value={releaseTarget}
                            onChange={(e) => setReleaseTarget(e.target.value)}
                            ps={4}
                            pe={8}
                            py={2.5}
                            fontSize="sm"
                            border="none"
                            bg="transparent"
                          >
                            <option value="needs_backup">
                              → Needs Backup
                            </option>
                            <option value="available">→ Available</option>
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                        <Textarea
                          value={releaseNote}
                          onChange={(e) => setReleaseNote(e.target.value)}
                          placeholder="Note (optional)"
                          bg="bg.secondary"
                          border="1px solid"
                          borderColor="border.primary"
                          borderRadius="lg"
                          px={4}
                          py={2}
                          rows={2}
                          fontSize="sm"
                        />
                        <ActionButton
                          label="Release"
                          disabled={busy}
                          busy={busy}
                          onClick={handleRelease}
                        />
                      </VStack>
                    </Box>
                  )}

                  {/* Status transition */}
                  {transitions.length > 0 && (
                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color="fg"
                        mb={2}
                      >
                        Change status
                      </Text>
                      <VStack gap={2} align="stretch">
                        <NativeSelect.Root
                          size="md"
                          bg="bg.secondary"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="border.primary"
                          _focusWithin={{ borderColor: "brand.500" }}
                        >
                          <NativeSelect.Field
                            value={statusTarget}
                            onChange={(e) => setStatusTarget(e.target.value)}
                            ps={4}
                            pe={8}
                            py={2.5}
                            fontSize="sm"
                            border="none"
                            bg="transparent"
                          >
                            <option value="">Select new status…</option>
                            {transitions.map((t) => (
                              <option key={t} value={t}>
                                {statusLabels[t] ?? t}
                              </option>
                            ))}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                        {!statusTarget && (
                          <Text fontSize="xs" color="fg.muted">
                            Choose a status before updating. To give an asset to
                            someone, use Assign to employee instead.
                          </Text>
                        )}
                        <Textarea
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder="Note (optional)"
                          bg="bg.secondary"
                          border="1px solid"
                          borderColor="border.primary"
                          borderRadius="lg"
                          px={4}
                          py={2}
                          rows={2}
                          fontSize="sm"
                        />
                        <ActionButton
                          label="Update status"
                          disabled={!statusTarget || busy}
                          busy={busy}
                          onClick={handleStatusChange}
                        />
                      </VStack>
                    </Box>
                  )}

                  {/* History */}
                  <Box>
                    <HStack gap={2} mb={2} color="fg">
                      <LuHistory size={16} />
                      <Text fontSize="sm" fontWeight="semibold">
                        Assignment history
                      </Text>
                    </HStack>
                    {sortedHistory.length === 0 ? (
                      <Text fontSize="sm" color="fg.muted">
                        No assignment history yet.
                      </Text>
                    ) : (
                      <VStack gap={2} align="stretch">
                        {sortedHistory.map((h) => (
                          <Box
                            key={h.id}
                            bg="bg.secondary"
                            borderRadius="lg"
                            p={3}
                            fontSize="sm"
                          >
                            <HStack justify="space-between" mb={1}>
                              <Text fontWeight="medium" color="fg">
                                {h.user_name ?? `User #${h.user_id}`}
                              </Text>
                              {!h.released_at && (
                                <Badge
                                  colorPalette="blue"
                                  size="sm"
                                  borderRadius="full"
                                >
                                  Current
                                </Badge>
                              )}
                            </HStack>
                            <HStack
                              gap={2}
                              color="fg.muted"
                              fontSize="xs"
                            >
                              <Text>{fmtDate(h.assigned_at)}</Text>
                              <LuArrowRight size={12} />
                              <Text>
                                {h.released_at
                                  ? fmtDate(h.released_at)
                                  : "present"}
                              </Text>
                            </HStack>
                            {h.note && (
                              <Text color="fg.muted" mt={1}>
                                {h.note}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </VStack>
                    )}
                  </Box>
                </VStack>
              )}
            </Box>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}

function ActionButton({
  label,
  disabled,
  busy,
  onClick,
}: {
  label: string;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      colorPalette="brand"
      onClick={onClick}
      disabled={disabled}
      loading={busy}
    >
      {label}
    </Button>
  );
}
