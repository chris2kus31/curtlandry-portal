"use client";

import {
  Badge,
  Box,
  Flex,
  HStack,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { LuCheck, LuExpand, LuLaptop } from "react-icons/lu";
import type { DeviceCategoryOption, OnboardingAsset } from "@/lib/api";
import { assetsInCategory } from "@/lib/onboarding/intake-constants";

interface DeviceAssetPickerProps {
  category: DeviceCategoryOption;
  assets: OnboardingAsset[];
  selectedAssetId: string;
  onSelect: (assetId: string) => void;
  onPreview: (asset: OnboardingAsset) => void;
}

/** Second step of device selection — pick the actual unit in the category. */
export function DeviceAssetPicker({
  category,
  assets,
  selectedAssetId,
  onSelect,
  onPreview,
}: DeviceAssetPickerProps) {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const hoverBg = useColorModeValue("gray.100", "gray.800");
  const cardBg = useColorModeValue("white", "gray.900");
  const imageBg = useColorModeValue("gray.100", "gray.800");
  const selectedCardBg = useColorModeValue("brand.50", "whiteAlpha.100");

  const inCategory = assetsInCategory(assets, category.value);

  if (inCategory.length === 0) {
    return (
      <Box
        p={4}
        borderRadius="lg"
        border="1px dashed"
        borderColor={borderColor}
        bg={inputBg}
      >
        <Text fontSize="sm" color={textSecondary}>
          No {category.label.toLowerCase()} available right now
        </Text>
      </Box>
    );
  }

  return (
    <VStack gap={2.5} align="stretch">
      {inCategory.map((asset) => {
        const selected = selectedAssetId === String(asset.id);
        return (
          <HStack
            key={asset.id}
            as="button"
            align="stretch"
            gap={3}
            p={3}
            w="full"
            textAlign="left"
            bg={selected ? selectedCardBg : cardBg}
            borderRadius="xl"
            border="1.5px solid"
            borderColor={selected ? "brand.500" : borderColor}
            cursor="pointer"
            onClick={() => onSelect(String(asset.id))}
            _hover={{
              borderColor: selected ? "brand.500" : "brand.400",
              bg: selected ? selectedCardBg : hoverBg,
            }}
            transition="all 0.15s"
            position="relative"
          >
            <Box
              position="relative"
              w="76px"
              h="76px"
              flexShrink={0}
              borderRadius="lg"
              overflow="hidden"
              bg={imageBg}
              border="1px solid"
              borderColor={borderColor}
              onClick={(e) => {
                e.stopPropagation();
                if (asset.image_url) onPreview(asset);
              }}
              cursor={asset.image_url ? "zoom-in" : "default"}
              role={asset.image_url ? "button" : undefined}
              aria-label={asset.image_url ? `Preview ${asset.name}` : undefined}
            >
              {asset.image_url ? (
                <>
                  <Image
                    src={asset.image_url}
                    alt={asset.name}
                    w="100%"
                    h="100%"
                    fit="cover"
                  />
                  <Box
                    position="absolute"
                    right={1}
                    bottom={1}
                    bg="blackAlpha.600"
                    color="white"
                    borderRadius="md"
                    p={0.5}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <LuExpand size={12} />
                  </Box>
                </>
              ) : (
                <Flex
                  w="full"
                  h="full"
                  align="center"
                  justify="center"
                  color={textSecondary}
                >
                  <LuLaptop size={28} />
                </Flex>
              )}
            </Box>

            <VStack align="start" gap={1} flex={1} minW={0} py={0.5}>
              <HStack justify="space-between" w="full" gap={2}>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={textPrimary}
                  lineClamp={1}
                >
                  {asset.name}
                </Text>
                {selected && (
                  <Box color="brand.500" flexShrink={0}>
                    <LuCheck size={16} />
                  </Box>
                )}
              </HStack>
              <HStack gap={2} flexWrap="wrap">
                {asset.type_label && (
                  <Badge size="sm" variant="subtle" colorPalette="gray">
                    {asset.type_label}
                  </Badge>
                )}
                {asset.status_label && (
                  <Badge
                    size="sm"
                    variant="subtle"
                    colorPalette={asset.status_color ?? "gray"}
                  >
                    {asset.status_label}
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color={textSecondary} lineClamp={1}>
                {[
                  asset.asset_tag,
                  asset.serial_number ? `S/N ${asset.serial_number}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </VStack>
          </HStack>
        );
      })}
      <Text fontSize="xs" color={textSecondary}>
        Tap a card to assign. Click the image to enlarge.
      </Text>
    </VStack>
  );
}
