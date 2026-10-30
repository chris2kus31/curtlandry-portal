"use client";

import {
  Badge,
  Box,
  Flex,
  HStack,
  IconButton,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuLaptop, LuTrash2, LuTriangleAlert } from "react-icons/lu";
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
  const identifiers =
    [
      asset.asset_tag ? `Tag ${asset.asset_tag}` : null,
      asset.serial_number ? `Serial ${asset.serial_number}` : null,
      asset.cost != null ? `$${Number(asset.cost).toLocaleString()}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "No tag or serial yet";

  // Capability comes from the API — never invent delete rules in the UI.
  const canDelete = asset.can_delete === true;

  return (
    <Flex
      align="center"
      gap={3}
      px={4}
      py={3}
      borderRadius="xl"
      border="1px solid"
      borderColor={asset.is_out_of_sync ? "orange.300" : "border.primary"}
      cursor="pointer"
      onClick={() => onOpen(asset)}
      _hover={{ bg: "bg.secondary" }}
      transition="all 0.15s"
      bg="bg.card"
    >
      <Box
        w="52px"
        h="52px"
        borderRadius="lg"
        overflow="hidden"
        bg="bg.tertiary"
        border="1px solid"
        borderColor="border.primary"
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
        ) : (
          <Box color="fg.muted">
            <LuLaptop size={18} />
          </Box>
        )}
      </Box>

      <Box flex={1} minW={0}>
        <HStack gap={2} flexWrap="wrap">
          <Text fontWeight="semibold" color="fg" truncate>
            {asset.name}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {asset.asset_category_name ?? asset.type_label}
          </Text>
        </HStack>
        <Text fontSize="xs" color="fg.muted" mt={0.5} truncate>
          {identifiers}
        </Text>
        {asset.holder_label && (
          <Text fontSize="xs" color="fg.muted" mt={1}>
            {asset.holder_label}
          </Text>
        )}
        {asset.is_out_of_sync && (
          <HStack gap={1} mt={1} color="orange.500">
            <LuTriangleAlert size={12} />
            <Text fontSize="xs" fontWeight="medium">
              Out of sync with Asset Tiger
            </Text>
          </HStack>
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

      {canDelete && (
        <IconButton
          aria-label="Remove from inventory"
          size="sm"
          variant="ghost"
          colorPalette="red"
          flexShrink={0}
          disabled={deleting}
          onClick={(e) => {
            e.stopPropagation();
            if (!deleting) onDelete(asset);
          }}
        >
          <LuTrash2 size={16} />
        </IconButton>
      )}
    </Flex>
  );
}
