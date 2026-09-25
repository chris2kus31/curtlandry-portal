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
import { LuLaptop, LuTrash2, LuWrench } from "react-icons/lu";
import type { Asset } from "@/lib/api";

interface AssetInventoryRowProps {
  asset: Asset;
  deleting: boolean;
  onOpen: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

export function AssetInventoryRow({
  asset,
  deleting,
  onOpen,
  onDelete,
}: AssetInventoryRowProps) {
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const rowHoverBg = useColorModeValue("gray.50", "gray.800");
  const imageBg = useColorModeValue("gray.100", "gray.800");

  const identifiers =
    [
      asset.asset_tag ? `Tag ${asset.asset_tag}` : null,
      asset.serial_number ? `Serial ${asset.serial_number}` : null,
      asset.cost != null ? `$${Number(asset.cost).toLocaleString()}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "No tag or serial yet";

  return (
    <Flex
      align="center"
      gap={3}
      px={4}
      py={3}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      cursor="pointer"
      onClick={() => onOpen(asset)}
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
            {asset.asset_category_name ?? asset.type_label}
          </Text>
        </HStack>
        <Text fontSize="xs" color={textMuted} mt={0.5} truncate>
          {identifiers}
        </Text>
        {asset.holder_label && (
          <Text fontSize="xs" color={textSecondary} mt={1}>
            {asset.holder_label}
          </Text>
        )}
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
        color={deleting ? textMuted : "red.400"}
        onClick={(e) => {
          e.stopPropagation();
          if (!deleting) onDelete(asset);
        }}
        aria-disabled={deleting}
        cursor={deleting ? "not-allowed" : "pointer"}
        _hover={{ bg: "red.500/10" }}
        transition="all 0.15s"
        title="Remove from inventory"
        flexShrink={0}
      >
        <LuTrash2 size={16} />
      </Box>
    </Flex>
  );
}
