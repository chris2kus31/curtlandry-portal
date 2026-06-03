"use client";

import React from "react";
import {
  Box,
  Container,
  HStack,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import {
  LuCalendar,
  LuCheck,
  LuClock,
  LuMapPin,
  LuUsers,
} from "react-icons/lu";
import type { IconType } from "react-icons";

interface PreviewData {
  name: string;
  subtitle: string;
  description: string;
  hero_image_url: string;
  gallery_image_urls: string[];
  format: string;
  group_size_label: string;
  length_label: string;
  inclusions: string; // newline separated
  start_date: string;
  end_date: string;
  location_city: string;
  location_state: string;
  location_country: string;
  price_dollars: string;
  currency: string;
}

interface EventPreviewProps {
  data: PreviewData;
}

// Brand tokens lifted from sites/slc/components/events/_constants.ts so the
// admin preview matches the live RetreatSnapshot 1:1 without importing
// site-specific packages.
const TEAL_ROLE = "#0C6376";
const NAVY_DARK = "#002F48";
const CREAM_BG = "#FFF6E8";

function formatLocation(d: PreviewData): string {
  const parts = [d.location_city, d.location_state].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return d.location_country || "Location TBA";
}

/**
 * Pixel-faithful mirror of `RetreatSnapshot` from curtlandry-sites/slc, fed
 * by the live `EventForm` state. Kept self-contained — no imports from the
 * sites repo, no Chakra theme dependencies — so it renders consistently in
 * the admin portal regardless of which site the event will publish to.
 */
export function EventPreview({ data }: EventPreviewProps) {
  const inclusions = data.inclusions
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const details: { icon: IconType; label: string; value: string }[] = [
    { icon: LuMapPin, label: "LOCATION", value: formatLocation(data) },
    {
      icon: LuCalendar,
      label: "FORMAT",
      value: data.format || "—",
    },
    { icon: LuUsers, label: "GROUP SIZE", value: data.group_size_label || "—" },
    { icon: LuClock, label: "LENGTH", value: data.length_label || "—" },
  ];

  const galleryTiles = (data.gallery_image_urls ?? []).slice(0, 3);
  // Pad to 3 slots so the layout stays stable even with fewer images
  while (galleryTiles.length < 3) galleryTiles.push("");

  return (
    <Box bg={CREAM_BG} py={{ base: 14, md: 20 }}>
      <Container maxW="1200px" px={{ base: 5, md: 10, lg: "80px" }}>
        <Box
          as="h2"
          fontWeight={700}
          fontSize={{ base: "3xl", md: "4xl", lg: "44px" }}
          lineHeight={{ base: "1.15", lg: "52px" }}
          color={NAVY_DARK}
          textAlign="center"
          mb={10}
        >
          {data.name.trim() || "Untitled event"}
        </Box>

        <Box
          bg="white"
          borderRadius="12px"
          overflow="hidden"
          shadow="md"
          maxW="1000px"
          mx="auto"
        >
          {/* Hero image */}
          <Box
            position="relative"
            h={{ base: "200px", md: "320px" }}
            bg="gray.300"
          >
            {data.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.hero_image_url}
                alt={data.name || "Event hero"}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  display: "block",
                }}
              />
            ) : (
              <Box
                position="absolute"
                inset={0}
                bgGradient="linear(to-br, gray.300, gray.500)"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontSize="sm">
                  No hero image yet
                </Text>
              </Box>
            )}
          </Box>

          {/* Details */}
          <Box p={{ base: 6, md: 10 }}>
            <SimpleGrid
              columns={{ base: 1, md: 2 }}
              gap={{ base: 8, md: 10 }}
              mb={8}
            >
              {/* Left: details list */}
              <Box>
                {details.map((d) => {
                  const Icon = d.icon;
                  return (
                    <Box key={d.label} mb={4} _last={{ mb: 0 }}>
                      <HStack gap={2} mb={1.5}>
                        <Box color={TEAL_ROLE}>
                          <Icon size={14} />
                        </Box>
                        <Text
                          fontSize="2xs"
                          fontWeight="bold"
                          color={TEAL_ROLE}
                          letterSpacing="0.12em"
                        >
                          {d.label}
                        </Text>
                      </HStack>
                      <Text
                        color={NAVY_DARK}
                        fontWeight={700}
                        fontSize="sm"
                        lineHeight="1.5"
                      >
                        {d.value}
                      </Text>
                    </Box>
                  );
                })}
              </Box>

              {/* Right: what's included */}
              <Box>
                <Text
                  fontSize="2xs"
                  fontWeight="bold"
                  color={TEAL_ROLE}
                  letterSpacing="0.12em"
                  mb={4}
                >
                  WHAT&apos;S INCLUDED
                </Text>
                {inclusions.length === 0 ? (
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    Add inclusions (one per line) to see them here.
                  </Text>
                ) : (
                  inclusions.map((i, idx) => (
                    <HStack key={`${i}-${idx}`} gap={3} align="start" mb={3}>
                      <Box color={TEAL_ROLE} mt={0.5} flexShrink={0}>
                        <LuCheck size={14} strokeWidth={3} />
                      </Box>
                      <Text
                        color="gray.700"
                        fontWeight={500}
                        fontSize="sm"
                        lineHeight="1.5"
                      >
                        {i}
                      </Text>
                    </HStack>
                  ))
                )}
              </Box>
            </SimpleGrid>

            {/* Gallery row */}
            <SimpleGrid columns={3} gap={3}>
              {galleryTiles.map((url, i) => (
                <Box
                  key={`${url || "empty"}-${i}`}
                  position="relative"
                  h={{ base: "100px", md: "160px" }}
                  borderRadius="8px"
                  overflow="hidden"
                  bg="gray.100"
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={`Gallery image ${i + 1}`}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center",
                        display: "block",
                      }}
                    />
                  ) : (
                    <Box
                      position="absolute"
                      inset={0}
                      borderWidth="1px"
                      borderStyle="dashed"
                      borderColor="gray.300"
                      borderRadius="8px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontSize="xs" color="gray.400">
                        Empty
                      </Text>
                    </Box>
                  )}
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
