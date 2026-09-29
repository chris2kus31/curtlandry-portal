"use client";

import { Box, Flex, HStack, Input } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { LuSearch } from "react-icons/lu";
import type { AssetOptions } from "@/lib/api";

/** Pseudo-status filter that maps to the API's `assignable=1` flag. */
export const ASSIGNABLE_FILTER = "assignable";

const selectStyle: React.CSSProperties = {
  padding: "8px 14px",
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

function FilterSelect({
  value,
  onChange,
  placeholder,
  entries,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  entries: [string, string][];
}) {
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const inputBg = useColorModeValue("gray.50", "gray.800");

  return (
    <Box
      bg={inputBg}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      _focusWithin={{ borderColor: "brand.500" }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        <option value="">{placeholder}</option>
        {entries.map(([entryValue, label]) => (
          <option key={entryValue} value={entryValue}>
            {label}
          </option>
        ))}
      </select>
    </Box>
  );
}

interface AssetInventoryFiltersProps {
  options: AssetOptions | null;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function AssetInventoryFilters({
  options,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  search,
  onSearchChange,
}: AssetInventoryFiltersProps) {
  const borderColor = useColorModeValue("gray.200", "gray.800");
  const textMuted = useColorModeValue("gray.500", "gray.500");
  const inputBg = useColorModeValue("gray.50", "gray.800");

  const descriptions = options?.status_descriptions ?? {};
  const statusEntries: [string, string][] = [
    [ASSIGNABLE_FILTER, "Ready for new hires — can be offered during intake"],
    ...Object.entries(options?.statuses ?? {}).map(
      ([value, label]) =>
        [
          value,
          descriptions[value] ? `${label} — ${descriptions[value]}` : label,
        ] as [string, string],
    ),
  ];

  return (
    <Flex
      justify="space-between"
      align={{ base: "stretch", md: "center" }}
      direction={{ base: "column", md: "row" }}
      gap={3}
      mb={5}
    >
      <HStack gap={3} flexWrap="wrap">
        <FilterSelect
          value={statusFilter}
          onChange={onStatusFilterChange}
          placeholder="All statuses"
          entries={statusEntries}
        />
        <FilterSelect
          value={typeFilter}
          onChange={onTypeFilterChange}
          placeholder="All asset types"
          entries={Object.entries(options?.types ?? {})}
        />
      </HStack>

      <Box position="relative" maxW={{ base: "full", md: "300px" }} w="full">
        <Box
          position="absolute"
          left={3}
          top="50%"
          transform="translateY(-50%)"
          color={textMuted}
          pointerEvents="none"
        >
          <LuSearch size={16} />
        </Box>
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, tag, or serial…"
          bg={inputBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="lg"
          pl={9}
          px={4}
          _focus={{ borderColor: "brand.500" }}
        />
      </Box>
    </Flex>
  );
}
