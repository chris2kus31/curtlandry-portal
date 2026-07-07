"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Drawer,
  Portal,
  VStack,
  HStack,
  Text,
  Textarea,
  Flex,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
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

  const drawerBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const hoverBg = useColorModeValue("gray.100", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.800");

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
    if (!asset || !statusTarget) return;
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
        description: error instanceof Error ? error.message : undefined,
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!asset || !assignUser) return;
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
        description: error instanceof Error ? error.message : undefined,
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
        description: error instanceof Error ? error.message : undefined,
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const selectStyle: React.CSSProperties = {
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
  };

  const SelectShell = ({ children }: { children: React.ReactNode }) => (
    <Box
      bg={inputBg}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      _focusWithin={{ borderColor: "brand.500" }}
    >
      {children}
    </Box>
  );

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
          <Drawer.Content bg={drawerBg} maxW="480px" w="full">
            <Box
              p={4}
              borderBottom="1px solid"
              borderColor={borderColor}
              bg={headerBg}
            >
              <Flex justify="space-between" align="center">
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="brand.500" color="white">
                    <LuLaptop size={18} />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color={textPrimary}>
                      {asset?.name ?? "Asset"}
                    </Text>
                    <Text fontSize="sm" color={textSecondary}>
                      {asset?.type_label ?? "Device details"}
                    </Text>
                  </Box>
                </HStack>
                <HStack gap={1}>
                  {asset && (
                    <Box
                      as="button"
                      p={2}
                      borderRadius="lg"
                      color={textSecondary}
                      _hover={{ bg: hoverBg }}
                      onClick={() => onEdit(asset)}
                      title="Edit asset"
                    >
                      <LuPencil size={18} />
                    </Box>
                  )}
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
                      <HStack gap={1.5} color={textSecondary} fontSize="sm">
                        <LuUser size={14} />
                        <Text>{asset.assigned_user.name}</Text>
                      </HStack>
                    ) : (
                      <Text fontSize="sm" color={textSecondary}>
                        Unassigned
                      </Text>
                    )}
                  </HStack>

                  {/* Info card */}
                  <Box bg={cardBg} borderRadius="lg" p={4}>
                    <VStack gap={2} align="stretch" fontSize="sm">
                      <HStack justify="space-between">
                        <Text color={textSecondary}>Asset Tag</Text>
                        <Text color={textPrimary}>{asset.asset_tag || "—"}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color={textSecondary}>Serial #</Text>
                        <Text color={textPrimary}>
                          {asset.serial_number || "—"}
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color={textSecondary}>Purchase Date</Text>
                        <Text color={textPrimary}>
                          {fmtDate(asset.purchase_date)}
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color={textSecondary}>Cost</Text>
                        <Text color={textPrimary}>
                          {asset.cost != null
                            ? `$${asset.cost.toLocaleString()}`
                            : "—"}
                        </Text>
                      </HStack>
                      {asset.notes && (
                        <Box pt={1}>
                          <Text color={textSecondary} mb={1}>
                            Notes
                          </Text>
                          <Text color={textPrimary}>{asset.notes}</Text>
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
                        color={textPrimary}
                        mb={2}
                      >
                        Assign to employee
                      </Text>
                      <VStack gap={2} align="stretch">
                        <SelectShell>
                          <select
                            value={assignUser}
                            onChange={(e) => setAssignUser(e.target.value)}
                            style={selectStyle}
                          >
                            <option value="">Select employee…</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                                {emp.department ? ` · ${emp.department}` : ""}
                              </option>
                            ))}
                          </select>
                        </SelectShell>
                        <Textarea
                          value={assignNote}
                          onChange={(e) => setAssignNote(e.target.value)}
                          placeholder="Note (optional)"
                          bg={inputBg}
                          border="1px solid"
                          borderColor={borderColor}
                          borderRadius="lg"
                          px={4}
                          py={2}
                          rows={2}
                          fontSize="sm"
                        />
                        <ActionButton
                          label="Assign"
                          disabled={!assignUser || busy}
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
                        color={textPrimary}
                        mb={2}
                      >
                        Release device
                      </Text>
                      <VStack gap={2} align="stretch">
                        <SelectShell>
                          <select
                            value={releaseTarget}
                            onChange={(e) => setReleaseTarget(e.target.value)}
                            style={selectStyle}
                          >
                            <option value="needs_backup">
                              → Needs Backup
                            </option>
                            <option value="available">→ Available</option>
                          </select>
                        </SelectShell>
                        <Textarea
                          value={releaseNote}
                          onChange={(e) => setReleaseNote(e.target.value)}
                          placeholder="Note (optional)"
                          bg={inputBg}
                          border="1px solid"
                          borderColor={borderColor}
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
                        color={textPrimary}
                        mb={2}
                      >
                        Change status
                      </Text>
                      <VStack gap={2} align="stretch">
                        <SelectShell>
                          <select
                            value={statusTarget}
                            onChange={(e) => setStatusTarget(e.target.value)}
                            style={selectStyle}
                          >
                            <option value="">Select new status…</option>
                            {transitions.map((t) => (
                              <option key={t} value={t}>
                                {statusLabels[t] ?? t}
                              </option>
                            ))}
                          </select>
                        </SelectShell>
                        <Textarea
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder="Note (optional)"
                          bg={inputBg}
                          border="1px solid"
                          borderColor={borderColor}
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
                    <HStack gap={2} mb={2} color={textPrimary}>
                      <LuHistory size={16} />
                      <Text fontSize="sm" fontWeight="semibold">
                        Assignment history
                      </Text>
                    </HStack>
                    {sortedHistory.length === 0 ? (
                      <Text fontSize="sm" color={textSecondary}>
                        No assignment history yet.
                      </Text>
                    ) : (
                      <VStack gap={2} align="stretch">
                        {sortedHistory.map((h) => (
                          <Box
                            key={h.id}
                            bg={cardBg}
                            borderRadius="lg"
                            p={3}
                            fontSize="sm"
                          >
                            <HStack justify="space-between" mb={1}>
                              <Text fontWeight="medium" color={textPrimary}>
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
                              color={textSecondary}
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
                              <Text color={textSecondary} mt={1}>
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
    <Box
      as="button"
      py={2}
      px={4}
      borderRadius="lg"
      fontWeight="medium"
      fontSize="sm"
      bg="brand.500"
      color="white"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      opacity={disabled ? 0.6 : 1}
      cursor={disabled ? "not-allowed" : "pointer"}
      _hover={{ bg: disabled ? "brand.500" : "brand.600" }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={2}
    >
      {busy ? <Spinner size="sm" /> : label}
    </Box>
  );
}
