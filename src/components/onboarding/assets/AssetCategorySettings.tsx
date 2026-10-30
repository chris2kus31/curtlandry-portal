"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Card,
  HStack,
  Skeleton,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { assetService } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api/api-error";
import type { AssetCategory } from "@/lib/api";

/**
 * People Ops controls for Asset Tiger categories: which ones we sync into
 * inventory (`is_tracked`) and which ones managers can pick during intake
 * (`show_in_intake`). New categories from AT default off until toggled here.
 */
export function AssetCategorySettings() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setCategories(await assetService.listCategories());
    } catch {
      setCategories([]);
      toaster.create({
        title: "Could not load device categories",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (
    category: AssetCategory,
    next: Partial<Pick<AssetCategory, "is_tracked" | "show_in_intake">>,
  ) => {
    setSavingId(category.id);
    try {
      const updated = await assetService.updateCategory(category.id, next);
      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
    } catch (error) {
      toaster.create({
        title: "Could not update category",
        description: apiErrorMessage(error),
        type: "error",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card.Root bg="bg.card" borderColor="border.primary" borderWidth="1px">
      <Card.Body>
        <VStack align="stretch" gap={3}>
          <Box>
            <Text fontSize="md" fontWeight="semibold" color="fg">
              Device categories
            </Text>
            <Text fontSize="sm" color="fg.muted" mt={1}>
              Categories sync from Asset Tiger with tracking and intake off.
              Turn on tracking to import devices; turn on intake to show them
              in the new-hire picker.
            </Text>
          </Box>

          {loading ? (
            <VStack gap={2} align="stretch">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height="52px" borderRadius="lg" />
              ))}
            </VStack>
          ) : categories.length === 0 ? (
            <Text fontSize="sm" color="fg.muted">
              No categories yet. They appear after the next Asset Tiger sync.
            </Text>
          ) : (
            <VStack gap={2} align="stretch">
              {categories.map((category) => {
                const busy = savingId === category.id;
                return (
                  <HStack
                    key={category.id}
                    justify="space-between"
                    align="center"
                    gap={4}
                    p={3}
                    bg="bg.secondary"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="border.primary"
                  >
                    <Box minW={0} flex={1}>
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color="fg"
                        lineClamp={1}
                      >
                        {category.name}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {category.assets_count != null
                          ? `${category.assets_count} device${category.assets_count === 1 ? "" : "s"}`
                          : "Synced from Asset Tiger"}
                      </Text>
                    </Box>
                    <HStack gap={5} flexShrink={0}>
                      <HStack gap={2}>
                        <Text fontSize="xs" color="fg.muted">
                          Track
                        </Text>
                        <Switch.Root
                          checked={category.is_tracked}
                          disabled={busy}
                          onCheckedChange={(e) =>
                            void patch(category, { is_tracked: !!e.checked })
                          }
                          size="sm"
                          colorPalette="brand"
                        >
                          <Switch.HiddenInput />
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Root>
                      </HStack>
                      <HStack gap={2}>
                        <Text fontSize="xs" color="fg.muted">
                          Intake
                        </Text>
                        <Switch.Root
                          checked={category.show_in_intake}
                          disabled={busy}
                          onCheckedChange={(e) =>
                            void patch(category, {
                              show_in_intake: !!e.checked,
                            })
                          }
                          size="sm"
                          colorPalette="brand"
                        >
                          <Switch.HiddenInput />
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Root>
                      </HStack>
                    </HStack>
                  </HStack>
                );
              })}
            </VStack>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
