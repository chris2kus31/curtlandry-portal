"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Drawer,
  Portal,
  VStack,
  HStack,
  Text,
  Input,
  Flex,
  Spinner,
  Badge,
  Checkbox,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuX,
  LuSearch,
  LuCheck,
  LuPackage,
  LuPercent,
  LuSparkles,
  LuSquareCheck,
  LuSquare,
  LuDollarSign,
  LuTrendingUp,
  LuTrendingDown,
} from "react-icons/lu";
import { wooService } from "@/lib/api";
import type { WooProduct, SaleResult } from "@/lib/api/woo-service";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

interface ProductSaleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: number;
  categoryName: string;
  onSaleApplied: () => void;
}

export function ProductSaleDrawer({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  onSaleApplied,
}: ProductSaleDrawerProps) {
  // State
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">(
    "decrease",
  );
  const [discountType, setDiscountType] = useState<"percent" | "amount">(
    "percent",
  );
  const [adjustmentValue, setAdjustmentValue] = useState("50");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Preview/Apply state
  const [previewResult, setPreviewResult] = useState<SaleResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApplyLoading, setIsApplyLoading] = useState(false);

  // Colors - Brand palette
  const drawerBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const textTertiary = useColorModeValue("gray.400", "gray.500");
  const inputBg = useColorModeValue("gray.100", "gray.800");
  const hoverBg = useColorModeValue("gray.50", "gray.800");
  const selectedBg = useColorModeValue("brand.50", "brand.950");

  // Fetch products when drawer opens
  useEffect(() => {
    if (isOpen && categoryId) {
      fetchProducts();
    }
  }, [isOpen, categoryId]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setProducts([]);
      setSelectedIds(new Set());
      setSearchQuery("");
      setPreviewResult(null);
      setAdjustmentType("decrease");
      setDiscountType("percent");
      setAdjustmentValue("50");
      setStartDate(null);
      setEndDate(null);
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const data = await wooService.getCategoryProducts(categoryId, true);
      setProducts(data);
      // Select all products without existing sales by default
      const eligibleIds = data
        .filter((p) => !p.sale_price || parseFloat(p.sale_price) === 0)
        .map((p) => p.id);
      setSelectedIds(new Set(eligibleIds));
    } catch (err) {
      console.error("Failed to fetch products:", err);
      toaster.create({
        title: "Error",
        description: "Failed to load products",
        type: "error",
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  // Eligible products (no existing sale)
  const eligibleProducts = useMemo(
    () =>
      filteredProducts.filter(
        (p) => !p.sale_price || parseFloat(p.sale_price) === 0,
      ),
    [filteredProducts],
  );

  // Products with existing sales
  const productsWithSales = useMemo(
    () =>
      filteredProducts.filter(
        (p) => p.sale_price && parseFloat(p.sale_price) > 0,
      ),
    [filteredProducts],
  );

  // Check if all eligible are selected
  const allEligibleSelected =
    eligibleProducts.length > 0 &&
    eligibleProducts.every((p) => selectedIds.has(p.id));

  // Toggle selection
  const toggleProduct = (productId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Select all eligible
  const selectAll = () => {
    setSelectedIds(new Set(eligibleProducts.map((p) => p.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date: Date | null): string => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  // Validate form - dates are optional
  const isFormValid = useMemo(() => {
    if (selectedIds.size === 0 || !adjustmentValue) {
      return false;
    }
    const value = parseFloat(adjustmentValue);
    if (isNaN(value) || value <= 0) return false;
    // For percentage, must be less than 100
    if (discountType === "percent" && value >= 100) return false;
    // If one date is set, both must be set
    if ((startDate && !endDate) || (!startDate && endDate)) return false;
    return true;
  }, [selectedIds.size, adjustmentValue, discountType, startDate, endDate]);

  // Preview sale
  const handlePreview = async () => {
    if (!isFormValid) return;

    setIsPreviewLoading(true);
    setPreviewResult(null);

    try {
      const request: Parameters<typeof wooService.previewSale>[0] = {
        category_id: categoryId,
        category_name: categoryName,
        product_ids: Array.from(selectedIds),
        discount_type: discountType,
        discount_value: parseFloat(adjustmentValue),
        adjustment_type: adjustmentType,
      };
      // Only include dates if both are set
      if (startDate && endDate) {
        request.start_date = formatDate(startDate);
        request.end_date = formatDate(endDate);
      }
      const result = await wooService.previewSale(request);
      setPreviewResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Preview failed";
      toaster.create({ title: "Error", description: message, type: "error" });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Apply sale
  const handleApply = async () => {
    if (!isFormValid) return;

    setIsApplyLoading(true);

    try {
      const request: Parameters<typeof wooService.applySale>[0] = {
        category_id: categoryId,
        category_name: categoryName,
        product_ids: Array.from(selectedIds),
        discount_type: discountType,
        discount_value: parseFloat(adjustmentValue),
        adjustment_type: adjustmentType,
      };
      // Only include dates if both are set
      if (startDate && endDate) {
        request.start_date = formatDate(startDate);
        request.end_date = formatDate(endDate);
      }
      const result = await wooService.applySale(request);

      toaster.create({
        title: "Sale Applied",
        description: `${result.applied} products updated`,
        type: "success",
      });

      onSaleApplied();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Apply failed";
      toaster.create({ title: "Error", description: message, type: "error" });
    } finally {
      setIsApplyLoading(false);
    }
  };

  // Calculate preview price
  const calculateNewPrice = (regularPrice: string) => {
    const price = parseFloat(regularPrice);
    if (isNaN(price) || !adjustmentValue) return "-";
    const value = parseFloat(adjustmentValue);
    if (isNaN(value)) return "-";

    let newPrice: number;
    if (discountType === "percent") {
      if (adjustmentType === "decrease") {
        newPrice = price * (1 - value / 100);
      } else {
        newPrice = price * (1 + value / 100);
      }
    } else {
      // Fixed amount
      if (adjustmentType === "decrease") {
        newPrice = price - value;
      } else {
        newPrice = price + value;
      }
    }

    return newPrice > 0 ? `$${newPrice.toFixed(2)}` : "-";
  };

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      placement="end"
      size="lg"
    >
      <Portal>
        <Drawer.Backdrop bg="blackAlpha.600" />
        <Drawer.Positioner>
          <Drawer.Content bg={drawerBg} borderLeftRadius="2xl" maxW="560px">
            {/* Header */}
            <Box
              px={6}
              py={5}
              borderBottom="1px solid"
              borderColor={borderColor}
            >
              <Flex justify="space-between" align="start">
                <Box>
                  <Text
                    fontSize="lg"
                    fontWeight="600"
                    color={textPrimary}
                    mb={1}
                  >
                    Apply Sale
                  </Text>
                  <HStack gap={2}>
                    <LuPackage
                      size={14}
                      color="var(--chakra-colors-blue-500)"
                    />
                    <Text fontSize="sm" color={textSecondary}>
                      {categoryName}
                    </Text>
                  </HStack>
                </Box>
                <Box
                  as="button"
                  p={2}
                  borderRadius="lg"
                  color={textSecondary}
                  _hover={{ bg: hoverBg, color: textPrimary }}
                  onClick={onClose}
                  transition="all 0.15s ease"
                >
                  <LuX size={20} />
                </Box>
              </Flex>
            </Box>

            {/* Body */}
            <Box flex={1} overflow="auto" px={6} py={5}>
              <VStack gap={6} align="stretch">
                {/* Sale Settings */}
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="600"
                    color={textTertiary}
                    mb={3}
                    textTransform="uppercase"
                    letterSpacing="wider"
                  >
                    Sale Settings
                  </Text>
                  <VStack gap={4} align="stretch">
                    {/* Adjustment Type (Increase/Decrease) */}
                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color={textTertiary}
                        mb={2}
                      >
                        Adjustment Direction
                      </Text>
                      <HStack gap={2}>
                        <Box
                          as="button"
                          flex={1}
                          p={3}
                          borderRadius="xl"
                          bg={
                            adjustmentType === "decrease" ? "red.50" : inputBg
                          }
                          border="2px solid"
                          borderColor={
                            adjustmentType === "decrease"
                              ? "red.400"
                              : "transparent"
                          }
                          onClick={() => setAdjustmentType("decrease")}
                          transition="all 0.15s ease"
                          _hover={{
                            bg:
                              adjustmentType === "decrease"
                                ? "red.50"
                                : hoverBg,
                          }}
                          _dark={{
                            bg:
                              adjustmentType === "decrease"
                                ? "red.950"
                                : inputBg,
                            borderColor:
                              adjustmentType === "decrease"
                                ? "red.500"
                                : "transparent",
                          }}
                        >
                          <HStack justify="center" gap={2}>
                            <LuTrendingDown
                              size={16}
                              color={
                                adjustmentType === "decrease"
                                  ? "var(--chakra-colors-red-500)"
                                  : "currentColor"
                              }
                            />
                            <Text
                              fontSize="sm"
                              fontWeight="500"
                              color={
                                adjustmentType === "decrease"
                                  ? "red.600"
                                  : textSecondary
                              }
                              _dark={{
                                color:
                                  adjustmentType === "decrease"
                                    ? "red.400"
                                    : textSecondary,
                              }}
                            >
                              Decrease
                            </Text>
                          </HStack>
                        </Box>
                        <Box
                          as="button"
                          flex={1}
                          p={3}
                          borderRadius="xl"
                          bg={
                            adjustmentType === "increase" ? "green.50" : inputBg
                          }
                          border="2px solid"
                          borderColor={
                            adjustmentType === "increase"
                              ? "green.400"
                              : "transparent"
                          }
                          onClick={() => setAdjustmentType("increase")}
                          transition="all 0.15s ease"
                          _hover={{
                            bg:
                              adjustmentType === "increase"
                                ? "green.50"
                                : hoverBg,
                          }}
                          _dark={{
                            bg:
                              adjustmentType === "increase"
                                ? "green.950"
                                : inputBg,
                            borderColor:
                              adjustmentType === "increase"
                                ? "green.500"
                                : "transparent",
                          }}
                        >
                          <HStack justify="center" gap={2}>
                            <LuTrendingUp
                              size={16}
                              color={
                                adjustmentType === "increase"
                                  ? "var(--chakra-colors-green-500)"
                                  : "currentColor"
                              }
                            />
                            <Text
                              fontSize="sm"
                              fontWeight="500"
                              color={
                                adjustmentType === "increase"
                                  ? "green.600"
                                  : textSecondary
                              }
                              _dark={{
                                color:
                                  adjustmentType === "increase"
                                    ? "green.400"
                                    : textSecondary,
                              }}
                            >
                              Increase
                            </Text>
                          </HStack>
                        </Box>
                      </HStack>
                    </Box>

                    {/* Discount Type (Percent/Amount) */}
                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color={textTertiary}
                        mb={2}
                      >
                        Adjustment Type
                      </Text>
                      <HStack gap={2}>
                        <Box
                          as="button"
                          flex={1}
                          p={3}
                          borderRadius="xl"
                          bg={discountType === "percent" ? "brand.50" : inputBg}
                          border="2px solid"
                          borderColor={
                            discountType === "percent"
                              ? "brand.400"
                              : "transparent"
                          }
                          onClick={() => setDiscountType("percent")}
                          transition="all 0.15s ease"
                          _hover={{
                            bg:
                              discountType === "percent" ? "brand.50" : hoverBg,
                          }}
                          _dark={{
                            bg:
                              discountType === "percent"
                                ? "brand.950"
                                : inputBg,
                            borderColor:
                              discountType === "percent"
                                ? "brand.500"
                                : "transparent",
                          }}
                        >
                          <HStack justify="center" gap={2}>
                            <LuPercent
                              size={16}
                              color={
                                discountType === "percent"
                                  ? "var(--chakra-colors-blue-500)"
                                  : "currentColor"
                              }
                            />
                            <Text
                              fontSize="sm"
                              fontWeight="500"
                              color={
                                discountType === "percent"
                                  ? "brand.600"
                                  : textSecondary
                              }
                              _dark={{
                                color:
                                  discountType === "percent"
                                    ? "brand.400"
                                    : textSecondary,
                              }}
                            >
                              Percentage
                            </Text>
                          </HStack>
                        </Box>
                        <Box
                          as="button"
                          flex={1}
                          p={3}
                          borderRadius="xl"
                          bg={discountType === "amount" ? "brand.50" : inputBg}
                          border="2px solid"
                          borderColor={
                            discountType === "amount"
                              ? "brand.400"
                              : "transparent"
                          }
                          onClick={() => setDiscountType("amount")}
                          transition="all 0.15s ease"
                          _hover={{
                            bg:
                              discountType === "amount" ? "brand.50" : hoverBg,
                          }}
                          _dark={{
                            bg:
                              discountType === "amount" ? "brand.950" : inputBg,
                            borderColor:
                              discountType === "amount"
                                ? "brand.500"
                                : "transparent",
                          }}
                        >
                          <HStack justify="center" gap={2}>
                            <LuDollarSign
                              size={16}
                              color={
                                discountType === "amount"
                                  ? "var(--chakra-colors-blue-500)"
                                  : "currentColor"
                              }
                            />
                            <Text
                              fontSize="sm"
                              fontWeight="500"
                              color={
                                discountType === "amount"
                                  ? "brand.600"
                                  : textSecondary
                              }
                              _dark={{
                                color:
                                  discountType === "amount"
                                    ? "brand.400"
                                    : textSecondary,
                              }}
                            >
                              Fixed Amount
                            </Text>
                          </HStack>
                        </Box>
                      </HStack>
                    </Box>

                    {/* Value Input */}
                    <Box
                      p={4}
                      borderRadius="xl"
                      bg={inputBg}
                      border="1px solid"
                      borderColor="transparent"
                      _focusWithin={{ borderColor: "brand.500" }}
                      transition="all 0.15s ease"
                    >
                      <Flex justify="space-between" align="center">
                        <HStack gap={3}>
                          <Box
                            p={2}
                            borderRadius="lg"
                            bg={
                              adjustmentType === "decrease"
                                ? "red.100"
                                : "green.100"
                            }
                          >
                            {discountType === "percent" ? (
                              <LuPercent
                                size={16}
                                color={
                                  adjustmentType === "decrease"
                                    ? "var(--chakra-colors-red-600)"
                                    : "var(--chakra-colors-green-600)"
                                }
                              />
                            ) : (
                              <LuDollarSign
                                size={16}
                                color={
                                  adjustmentType === "decrease"
                                    ? "var(--chakra-colors-red-600)"
                                    : "var(--chakra-colors-green-600)"
                                }
                              />
                            )}
                          </Box>
                          <Box>
                            <Text
                              fontSize="sm"
                              fontWeight="500"
                              color={textPrimary}
                            >
                              {adjustmentType === "decrease"
                                ? "Decrease"
                                : "Increase"}{" "}
                              by
                            </Text>
                            <Text fontSize="xs" color={textTertiary}>
                              {discountType === "percent"
                                ? "Percentage of regular price"
                                : "Fixed dollar amount"}
                            </Text>
                          </Box>
                        </HStack>
                        <HStack gap={1}>
                          {discountType === "amount" && (
                            <Text fontWeight="500" color={textSecondary}>
                              $
                            </Text>
                          )}
                          <Input
                            type="number"
                            value={adjustmentValue}
                            onChange={(e) => setAdjustmentValue(e.target.value)}
                            min={0.01}
                            max={discountType === "percent" ? 99 : undefined}
                            step={discountType === "percent" ? 1 : 0.01}
                            w="80px"
                            textAlign="center"
                            fontWeight="600"
                            bg="white"
                            border="none"
                            borderRadius="lg"
                            _dark={{ bg: "gray.700" }}
                          />
                          {discountType === "percent" && (
                            <Text fontWeight="500" color={textSecondary}>
                              %
                            </Text>
                          )}
                        </HStack>
                      </Flex>
                    </Box>

                    {/* Date Range (Optional) */}
                    <Box>
                      <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        minDate={new Date()}
                        showDuration={false}
                      />
                      <Text fontSize="xs" color={textTertiary} mt={2}>
                        Optional: Leave empty for immediate, permanent sale
                      </Text>
                    </Box>
                  </VStack>
                </Box>

                {/* Products */}
                <Box>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Text
                      fontSize="xs"
                      fontWeight="600"
                      color={textTertiary}
                      textTransform="uppercase"
                      letterSpacing="wider"
                    >
                      Products
                    </Text>
                    <HStack gap={3}>
                      {productsWithSales.length > 0 && (
                        <Badge
                          size="sm"
                          colorPalette="orange"
                          variant="subtle"
                          px={4}
                        >
                          {productsWithSales.length} already on sale
                        </Badge>
                      )}
                      <Badge
                        size="sm"
                        colorPalette="blue"
                        variant="subtle"
                        px={4}
                      >
                        {selectedIds.size} selected
                      </Badge>
                    </HStack>
                  </Flex>

                  {/* Search and Select All */}
                  <HStack gap={2} mb={3}>
                    <Box position="relative" flex={1}>
                      <Box
                        position="absolute"
                        left={3}
                        top="50%"
                        transform="translateY(-50%)"
                        color={textTertiary}
                      >
                        <LuSearch size={16} />
                      </Box>
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        pl={10}
                        bg={inputBg}
                        border="none"
                        borderRadius="xl"
                        fontSize="sm"
                        _placeholder={{ color: textTertiary }}
                      />
                    </Box>
                    {/* Select/Deselect All Button */}
                    <Box
                      as="button"
                      px={3}
                      py={2}
                      borderRadius="xl"
                      bg={inputBg}
                      color={textSecondary}
                      fontSize="xs"
                      fontWeight="medium"
                      _hover={{ bg: hoverBg, color: textPrimary }}
                      onClick={allEligibleSelected ? deselectAll : selectAll}
                      transition="all 0.15s ease"
                      whiteSpace="nowrap"
                    >
                      <HStack gap={1.5}>
                        {allEligibleSelected ? (
                          <LuSquare size={14} />
                        ) : (
                          <LuSquareCheck size={14} />
                        )}
                        <Text>
                          {allEligibleSelected ? "Deselect All" : "Select All"}
                        </Text>
                      </HStack>
                    </Box>
                  </HStack>

                  {/* Product List */}
                  <Box
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={borderColor}
                    overflow="hidden"
                    maxH="580px"
                    overflowY="auto"
                  >
                    {isLoadingProducts ? (
                      <Flex justify="center" py={8}>
                        <Spinner size="md" color="brand.500" />
                      </Flex>
                    ) : filteredProducts.length === 0 ? (
                      <Box p={6} textAlign="center">
                        <Text color={textSecondary} fontSize="sm">
                          No products found
                        </Text>
                      </Box>
                    ) : (
                      <VStack
                        align="stretch"
                        gap={0}
                        divideY="1px"
                        divideColor={borderColor}
                      >
                        {filteredProducts.map((product) => {
                          const hasSale = !!(
                            product.sale_price &&
                            parseFloat(product.sale_price) > 0
                          );
                          const isSelected = selectedIds.has(product.id);

                          return (
                            <Box
                              key={product.id}
                              as="button"
                              p={3}
                              bg={isSelected ? selectedBg : "transparent"}
                              _hover={{
                                bg: hasSale
                                  ? "transparent"
                                  : isSelected
                                    ? selectedBg
                                    : hoverBg,
                              }}
                              onClick={() =>
                                !hasSale && toggleProduct(product.id)
                              }
                              aria-disabled={hasSale}
                              opacity={hasSale ? 0.5 : 1}
                              cursor={hasSale ? "not-allowed" : "pointer"}
                              textAlign="left"
                              transition="all 0.1s ease"
                              w="full"
                            >
                              <Flex justify="space-between" align="center">
                                <HStack gap={3}>
                                  <Checkbox.Root
                                    checked={isSelected}
                                    disabled={hasSale}
                                    onCheckedChange={() => {
                                      !hasSale && toggleProduct(product.id);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control
                                      borderRadius="md"
                                      w={5}
                                      h={5}
                                      cursor={
                                        hasSale ? "not-allowed" : "pointer"
                                      }
                                    >
                                      <Checkbox.Indicator>
                                        <LuCheck size={14} />
                                      </Checkbox.Indicator>
                                    </Checkbox.Control>
                                  </Checkbox.Root>
                                  <Box>
                                    <Text
                                      fontSize="sm"
                                      fontWeight="500"
                                      color={textPrimary}
                                      lineClamp={1}
                                    >
                                      {product.name}
                                    </Text>
                                    <Text fontSize="xs" color={textTertiary}>
                                      ${product.regular_price}
                                      {hasSale &&
                                        ` → $${product.sale_price} (on sale)`}
                                    </Text>
                                  </Box>
                                </HStack>
                                {isSelected && !hasSale && (
                                  <Text
                                    fontSize="sm"
                                    fontWeight="600"
                                    color="green.500"
                                  >
                                    {calculateNewPrice(product.regular_price)}
                                  </Text>
                                )}
                              </Flex>
                            </Box>
                          );
                        })}
                      </VStack>
                    )}
                  </Box>
                </Box>

                {/* Preview Result */}
                {previewResult && (
                  <Box
                    p={4}
                    borderRadius="xl"
                    bg="green.50"
                    border="1px solid"
                    borderColor="green.200"
                    _dark={{ bg: "green.950", borderColor: "green.800" }}
                  >
                    <HStack gap={2} mb={2}>
                      <LuSparkles
                        size={16}
                        color="var(--chakra-colors-green-500)"
                      />
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color="green.700"
                        _dark={{ color: "green.300" }}
                      >
                        Preview Result
                      </Text>
                    </HStack>
                    <Flex gap={6}>
                      <Box>
                        <Text fontSize="2xl" fontWeight="700" color="green.600">
                          {previewResult.applied}
                        </Text>
                        <Text fontSize="xs" color="green.600">
                          will update
                        </Text>
                      </Box>
                      {previewResult.skipped > 0 && (
                        <Box>
                          <Text
                            fontSize="2xl"
                            fontWeight="700"
                            color="orange.500"
                          >
                            {previewResult.skipped}
                          </Text>
                          <Text fontSize="xs" color="orange.500">
                            will skip
                          </Text>
                        </Box>
                      )}
                    </Flex>
                  </Box>
                )}
              </VStack>
            </Box>

            {/* Footer */}
            <Box px={6} py={4} borderTop="1px solid" borderColor={borderColor}>
              <Flex gap={3}>
                <Box
                  as="button"
                  flex={1}
                  py={3}
                  borderRadius="xl"
                  bg={inputBg}
                  color={textPrimary}
                  fontWeight="600"
                  fontSize="sm"
                  _hover={{
                    bg: !isFormValid || isPreviewLoading ? inputBg : hoverBg,
                  }}
                  onClick={() =>
                    isFormValid && !isPreviewLoading && handlePreview()
                  }
                  aria-disabled={!isFormValid || isPreviewLoading}
                  opacity={!isFormValid || isPreviewLoading ? 0.5 : 1}
                  cursor={
                    !isFormValid || isPreviewLoading ? "not-allowed" : "pointer"
                  }
                  transition="all 0.15s ease"
                >
                  {isPreviewLoading ? <Spinner size="sm" /> : "Preview"}
                </Box>
                <Box
                  as="button"
                  flex={1}
                  py={3}
                  borderRadius="xl"
                  bg="brand.500"
                  color="white"
                  fontWeight="600"
                  fontSize="sm"
                  _hover={{
                    bg:
                      !isFormValid || isApplyLoading
                        ? "brand.500"
                        : "brand.600",
                  }}
                  onClick={() =>
                    isFormValid && !isApplyLoading && handleApply()
                  }
                  aria-disabled={!isFormValid || isApplyLoading}
                  opacity={!isFormValid || isApplyLoading ? 0.5 : 1}
                  cursor={
                    !isFormValid || isApplyLoading ? "not-allowed" : "pointer"
                  }
                  transition="all 0.15s ease"
                >
                  {isApplyLoading ? <Spinner size="sm" /> : "Apply Sale"}
                </Box>
              </Flex>
            </Box>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
