"use client";

import { Box, HStack, SimpleGrid, Text } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import {
  LuLaptop,
  LuMonitor,
  LuPackage,
  LuSmartphone,
  LuTablet,
} from "react-icons/lu";
import type { DeviceCategoryOption, OnboardingAsset } from "@/lib/api";
import {
  assetsInCategory,
  deviceCategoryIconKey,
  type DeviceCategoryIconKey,
} from "@/lib/onboarding/intake-constants";

const CATEGORY_ICONS: Record<DeviceCategoryIconKey, typeof LuLaptop> = {
  laptop: LuLaptop,
  desktop: LuMonitor,
  tablet: LuTablet,
  phone: LuSmartphone,
  other: LuPackage,
};

export function categoryIcon(label: string): typeof LuLaptop {
  return CATEGORY_ICONS[deviceCategoryIconKey(label)];
}

interface DeviceCategoryPickerProps {
  categories: DeviceCategoryOption[];
  assets: OnboardingAsset[];
  onSelect: (value: string) => void;
}

/** First step of device selection — pick a category that has stock. */
export function DeviceCategoryPicker({
  categories,
  assets,
  onSelect,
}: DeviceCategoryPickerProps) {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const hoverBg = useColorModeValue("gray.100", "gray.800");
  const cardBg = useColorModeValue("white", "gray.900");
  const iconBg = useColorModeValue("gray.100", "gray.800");

  const stocked = categories
    .map((category) => ({
      category,
      count: assetsInCategory(assets, category.value).length,
    }))
    .filter((entry) => entry.count > 0);

  if (stocked.length === 0) {
    return (
      <Box
        p={4}
        borderRadius="lg"
        border="1px dashed"
        borderColor={borderColor}
        bg={inputBg}
      >
        <Text fontSize="sm" color={textSecondary}>
          No available devices in inventory
        </Text>
      </Box>
    );
  }

  return (
    <SimpleGrid columns={2} gap={2.5}>
      {stocked.map(({ category, count }) => {
        const Icon = categoryIcon(category.label);
        return (
          <Box
            key={category.value}
            as="button"
            p={4}
            borderRadius="xl"
            border="1.5px solid"
            borderColor={borderColor}
            bg={cardBg}
            textAlign="left"
            cursor="pointer"
            onClick={() => onSelect(category.value)}
            _hover={{ borderColor: "brand.400", bg: hoverBg }}
            transition="all 0.15s"
          >
            <HStack gap={3} align="center">
              <Box p={2} borderRadius="lg" bg={iconBg} color={textPrimary}>
                <Icon size={18} />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
                  {category.label}
                </Text>
                <Text fontSize="xs" color={textSecondary}>
                  {count} available
                </Text>
              </Box>
            </HStack>
          </Box>
        );
      })}
    </SimpleGrid>
  );
}
