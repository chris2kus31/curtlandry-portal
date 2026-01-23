"use client";

import { forwardRef } from "react";
import DatePicker from "react-datepicker";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { LuCalendar, LuArrowRight } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";

import "react-datepicker/dist/react-datepicker.css";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  minDate?: Date;
  disabled?: boolean;
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
  const inputBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textPlaceholder = useColorModeValue("gray.400", "gray.500");

  return (
    <Box w="full">
      {label && (
        <Text
          fontSize="xs"
          color={textPlaceholder}
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
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--chakra-colors-brand-400)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = borderColor;
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--chakra-colors-brand-500)";
          e.currentTarget.style.boxShadow = "0 0 0 1px var(--chakra-colors-brand-500)";
          e.currentTarget.style.outline = "none";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = borderColor;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <LuCalendar size={18} color="var(--chakra-colors-brand-500)" />
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

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minDate = new Date(),
  disabled = false,
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

  return (
    <Box className="date-range-picker" position="relative">
      <HStack gap={4} align="end" flexWrap={{ base: "wrap", sm: "nowrap" }}>
        <Box flex={1} minW="140px" position="relative" zIndex={2}>
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
            customInput={<CustomInput label="From" placeholder="Select start date" />}
            popperPlacement="bottom-start"
            showPopperArrow={false}
            portalId="datepicker-portal"
          />
        </Box>

        <Box display={{ base: "none", sm: "flex" }} pb="24px" color={textSecondary}>
          <LuArrowRight size={20} />
        </Box>

        <Box flex={1} minW="140px" position="relative" zIndex={1}>
          <DatePicker
            selected={endDate}
            onChange={onEndDateChange}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate || minDate}
            disabled={disabled || !startDate}
            dateFormat="MMM d, yyyy"
            placeholderText={startDate ? "Select end date" : "Select start first"}
            customInput={
              <CustomInput 
                label="To" 
                placeholder={startDate ? "Select end date" : "Select start first"} 
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

      {/* Portal container for datepicker popups */}
      <div id="datepicker-portal" />

      {/* Custom styles for react-datepicker */}
      <style jsx global>{`
        .date-range-picker .react-datepicker-wrapper {
          width: 100%;
        }
        
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
        
        .react-datepicker {
          font-family: inherit;
          border: 1px solid var(--chakra-colors-gray-200);
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          background: white;
        }
        
        .dark .react-datepicker {
          background: var(--chakra-colors-gray-800);
          border-color: var(--chakra-colors-gray-600);
        }
        
        .react-datepicker__header {
          background: linear-gradient(135deg, #00bc8b 0%, #0095c1 100%);
          border-bottom: none;
          padding: 16px 16px 12px;
          border-radius: 0;
        }
        
        .react-datepicker__current-month {
          color: white;
          font-weight: 600;
          font-size: 1.1rem;
          margin-bottom: 12px;
        }
        
        .react-datepicker__day-names {
          margin-top: 4px;
        }
        
        .react-datepicker__day-name {
          color: rgba(255, 255, 255, 0.9);
          font-weight: 600;
          font-size: 0.75rem;
          width: 40px;
          line-height: 40px;
          margin: 2px;
          text-transform: uppercase;
        }
        
        .react-datepicker__month {
          margin: 16px;
        }
        
        .react-datepicker__day {
          width: 40px;
          line-height: 40px;
          margin: 2px;
          border-radius: 10px;
          transition: all 0.15s ease;
          font-weight: 500;
        }
        
        .dark .react-datepicker__day {
          color: var(--chakra-colors-gray-100);
        }
        
        .react-datepicker__day:hover {
          background: var(--chakra-colors-brand-100);
          border-radius: 10px;
        }
        
        .dark .react-datepicker__day:hover {
          background: var(--chakra-colors-brand-900);
        }
        
        .react-datepicker__day--selected,
        .react-datepicker__day--range-start,
        .react-datepicker__day--range-end {
          background: linear-gradient(135deg, #00bc8b 0%, #0095c1 100%) !important;
          color: white !important;
          font-weight: 600;
        }
        
        .react-datepicker__day--in-range {
          background: var(--chakra-colors-brand-100);
          color: var(--chakra-colors-brand-700);
          border-radius: 0;
        }
        
        .dark .react-datepicker__day--in-range {
          background: var(--chakra-colors-brand-900);
          color: var(--chakra-colors-brand-200);
        }
        
        .react-datepicker__day--in-selecting-range {
          background: var(--chakra-colors-brand-100) !important;
          color: var(--chakra-colors-brand-700);
        }
        
        .react-datepicker__day--range-start {
          border-radius: 10px 0 0 10px !important;
        }
        
        .react-datepicker__day--range-end {
          border-radius: 0 10px 10px 0 !important;
        }
        
        .react-datepicker__day--range-start.react-datepicker__day--range-end {
          border-radius: 10px !important;
        }
        
        .react-datepicker__day--disabled {
          color: var(--chakra-colors-gray-300) !important;
          cursor: not-allowed;
        }
        
        .dark .react-datepicker__day--disabled {
          color: var(--chakra-colors-gray-600) !important;
        }
        
        .react-datepicker__day--outside-month {
          color: var(--chakra-colors-gray-300);
        }
        
        .dark .react-datepicker__day--outside-month {
          color: var(--chakra-colors-gray-600);
        }
        
        .react-datepicker__navigation {
          top: 20px;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          transition: background 0.15s;
        }
        
        .react-datepicker__navigation:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .react-datepicker__navigation--previous {
          left: 12px;
        }
        
        .react-datepicker__navigation--next {
          right: 12px;
        }
        
        .react-datepicker__navigation-icon::before {
          border-color: white;
          border-width: 2px 2px 0 0;
          width: 8px;
          height: 8px;
        }
        
        .react-datepicker__triangle {
          display: none;
        }
        
        .dark .react-datepicker__month-container {
          background: var(--chakra-colors-gray-800);
        }
        
        .react-datepicker__day--keyboard-selected {
          background: var(--chakra-colors-brand-200);
          border-radius: 10px;
        }
        
        .react-datepicker__day--today {
          font-weight: 700;
          background: var(--chakra-colors-brand-50);
          color: var(--chakra-colors-brand-600);
        }
        
        .dark .react-datepicker__day--today {
          background: var(--chakra-colors-brand-900);
          color: var(--chakra-colors-brand-300);
        }
        
        .react-datepicker__day--today.react-datepicker__day--selected,
        .react-datepicker__day--today.react-datepicker__day--range-start,
        .react-datepicker__day--today.react-datepicker__day--range-end {
          color: white !important;
          background: linear-gradient(135deg, #00bc8b 0%, #0095c1 100%) !important;
        }
      `}</style>
    </Box>
  );
}
