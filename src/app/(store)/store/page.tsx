"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  Badge,
  Skeleton,
  Flex,
  Input,
  Heading,
  EmptyState,
  Tabs,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuSearch,
  LuTag,
  LuHistory,
  LuPackage,
  LuChevronRight,
  LuUndo2,
  LuShieldAlert,
} from "react-icons/lu";
import { wooService } from "@/lib/api";
import type { WooCategory, SaleBatch } from "@/lib/api/woo-service";
import { ProductSaleDrawer } from "@/components/admin/ProductSaleDrawer";
import { useAuthStore } from "@/store/auth-store";

export default function StorePage() {
  // Auth state
  const { roles } = useAuthStore();
  const isSuperAdmin = useMemo(
    () => roles?.includes("super_admin") ?? false,
    [roles],
  );

  // State
  const [categories, setCategories] = useState<WooCategory[]>([]);
  const [batches, setBatches] = useState<SaleBatch[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rollingBackBatchId, setRollingBackBatchId] = useState<string | null>(
    null,
  );

  // Drawer state
  const [selectedCategory, setSelectedCategory] = useState<WooCategory | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Colors - Brand palette (teal/green)
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const textTertiary = useColorModeValue("gray.400", "gray.500");
  const hoverBg = useColorModeValue("gray.50", "gray.800");
  const inputBg = useColorModeValue("gray.100", "gray.800");

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (categoriesLoaded) return;
    setIsLoadingCategories(true);
    try {
      const data = await wooService.getCategories();
      setCategories(data);
      setCategoriesLoaded(true);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      toaster.create({
        title: "Error",
        description: "Failed to load categories",
        type: "error",
      });
    } finally {
      setIsLoadingCategories(false);
    }
  }, [categoriesLoaded]);

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    if (batchesLoaded) return;
    setIsLoadingBatches(true);
    try {
      const data = await wooService.getBatches(20);
      setBatches(data);
      setBatchesLoaded(true);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
      setBatches([]);
      setBatchesLoaded(true);
    } finally {
      setIsLoadingBatches(false);
    }
  }, [batchesLoaded]);

  // Handle tab change
  const handleTabChange = (details: { value: string }) => {
    if (details.value === "categories" && !categoriesLoaded) {
      fetchCategories();
    } else if (details.value === "history" && !batchesLoaded) {
      fetchBatches();
    }
  };

  // Handle category selection
  const handleSelectCategory = (category: WooCategory) => {
    setSelectedCategory(category);
    setIsDrawerOpen(true);
  };

  // Handle rollback
  const handleRollback = async (batchId: string) => {
    if (!confirm("Restore original prices for this batch?")) return;

    setRollingBackBatchId(batchId);
    try {
      const result = await wooService.rollbackBatch(batchId);
      toaster.create({
        title: "Restored",
        description: `${result.rolled_back} products restored to original prices`,
        type: "success",
      });
      setBatchesLoaded(false);
      fetchBatches();
    } catch (err) {
      toaster.create({
        title: "Error",
        description: err instanceof Error ? err.message : "Rollback failed",
        type: "error",
      });
    } finally {
      setRollingBackBatchId(null);
    }
  };

  // Filter categories
  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Box maxW="1400px" mx="auto">
      {/* Header */}
      <Box mb={6}>
        <HStack gap={3} mb={1}>
          <Box p={2.5} borderRadius="xl" bg="brand.500">
            <LuTag size={22} color="white" />
          </Box>
          <Box>
            <Heading size="xl" fontWeight="semibold" color={textPrimary}>
              Woo Discounts
            </Heading>
            <Text color={textSecondary} fontSize="sm">
              Manage WooCommerce product sales and promotions
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* Main Content with Tabs */}
      <Card.Root
        bg={cardBg}
        borderRadius="2xl"
        border="1px solid"
        borderColor={borderColor}
        shadow="sm"
        overflow="hidden"
      >
        <Tabs.Root
          defaultValue="categories"
          onValueChange={handleTabChange}
          variant="line"
        >
          <Tabs.List
            px={4}
            pt={2}
            borderBottom="1px solid"
            borderColor={borderColor}
            bg={cardBg}
          >
            <Tabs.Trigger
              value="categories"
              px={4}
              py={3}
              fontWeight="medium"
              fontSize="sm"
              color={textSecondary}
              _selected={{
                color: "brand.500",
                borderBottomColor: "brand.500",
                fontWeight: "600",
              }}
            >
              <HStack gap={2}>
                <LuTag size={16} />
                <Text>Apply Sale</Text>
              </HStack>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="history"
              px={4}
              py={3}
              fontWeight="medium"
              fontSize="sm"
              color={textSecondary}
              _selected={{
                color: "brand.500",
                borderBottomColor: "brand.500",
                fontWeight: "600",
              }}
            >
              <HStack gap={2}>
                <LuHistory size={16} />
                <Text>Sale History</Text>
              </HStack>
            </Tabs.Trigger>
          </Tabs.List>

          {/* Apply Sale Tab */}
          <Tabs.Content value="categories" p={0}>
            <CategoriesSection
              categories={filteredCategories}
              isLoading={isLoadingCategories}
              loaded={categoriesLoaded}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelect={handleSelectCategory}
              onLoad={fetchCategories}
              colors={{
                cardBg,
                borderColor,
                textPrimary,
                textSecondary,
                textTertiary,
                hoverBg,
                inputBg,
              }}
            />
          </Tabs.Content>

          {/* Sale History Tab */}
          <Tabs.Content value="history" p={0}>
            <HistorySection
              batches={batches}
              isLoading={isLoadingBatches}
              loaded={batchesLoaded}
              onRollback={handleRollback}
              rollingBackId={rollingBackBatchId}
              onLoad={fetchBatches}
              isSuperAdmin={isSuperAdmin}
              colors={{
                cardBg,
                borderColor,
                textPrimary,
                textSecondary,
                textTertiary,
                hoverBg,
              }}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Card.Root>

      {/* Product Sale Drawer */}
      {selectedCategory && (
        <ProductSaleDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedCategory(null);
          }}
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
          onSaleApplied={() => {
            setBatchesLoaded(false);
          }}
        />
      )}
    </Box>
  );
}

// Categories Section Component
function CategoriesSection({
  categories,
  isLoading,
  loaded,
  searchQuery,
  onSearchChange,
  onSelect,
  onLoad,
  colors,
}: {
  categories: WooCategory[];
  isLoading: boolean;
  loaded: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelect: (category: WooCategory) => void;
  onLoad: () => void;
  colors: {
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    hoverBg: string;
    inputBg: string;
  };
}) {
  if (!loaded && !isLoading) {
    return (
      <Box p={12}>
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <LuPackage size={48} />
            </EmptyState.Indicator>
            <VStack gap={2}>
              <EmptyState.Title color={colors.textPrimary}>
                Product Categories
              </EmptyState.Title>
              <EmptyState.Description color={colors.textSecondary}>
                Load categories to apply sales and discounts
              </EmptyState.Description>
            </VStack>
            <Box
              as="button"
              mt={4}
              px={6}
              py={2.5}
              bg="brand.500"
              color="white"
              borderRadius="full"
              fontWeight="medium"
              fontSize="sm"
              _hover={{ bg: "brand.600" }}
              transition="all 0.15s ease"
              onClick={onLoad}
            >
              Load Categories
            </Box>
          </EmptyState.Content>
        </EmptyState.Root>
      </Box>
    );
  }

  return (
    <Box>
      {/* Search Header */}
      <Box p={4} borderBottom="1px solid" borderColor={colors.borderColor}>
        <Box position="relative" maxW="400px">
          <Box
            position="absolute"
            left={4}
            top="50%"
            transform="translateY(-50%)"
            color={colors.textTertiary}
          >
            <LuSearch size={18} />
          </Box>
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            pl={11}
            bg={colors.inputBg}
            border="none"
            borderRadius="xl"
            fontSize="sm"
            _placeholder={{ color: colors.textTertiary }}
            _focus={{ ring: "2px", ringColor: "brand.500", ringOffset: "0" }}
          />
        </Box>
      </Box>

      {/* Category List */}
      <Box maxH="calc(100vh - 320px)" overflowY="auto">
        {isLoading ? (
          <VStack align="stretch" p={4} gap={2}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height="56px" borderRadius="xl" />
            ))}
          </VStack>
        ) : categories.length === 0 ? (
          <Box p={8} textAlign="center">
            <Text color={colors.textSecondary}>No categories found</Text>
          </Box>
        ) : (
          <VStack align="stretch" p={2} gap={0}>
            {categories.map((category) => (
              <Box
                key={category.id}
                as="button"
                p={4}
                borderRadius="xl"
                _hover={{ bg: colors.hoverBg }}
                onClick={() => onSelect(category)}
                textAlign="left"
                transition="all 0.15s ease"
                w="full"
              >
                <Flex justify="space-between" align="center">
                  <HStack gap={3}>
                    <Box
                      w={10}
                      h={10}
                      borderRadius="lg"
                      bg="brand.500/10"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <LuPackage
                        size={18}
                        color="var(--chakra-colors-brand-500)"
                      />
                    </Box>
                    <Text
                      fontWeight="500"
                      fontSize="sm"
                      color={colors.textPrimary}
                    >
                      {category.name}
                    </Text>
                  </HStack>
                  <LuChevronRight size={18} color={colors.textTertiary} />
                </Flex>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}

// History Section Component
function HistorySection({
  batches,
  isLoading,
  loaded,
  onRollback,
  rollingBackId,
  onLoad,
  isSuperAdmin,
  colors,
}: {
  batches: SaleBatch[];
  isLoading: boolean;
  loaded: boolean;
  onRollback: (batchId: string) => void;
  rollingBackId: string | null;
  onLoad: () => void;
  isSuperAdmin: boolean;
  colors: {
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    hoverBg: string;
  };
}) {
  if (!loaded && !isLoading) {
    return (
      <Box p={12}>
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <LuHistory size={48} />
            </EmptyState.Indicator>
            <VStack gap={2}>
              <EmptyState.Title color={colors.textPrimary}>
                Sale History
              </EmptyState.Title>
              <EmptyState.Description color={colors.textSecondary}>
                View past sales and rollback if needed
              </EmptyState.Description>
            </VStack>
            <Box
              as="button"
              mt={4}
              px={6}
              py={2.5}
              bg="brand.500"
              color="white"
              borderRadius="full"
              fontWeight="medium"
              fontSize="sm"
              _hover={{ bg: "brand.600" }}
              transition="all 0.15s ease"
              onClick={onLoad}
            >
              Load History
            </Box>
          </EmptyState.Content>
        </EmptyState.Root>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box p={4} borderBottom="1px solid" borderColor={colors.borderColor}>
        <Text fontWeight="600" color={colors.textPrimary}>
          Recent Sales
        </Text>
        <Text fontSize="xs" color={colors.textSecondary}>
          {batches.length} {batches.length === 1 ? "batch" : "batches"}
        </Text>
      </Box>

      {/* Batch List */}
      <Box maxH="calc(100vh - 320px)" overflowY="auto">
        {isLoading ? (
          <VStack align="stretch" p={4} gap={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height="100px" borderRadius="xl" />
            ))}
          </VStack>
        ) : batches.length === 0 ? (
          <Box p={8} textAlign="center">
            <Text color={colors.textSecondary}>No sales applied yet</Text>
          </Box>
        ) : (
          <VStack align="stretch" p={4} gap={3}>
            {batches.map((batch) => {
              const canRollback =
                !batch.dry_run && batch.applied > 0 && batch.rolled_back === 0;
              const isRollingBack = rollingBackId === batch.batch_id;

              return (
                <Box
                  key={batch.batch_id}
                  p={4}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={colors.borderColor}
                  bg={colors.cardBg}
                  transition="all 0.15s ease"
                  _hover={{ borderColor: "brand.300", shadow: "sm" }}
                >
                  <Flex justify="space-between" align="start" mb={3}>
                    <Box>
                      <HStack gap={2} mb={1}>
                        <Text
                          fontWeight="500"
                          fontSize="sm"
                          color={colors.textPrimary}
                        >
                          {batch.category_name || "Selected Products"}
                        </Text>
                        {batch.dry_run && (
                          <Badge
                            size="sm"
                            colorPalette="purple"
                            variant="subtle"
                          >
                            Preview
                          </Badge>
                        )}
                        {batch.rolled_back > 0 && (
                          <Badge size="sm" colorPalette="gray" variant="subtle">
                            Rolled Back
                          </Badge>
                        )}
                      </HStack>
                      <Text fontSize="xs" color={colors.textTertiary}>
                        {batch.created_at
                          ? new Date(batch.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )
                          : "-"}
                      </Text>
                    </Box>
                    {canRollback &&
                      (isSuperAdmin ? (
                        <Box
                          as="button"
                          px={3}
                          py={1.5}
                          borderRadius="lg"
                          bg="red.50"
                          color="red.600"
                          fontSize="xs"
                          fontWeight="medium"
                          _hover={!isRollingBack ? { bg: "red.100" } : undefined}
                          onClick={() => {
                            if (!isRollingBack) onRollback(batch.batch_id);
                          }}
                          aria-disabled={isRollingBack}
                          cursor={isRollingBack ? "not-allowed" : "pointer"}
                          opacity={isRollingBack ? 0.5 : 1}
                          transition="all 0.15s ease"
                          _dark={{
                            bg: "red.950",
                            color: "red.400",
                            _hover: !isRollingBack ? { bg: "red.900" } : undefined,
                          }}
                        >
                          <HStack gap={1.5}>
                            <LuUndo2 size={12} />
                            <Text>
                              {isRollingBack ? "Restoring..." : "Restore"}
                            </Text>
                          </HStack>
                        </Box>
                      ) : (
                        <Box
                          px={3}
                          py={1.5}
                          borderRadius="lg"
                          bg="amber.50"
                          color="amber.700"
                          fontSize="xs"
                          fontWeight="medium"
                          _dark={{ bg: "amber.950", color: "amber.400" }}
                        >
                          <HStack gap={1.5}>
                            <LuShieldAlert size={12} />
                            <Text>Contact WebDev to restore</Text>
                          </HStack>
                        </Box>
                      ))}
                  </Flex>

                  <Flex gap={6} flexWrap="wrap">
                    <Box>
                      <Text fontSize="xs" color={colors.textTertiary} mb={0.5}>
                        Discount
                      </Text>
                      <Text
                        fontSize="sm"
                        fontWeight="500"
                        color={colors.textPrimary}
                      >
                        {batch.discount_percent
                          ? `${batch.discount_percent}% off`
                          : "-"}
                      </Text>
                    </Box>
                    {(batch.sale_start_date || batch.sale_end_date) && (
                      <Box>
                        <Text
                          fontSize="xs"
                          color={colors.textTertiary}
                          mb={0.5}
                        >
                          Duration
                        </Text>
                        <Text
                          fontSize="sm"
                          fontWeight="500"
                          color={colors.textPrimary}
                        >
                          {batch.sale_start_date && batch.sale_end_date
                            ? `${batch.sale_start_date} → ${batch.sale_end_date}`
                            : "Permanent"}
                        </Text>
                      </Box>
                    )}
                    <Box>
                      <Text fontSize="xs" color={colors.textTertiary} mb={0.5}>
                        Products
                      </Text>
                      <HStack gap={2}>
                        <Badge size="sm" colorPalette="green" variant="subtle">
                          {batch.applied} applied
                        </Badge>
                        {batch.skipped > 0 && (
                          <Badge
                            size="sm"
                            colorPalette="orange"
                            variant="subtle"
                          >
                            {batch.skipped} skipped
                          </Badge>
                        )}
                      </HStack>
                    </Box>
                  </Flex>
                </Box>
              );
            })}
          </VStack>
        )}
      </Box>
    </Box>
  );
}
