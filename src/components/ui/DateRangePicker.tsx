"use client";

import { forwardRef, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { LuCalendar, LuArrowRight } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";

import "react-datepicker/dist/react-datepicker.css";
import "./date-range-picker.css";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  minDate?: Date;
  disabled?: boolean;
  singleDate?: boolean;
}

// Custom input component for the date picker
const CustomInput = forwardRef<
  HTMLButtonElement,
  {
    value?: string;
    onClick?: () => void;
    placeholder?: string;
    label?: string;
  }
>(({ value, onClick, placeholder = "Select date", label }, ref) => {
  // Use actual hex colors for inline styles
  const inputBg = useColorModeValue("#ffffff", "#1a202c");
  const borderColor = useColorModeValue("#e2e8f0", "#4a5568");
  const textPrimary = useColorModeValue("#1a202c", "#f7fafc");
  const textPlaceholder = useColorModeValue("#a0aec0", "#718096");
  const labelColor = useColorModeValue("gray.500", "gray.400");

  return (
    <Box w="full">
      {label && (
        <Text
          fontSize="xs"
          color={labelColor}
          mb={2}
          fontWeight="semibold"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          {label}
        </Text>
      )}
      <button
        type="button"
        onClick={onClick}
        ref={ref}
        style={{
          width: "100%",
          height: "48px",
          padding: "0 16px",
          background: inputBg,
          border: `1px solid ${borderColor}`,
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#00bc8b";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = borderColor;
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#00bc8b";
          e.currentTarget.style.boxShadow = "0 0 0 1px #00bc8b";
          e.currentTarget.style.outline = "none";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = borderColor;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <LuCalendar size={18} color="#00bc8b" />
        <span
          style={{
            color: value ? textPrimary : textPlaceholder,
            fontSize: "16px",
            fontWeight: value ? 500 : 400,
          }}
        >
          {value || placeholder}
        </span>
      </button>
    </Box>
  );
});

CustomInput.displayName = "CustomInput";

// Hook to ensure portal container exists in document body
function usePortalContainer() {
  const portalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create portal container if it doesn't exist
    let portalDiv = document.getElementById(
      "datepicker-portal",
    ) as HTMLDivElement | null;
    if (!portalDiv) {
      portalDiv = document.createElement("div");
      portalDiv.id = "datepicker-portal";
      document.body.appendChild(portalDiv);
    }
    portalRef.current = portalDiv;

    return () => {
      // Don't remove - other instances might need it
    };
  }, []);

  return portalRef;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minDate = new Date(),
  disabled = false,
  singleDate = false,
}: DateRangePickerProps) {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const durationBg = useColorModeValue("brand.50", "brand.950");

  // Calculate duration (business days only)
  const getDuration = () => {
    if (!startDate || !endDate) return null;
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const duration = getDuration();

  // Ensure portal container exists
  usePortalContainer();

  // Single date mode - just show one date picker
  if (singleDate) {
    return (
      <Box className="date-range-picker" position="relative">
        <Box position="relative">
          <DatePicker
            selected={startDate}
            onChange={(date: Date | null) => {
              onStartDateChange(date);
              onEndDateChange(date);
            }}
            minDate={minDate}
            disabled={disabled}
            dateFormat="MMM d, yyyy"
            placeholderText="Select date"
            customInput={<CustomInput placeholder="Select date" />}
            popperPlacement="bottom-start"
            showPopperArrow={false}
            portalId="datepicker-portal"
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box className="date-range-picker" position="relative">
      <HStack gap={4} align="end" flexWrap={{ base: "wrap", sm: "nowrap" }}>
        <Box flex={1} minW="140px" position="relative">
          <DatePicker
            selected={startDate}
            onChange={(date: Date | null) => {
              onStartDateChange(date);
              if (!endDate || (date && endDate < date)) {
                onEndDateChange(date);
              }
            }}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            minDate={minDate}
            disabled={disabled}
            dateFormat="MMM d, yyyy"
            placeholderText="Select start date"
            customInput={
              <CustomInput label="From" placeholder="Select start date" />
            }
            popperPlacement="bottom-start"
            showPopperArrow={false}
            portalId="datepicker-portal"
          />
        </Box>

        <Box
          display={{ base: "none", sm: "flex" }}
          pb="24px"
          color={textSecondary}
        >
          <LuArrowRight size={20} />
        </Box>

        <Box flex={1} minW="140px" position="relative">
          <DatePicker
            selected={endDate}
            onChange={onEndDateChange}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate || minDate}
            disabled={disabled || !startDate}
            dateFormat="MMM d, yyyy"
            placeholderText={
              startDate ? "Select end date" : "Select start first"
            }
            customInput={
              <CustomInput
                label="To"
                placeholder={
                  startDate ? "Select end date" : "Select start first"
                }
              />
            }
            popperPlacement="bottom-end"
            showPopperArrow={false}
            portalId="datepicker-portal"
          />
        </Box>
      </HStack>

      {/* Duration Display */}
      {duration !== null && duration > 0 && (
        <HStack
          mt={4}
          p={3}
          bg={durationBg}
          borderRadius="lg"
          justify="center"
          gap={6}
        >
          <VStack gap={0}>
            <Text fontSize="2xl" fontWeight="bold" color="brand.500">
              {duration}
            </Text>
            <Text fontSize="xs" color={textSecondary}>
              {duration === 1 ? "day" : "days"}
            </Text>
          </VStack>
          <Box w="1px" h="40px" bg={borderColor} />
          <VStack gap={0}>
            <Text fontSize="2xl" fontWeight="bold" color="brand.500">
              {duration * 8}
            </Text>
            <Text fontSize="xs" color={textSecondary}>
              hours
            </Text>
          </VStack>
        </HStack>
      )}
    </Box>
  );
}
