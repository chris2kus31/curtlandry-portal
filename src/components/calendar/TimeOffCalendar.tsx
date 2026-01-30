"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  Grid,
  HStack,
  Text,
  VStack,
  Badge,
  Skeleton,
  IconButton,
  Flex,
  SimpleGrid,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import {
  LuChevronLeft,
  LuChevronRight,
  LuCalendarDays,
  LuUsers,
  LuCalendarOff,
} from "react-icons/lu";
import { calendarService, type CalendarEvent } from "@/lib/api";

interface TimeOffCalendarProps {
  title?: string;
  showLegend?: boolean;
}

// Helper to get days in a month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Helper to get the first day of the month (0 = Sunday)
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// Helper to format date as YYYY-MM-DD in local timezone
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse date string to local date
function parseDate(dateStr: string): Date {
  // Handle both "YYYY-MM-DD" and ISO datetime formats
  if (dateStr.includes("T")) {
    return new Date(dateStr);
  }
  // For date-only strings, parse as local date
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function TimeOffCalendar({ title = "Team Calendar", showLegend = true }: TimeOffCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Auto-select today's date on load
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.750");
  const todayBg = useColorModeValue("brand.50", "brand.900");
  const todayBorder = useColorModeValue("brand.500", "brand.400");
  const eventDotColor = useColorModeValue("brand.500", "brand.400");
  const weekendBg = useColorModeValue("gray.50", "gray.850");
  const headerBg = useColorModeValue("gray.50", "gray.900");
  const selectedBg = useColorModeValue("brand.100", "brand.800");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const today = formatDate(new Date());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Fetch events for the current month
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = formatDate(new Date(year, month, 1));
      const endDate = formatDate(new Date(year, month + 1, 0));
      const data = await calendarService.getEvents(startDate, endDate);
      setEvents(data);
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(today);
  };

  // Get events for a specific date
  const getEventsForDate = (dateStr: string): CalendarEvent[] => {
    return events.filter((event) => {
      const eventStart = parseDate(event.start);
      const eventEnd = parseDate(event.end);
      const checkDate = parseDate(dateStr);
      
      // For all-day events, end date is exclusive
      if (event.all_day) {
        eventEnd.setDate(eventEnd.getDate() - 1);
      }
      
      return checkDate >= eventStart && checkDate <= eventEnd;
    });
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Generate calendar grid
  const calendarDays: (number | null)[] = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <Grid templateColumns={{ base: "1fr", lg: "1fr 320px" }} gap={6}>
      {/* Calendar */}
      <Card.Root
        bg={cardBg}
        borderRadius="2xl"
        border="1px solid"
        borderColor={borderColor}
        overflow="hidden"
      >
        <Box h="3px" bgGradient="to-r" gradientFrom="brand.500" gradientTo="cyan.500" />
        
        {/* Header */}
        <Box px={5} py={4} bg={headerBg} borderBottom="1px solid" borderColor={borderColor}>
          <HStack justify="space-between">
            <HStack gap={3}>
              <Flex
                p={2}
                borderRadius="lg"
                bgGradient="to-br"
                gradientFrom="brand.500"
                gradientTo="cyan.500"
                align="center"
                justify="center"
              >
                <LuCalendarDays size={20} color="white" />
              </Flex>
              <Text fontWeight="semibold" color={textPrimary} fontSize="lg">
                {title}
              </Text>
            </HStack>
            <HStack gap={2}>
              <IconButton
                aria-label="Previous month"
                onClick={goToPrevMonth}
                variant="ghost"
                size="sm"
                borderRadius="lg"
              >
                <LuChevronLeft size={18} />
              </IconButton>
              <Box
                as="button"
                onClick={goToToday}
                px={3}
                py={1.5}
                borderRadius="lg"
                fontWeight="medium"
                fontSize="sm"
                color={textPrimary}
                _hover={{ bg: hoverBg }}
                transition="all 0.2s"
              >
                {monthNames[month]} {year}
              </Box>
              <IconButton
                aria-label="Next month"
                onClick={goToNextMonth}
                variant="ghost"
                size="sm"
                borderRadius="lg"
              >
                <LuChevronRight size={18} />
              </IconButton>
            </HStack>
          </HStack>
        </Box>

        <Card.Body p={4}>
          {isLoading ? (
            <VStack gap={3}>
              <Skeleton height="40px" width="100%" borderRadius="lg" />
              <SimpleGrid columns={7} gap={2} w="full">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} height="60px" borderRadius="lg" />
                ))}
              </SimpleGrid>
            </VStack>
          ) : (
            <VStack gap={2} align="stretch">
              {/* Day headers */}
              <SimpleGrid columns={7} gap={1}>
                {dayNames.map((day, index) => (
                  <Box
                    key={day}
                    textAlign="center"
                    py={2}
                    fontSize="xs"
                    fontWeight="semibold"
                    color={index === 0 || index === 6 ? "red.400" : textSecondary}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    {day}
                  </Box>
                ))}
              </SimpleGrid>

              {/* Calendar grid */}
              <SimpleGrid columns={7} gap={1}>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <Box key={`empty-${index}`} h="70px" />;
                  }

                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dateStr === today;
                  const isWeekend = index % 7 === 0 || index % 7 === 6;
                  const dayEvents = getEventsForDate(dateStr);
                  const hasEvents = dayEvents.length > 0;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <Box
                      key={dateStr}
                      h="70px"
                      p={1}
                      borderRadius="lg"
                      cursor="pointer"
                      bg={isSelected ? selectedBg : isToday ? todayBg : isWeekend ? weekendBg : "transparent"}
                      border={isToday ? "2px solid" : "1px solid"}
                      borderColor={isToday ? todayBorder : "transparent"}
                      _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                      transition="all 0.15s"
                      onClick={() => setSelectedDate(dateStr)}
                    >
                      <VStack gap={1} align="stretch" h="full">
                        <Text
                          fontSize="sm"
                          fontWeight={isToday ? "bold" : "medium"}
                          color={isToday ? "brand.600" : textPrimary}
                          textAlign="center"
                        >
                          {day}
                        </Text>
                        {hasEvents && (
                          <HStack justify="center" gap={0.5} flexWrap="wrap">
                            {dayEvents.slice(0, 3).map((_, i) => (
                              <Box
                                key={i}
                                w="6px"
                                h="6px"
                                borderRadius="full"
                                bg={eventDotColor}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <Text fontSize="2xs" color={textSecondary}>
                                +{dayEvents.length - 3}
                              </Text>
                            )}
                          </HStack>
                        )}
                      </VStack>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </VStack>
          )}
        </Card.Body>
      </Card.Root>

      {/* Event Details Sidebar */}
      <VStack gap={4} align="stretch">
        <Card.Root
          bg={cardBg}
          borderRadius="2xl"
          border="1px solid"
          borderColor={borderColor}
          overflow="hidden"
        >
          <Box
            px={4}
            py={3}
            bg={headerBg}
            borderBottom="1px solid"
            borderColor={borderColor}
          >
            <HStack gap={2}>
              <LuUsers size={16} color="var(--chakra-colors-brand-500)" />
              <Text fontWeight="semibold" fontSize="sm" color={textPrimary}>
                {selectedDate
                  ? parseDate(selectedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })
                  : "Select a date"}
              </Text>
            </HStack>
          </Box>

          <Card.Body p={4}>
            {!selectedDate ? (
              <VStack gap={3} py={6}>
                <LuCalendarDays size={32} color="var(--chakra-colors-gray-400)" />
                <Text fontSize="sm" color={textSecondary} textAlign="center">
                  Click on a date to see who&apos;s out
                </Text>
              </VStack>
            ) : selectedDateEvents.length === 0 ? (
              <VStack gap={3} py={6}>
                <LuCalendarOff size={32} color="var(--chakra-colors-green-400)" />
                <Text fontSize="sm" color={textSecondary} textAlign="center">
                  No time off scheduled
                </Text>
                <Badge colorPalette="green" variant="subtle" px={2} py={1} borderRadius="full">
                  Everyone available
                </Badge>
              </VStack>
            ) : (
              <VStack gap={2} align="stretch">
                {selectedDateEvents.map((event) => (
                  <Box
                    key={event.id}
                    p={3}
                    borderRadius="lg"
                    bg={hoverBg}
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <Text fontWeight="medium" fontSize="sm" color={textPrimary}>
                      {event.title}
                    </Text>
                    {event.description && (
                      <Text fontSize="xs" color={textSecondary} mt={1}>
                        {event.description.split("\n")[0]}
                      </Text>
                    )}
                    {!event.all_day && (
                      <Badge
                        colorPalette="gray"
                        variant="subtle"
                        fontSize="2xs"
                        mt={2}
                      >
                        Partial day
                      </Badge>
                    )}
                  </Box>
                ))}
                <Text fontSize="xs" color={textSecondary} textAlign="center" pt={2}>
                  {selectedDateEvents.length} {selectedDateEvents.length === 1 ? "person" : "people"} out
                </Text>
              </VStack>
            )}
          </Card.Body>
        </Card.Root>

        {/* Legend */}
        {showLegend && (
          <Card.Root
            bg={cardBg}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            p={4}
          >
            <Text fontSize="xs" fontWeight="semibold" color={textSecondary} mb={3} textTransform="uppercase" letterSpacing="wide">
              Legend
            </Text>
            <VStack gap={2} align="stretch">
              <HStack gap={2}>
                <Box w="12px" h="12px" borderRadius="full" bg={eventDotColor} />
                <Text fontSize="sm" color={textPrimary}>Time off scheduled</Text>
              </HStack>
              <HStack gap={2}>
                <Box w="12px" h="12px" borderRadius="sm" border="2px solid" borderColor={todayBorder} bg={todayBg} />
                <Text fontSize="sm" color={textPrimary}>Today</Text>
              </HStack>
              <HStack gap={2}>
                <Box w="12px" h="12px" borderRadius="sm" bg={weekendBg} border="1px solid" borderColor={borderColor} />
                <Text fontSize="sm" color={textPrimary}>Weekend</Text>
              </HStack>
            </VStack>
          </Card.Root>
        )}
      </VStack>
    </Grid>
  );
}
