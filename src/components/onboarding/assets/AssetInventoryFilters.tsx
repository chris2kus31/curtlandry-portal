"use client";

import { Box, Flex, HStack, Input, NativeSelect } from "@chakra-ui/react";
import { LuSearch } from "react-icons/lu";
import type { AssetOptions, AssetStatusFilterOption } from "@/lib/api";

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
  return (
    <NativeSelect.Root
      size="sm"
      bg="bg.secondary"
      borderRadius="lg"
      border="1px solid"
      borderColor="border.primary"
      _focusWithin={{ borderColor: "brand.500" }}
      w="auto"
      minW="160px"
    >
      <NativeSelect.Field
        value={value}
        onChange={(e) => onChange(e.target.value)}
        ps={3.5}
        pe={8}
        py={2}
        fontSize="sm"
        border="none"
        bg="transparent"
      >
        <option value="">{placeholder}</option>
        {entries.map(([entryValue, label]) => (
          <option key={entryValue} value={entryValue}>
            {label}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}

function statusFilterEntries(
  options: AssetOptions | null,
): [string, string][] {
  const fromApi = options?.status_filters;
  if (fromApi && fromApi.length > 0) {
    return fromApi.map((filter: AssetStatusFilterOption) => [
      filter.value,
      filter.description
        ? `${filter.label} — ${filter.description}`
        : filter.label,
    ]);
  }

  // Fallback if an older API build has not shipped status_filters yet.
  const descriptions = options?.status_descriptions ?? {};
  return Object.entries(options?.statuses ?? {}).map(([value, label]) => [
    value,
    descriptions[value] ? `${label} — ${descriptions[value]}` : label,
  ]);
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
          entries={statusFilterEntries(options)}
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
          color="fg.muted"
          pointerEvents="none"
        >
          <LuSearch size={16} />
        </Box>
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, tag, or serial…"
          bg="bg.secondary"
          border="1px solid"
          borderColor="border.primary"
          borderRadius="lg"
          pl={9}
          px={4}
          _focus={{ borderColor: "brand.500" }}
        />
      </Box>
    </Flex>
  );
}
