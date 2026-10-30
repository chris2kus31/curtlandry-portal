"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";
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
  const inCategory = assetsInCategory(assets, category.value);

  if (inCategory.length === 0) {
    return (
      <Box
        p={4}
        borderRadius="lg"
        border="1px dashed"
        borderColor="border.primary"
        bg="bg.secondary"
      >
        <Text fontSize="sm" color="fg.muted">
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
          <Button
            key={asset.id}
            variant="outline"
            h="auto"
            p={3}
            w="full"
            borderRadius="xl"
            borderWidth="1.5px"
            borderColor={selected ? "brand.500" : "border.primary"}
            bg={selected ? "brand.muted" : "bg.card"}
            justifyContent="flex-start"
            textAlign="left"
            whiteSpace="normal"
            onClick={() => onSelect(String(asset.id))}
            _hover={{
              borderColor: selected ? "brand.500" : "brand.400",
              bg: selected ? "brand.muted" : "bg.secondary",
            }}
          >
            <HStack align="stretch" gap={3} w="full">
              <Box
                position="relative"
                w="76px"
                h="76px"
                flexShrink={0}
                borderRadius="lg"
                overflow="hidden"
                bg="bg.tertiary"
                border="1px solid"
                borderColor="border.primary"
              >
                {asset.image_url ? (
                  <Image
                    src={asset.image_url}
                    alt={asset.name}
                    w="100%"
                    h="100%"
                    fit="cover"
                  />
                ) : (
                  <Flex
                    w="full"
                    h="full"
                    align="center"
                    justify="center"
                    color="fg.muted"
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
                    color="fg"
                    lineClamp={1}
                  >
                    {asset.name}
                  </Text>
                  <HStack gap={1} flexShrink={0}>
                    {asset.image_url && (
                      <IconButton
                        aria-label={`Preview ${asset.name}`}
                        size="xs"
                        variant="ghost"
                        colorPalette="gray"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(asset);
                        }}
                      >
                        <LuExpand size={14} />
                      </IconButton>
                    )}
                    {selected && (
                      <Box color="brand.500">
                        <LuCheck size={16} />
                      </Box>
                    )}
                  </HStack>
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
                <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                  {[
                    asset.asset_tag,
                    asset.serial_number ? `S/N ${asset.serial_number}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </VStack>
            </HStack>
          </Button>
        );
      })}
      <Text fontSize="xs" color="fg.muted">
        Tap a card to assign. Use the expand icon to enlarge the photo.
      </Text>
    </VStack>
  );
}
