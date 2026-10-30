"use client";

import { Box, Button, HStack, SimpleGrid, Text } from "@chakra-ui/react";
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
  resolveCategoryIconKey,
  type DeviceCategoryIconKey,
} from "@/lib/onboarding/intake-constants";

const CATEGORY_ICONS: Record<DeviceCategoryIconKey, typeof LuLaptop> = {
  laptop: LuLaptop,
  desktop: LuMonitor,
  tablet: LuTablet,
  ipad: LuTablet,
  phone: LuSmartphone,
  device: LuPackage,
  other: LuPackage,
};

export function categoryIcon(
  iconKey: string | null | undefined,
): typeof LuLaptop {
  return CATEGORY_ICONS[resolveCategoryIconKey(iconKey)];
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
        borderColor="border.primary"
        bg="bg.secondary"
      >
        <Text fontSize="sm" color="fg.muted">
          No available devices in inventory
        </Text>
      </Box>
    );
  }

  return (
    <SimpleGrid columns={2} gap={2.5}>
      {stocked.map(({ category, count }) => {
        const Icon = categoryIcon(category.icon_key);
        return (
          <Button
            key={String(category.value)}
            variant="outline"
            h="auto"
            p={4}
            borderRadius="xl"
            borderWidth="1.5px"
            borderColor="border.primary"
            bg="bg.card"
            justifyContent="flex-start"
            textAlign="left"
            whiteSpace="normal"
            onClick={() => onSelect(String(category.value))}
            _hover={{ borderColor: "brand.400", bg: "bg.secondary" }}
          >
            <HStack gap={3} align="center">
              <Box p={2} borderRadius="lg" bg="bg.tertiary" color="fg">
                <Icon size={18} />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="fg">
                  {category.label}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {count} available
                </Text>
              </Box>
            </HStack>
          </Button>
        );
      })}
    </SimpleGrid>
  );
}
