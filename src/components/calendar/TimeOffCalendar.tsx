"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  LuLayoutGrid,
  LuCalendarRange,
  LuCalendar,
} from "react-icons/lu";
import { calendarService, type CalendarEvent } from "@/lib/api";

type CalendarView = "month" | "week" | "day";

interface TimeOffCalendarProps {
  title?: string;
  showLegend?: boolean;
  defaultView?: CalendarView;
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

// Get the start of the week (Sunday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

// Get the end of the week (Saturday) for a given date
function getWeekEnd(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return d;
}

export function TimeOffCalendar({ 
  title = "Team Calendar", 
  showLegend = true,
  defaultView = "month"
}: TimeOffCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<CalendarView>(defaultView);
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
  const viewBtnBg = useColorModeValue("gray.100", "gray.700");
  const viewBtnActiveBg = useColorModeValue("white", "gray.600");

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
  const fullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    if (view === "month") {
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
      };
    } else if (view === "week") {
      return {
        start: getWeekStart(currentDate),
        end: getWeekEnd(currentDate),
      };
    } else {
      // Day view
      return {
        start: new Date(currentDate),
        end: new Date(currentDate),
      };
    }
  }, [view, year, month, currentDate]);

  // Fetch events for the current view's date range
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = formatDate(dateRange.start);
      const endDate = formatDate(dateRange.end);
      const data = await calendarService.getEvents(startDate, endDate);
      setEvents(data);
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Navigation functions based on view
  const goToPrev = () => {
    if (view === "month") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (view === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
    }
    setSelectedDate(null);
  };

  const goToNext = () => {
    if (view === "month") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (view === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(today);
  };

  // Get display text for current date based on view
  const getHeaderDateText = () => {
    if (view === "month") {
      return `${monthNames[month]} ${year}`;
    } else if (view === "week") {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = getWeekEnd(currentDate);
      const startMonth = monthNames[weekStart.getMonth()].substring(0, 3);
      const endMonth = monthNames[weekEnd.getMonth()].substring(0, 3);
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      }
      return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
    } else {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  // Generate week days for week view
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const weekStart = getWeekStart(currentDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

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
          <VStack gap={3} align="stretch">
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
              
              {/* View Toggle Buttons */}
              <HStack 
                gap={0} 
                bg={viewBtnBg} 
                p={1} 
                borderRadius="lg"
                display={{ base: "none", sm: "flex" }}
              >
                <Box
                  as="button"
                  onClick={() => setView("month")}
                  px={3}
                  py={1.5}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                  color={view === "month" ? textPrimary : textSecondary}
                  bg={view === "month" ? viewBtnActiveBg : "transparent"}
                  shadow={view === "month" ? "sm" : "none"}
                  _hover={{ color: textPrimary }}
                  transition="all 0.2s"
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                >
                  <LuLayoutGrid size={14} />
                  Month
                </Box>
                <Box
                  as="button"
                  onClick={() => setView("week")}
                  px={3}
                  py={1.5}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                  color={view === "week" ? textPrimary : textSecondary}
                  bg={view === "week" ? viewBtnActiveBg : "transparent"}
                  shadow={view === "week" ? "sm" : "none"}
                  _hover={{ color: textPrimary }}
                  transition="all 0.2s"
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                >
                  <LuCalendarRange size={14} />
                  Week
                </Box>
                <Box
                  as="button"
                  onClick={() => setView("day")}
                  px={3}
                  py={1.5}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                  color={view === "day" ? textPrimary : textSecondary}
                  bg={view === "day" ? viewBtnActiveBg : "transparent"}
                  shadow={view === "day" ? "sm" : "none"}
                  _hover={{ color: textPrimary }}
                  transition="all 0.2s"
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                >
                  <LuCalendar size={14} />
                  Day
                </Box>
              </HStack>
            </HStack>
            
            {/* Navigation and Date Display */}
            <HStack justify="space-between">
              {/* Mobile View Toggle */}
              <HStack 
                gap={0} 
                bg={viewBtnBg} 
                p={1} 
                borderRadius="lg"
                display={{ base: "flex", sm: "none" }}
              >
                <IconButton
                  aria-label="Month view"
                  onClick={() => setView("month")}
                  variant="ghost"
                  size="xs"
                  borderRadius="md"
                  bg={view === "month" ? viewBtnActiveBg : "transparent"}
                  shadow={view === "month" ? "sm" : "none"}
                >
                  <LuLayoutGrid size={14} />
                </IconButton>
                <IconButton
                  aria-label="Week view"
                  onClick={() => setView("week")}
                  variant="ghost"
                  size="xs"
                  borderRadius="md"
                  bg={view === "week" ? viewBtnActiveBg : "transparent"}
                  shadow={view === "week" ? "sm" : "none"}
                >
                  <LuCalendarRange size={14} />
                </IconButton>
                <IconButton
                  aria-label="Day view"
                  onClick={() => setView("day")}
                  variant="ghost"
                  size="xs"
                  borderRadius="md"
                  bg={view === "day" ? viewBtnActiveBg : "transparent"}
                  shadow={view === "day" ? "sm" : "none"}
                >
                  <LuCalendar size={14} />
                </IconButton>
              </HStack>
              
              <HStack gap={2} flex={1} justify={{ base: "flex-end", sm: "center" }}>
                <IconButton
                  aria-label={`Previous ${view}`}
                  onClick={goToPrev}
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
                  minW={{ base: "auto", sm: "200px" }}
                  textAlign="center"
                >
                  {getHeaderDateText()}
                </Box>
                <IconButton
                  aria-label={`Next ${view}`}
                  onClick={goToNext}
                  variant="ghost"
                  size="sm"
                  borderRadius="lg"
                >
                  <LuChevronRight size={18} />
                </IconButton>
              </HStack>
              
              {/* Spacer for desktop alignment */}
              <Box display={{ base: "none", sm: "block" }} w="100px" />
            </HStack>
          </VStack>
        </Box>

        <Card.Body p={4}>
          {isLoading ? (
            <VStack gap={3}>
              <Skeleton height="40px" width="100%" borderRadius="lg" />
              {view === "month" ? (
                <SimpleGrid columns={7} gap={2} w="full">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} height="60px" borderRadius="lg" />
                  ))}
                </SimpleGrid>
              ) : view === "week" ? (
                <SimpleGrid columns={7} gap={2} w="full">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} height="120px" borderRadius="lg" />
                  ))}
                </SimpleGrid>
              ) : (
                <Skeleton height="300px" width="100%" borderRadius="lg" />
              )}
            </VStack>
          ) : view === "month" ? (
            /* Month View */
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
          ) : view === "week" ? (
            /* Week View */
            <VStack gap={2} align="stretch">
              {/* Day headers with dates */}
              <SimpleGrid columns={7} gap={1}>
                {weekDays.map((date, index) => {
                  const dateStr = formatDate(date);
                  const isToday = dateStr === today;
                  const isWeekend = index === 0 || index === 6;
                  
                  return (
                    <VStack
                      key={dateStr}
                      textAlign="center"
                      py={2}
                      gap={0}
                    >
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color={isWeekend ? "red.400" : textSecondary}
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        {dayNames[index]}
                      </Text>
                      <Text
                        fontSize="lg"
                        fontWeight={isToday ? "bold" : "medium"}
                        color={isToday ? "brand.600" : textPrimary}
                        w="32px"
                        h="32px"
                        lineHeight="32px"
                        borderRadius="full"
                        bg={isToday ? todayBg : "transparent"}
                        border={isToday ? "2px solid" : "none"}
                        borderColor={todayBorder}
                      >
                        {date.getDate()}
                      </Text>
                    </VStack>
                  );
                })}
              </SimpleGrid>

              {/* Week grid with events */}
              <SimpleGrid columns={7} gap={1}>
                {weekDays.map((date, index) => {
                  const dateStr = formatDate(date);
                  const isToday = dateStr === today;
                  const isWeekend = index === 0 || index === 6;
                  const dayEvents = getEventsForDate(dateStr);
                  const isSelected = dateStr === selectedDate;

                  return (
                    <Box
                      key={dateStr}
                      minH="120px"
                      p={2}
                      borderRadius="lg"
                      cursor="pointer"
                      bg={isSelected ? selectedBg : isToday ? todayBg : isWeekend ? weekendBg : "transparent"}
                      border="1px solid"
                      borderColor={borderColor}
                      _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                      transition="all 0.15s"
                      onClick={() => setSelectedDate(dateStr)}
                    >
                      <VStack gap={1} align="stretch">
                        {dayEvents.length === 0 ? (
                          <Text fontSize="xs" color={textSecondary} textAlign="center" py={4}>
                            No events
                          </Text>
                        ) : (
                          dayEvents.slice(0, 4).map((event) => (
                            <Box
                              key={event.id}
                              px={2}
                              py={1}
                              borderRadius="md"
                              bg={eventDotColor}
                              fontSize="xs"
                              fontWeight="medium"
                              color="white"
                              truncate
                            >
                              {event.title}
                            </Box>
                          ))
                        )}
                        {dayEvents.length > 4 && (
                          <Text fontSize="2xs" color={textSecondary} textAlign="center">
                            +{dayEvents.length - 4} more
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </VStack>
          ) : (
            /* Day View */
            <VStack gap={4} align="stretch">
              <Box
                p={4}
                borderRadius="lg"
                bg={formatDate(currentDate) === today ? todayBg : "transparent"}
                border={formatDate(currentDate) === today ? "2px solid" : "1px solid"}
                borderColor={formatDate(currentDate) === today ? todayBorder : borderColor}
              >
                <VStack gap={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="semibold" color={textPrimary} fontSize="lg">
                      {fullDayNames[currentDate.getDay()]}
                    </Text>
                    <Text fontWeight="bold" color="brand.600" fontSize="2xl">
                      {currentDate.getDate()}
                    </Text>
                  </HStack>
                  
                  {(() => {
                    const dayEvents = getEventsForDate(formatDate(currentDate));
                    if (dayEvents.length === 0) {
                      return (
                        <VStack gap={3} py={8}>
                          <LuCalendarOff size={40} color="var(--chakra-colors-green-400)" />
                          <Text fontSize="md" color={textSecondary} textAlign="center">
                            No time off scheduled for this day
                          </Text>
                          <Badge colorPalette="green" variant="subtle" px={3} py={1.5} borderRadius="full" fontSize="sm">
                            Everyone available
                          </Badge>
                        </VStack>
                      );
                    }
                    
                    return (
                      <VStack gap={2} align="stretch" pt={2}>
                        {dayEvents.map((event) => (
                          <Box
                            key={event.id}
                            p={4}
                            borderRadius="lg"
                            bg={hoverBg}
                            border="1px solid"
                            borderColor={borderColor}
                            borderLeft="4px solid"
                            borderLeftColor="brand.500"
                          >
                            <HStack justify="space-between" align="start">
                              <VStack align="start" gap={1}>
                                <Text fontWeight="semibold" fontSize="md" color={textPrimary}>
                                  {event.title}
                                </Text>
                                {event.description && (
                                  <Text fontSize="sm" color={textSecondary}>
                                    {event.description.split("\n")[0]}
                                  </Text>
                                )}
                              </VStack>
                              <Badge
                                colorPalette={event.all_day ? "brand" : "gray"}
                                variant="subtle"
                                fontSize="xs"
                              >
                                {event.all_day ? "All day" : "Partial day"}
                              </Badge>
                            </HStack>
                          </Box>
                        ))}
                        <Text fontSize="sm" color={textSecondary} textAlign="center" pt={2}>
                          {dayEvents.length} {dayEvents.length === 1 ? "person" : "people"} out
                        </Text>
                      </VStack>
                    );
                  })()}
                </VStack>
              </Box>
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
