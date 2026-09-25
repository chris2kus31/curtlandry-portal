"use client";

import { Box, Card, VStack, Text, HStack } from "@chakra-ui/react";
import Image from "next/image";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { HodGoogleLoginButton } from "@/components/auth/HodGoogleLoginButton";
import { ColorModeButton, useColorModeValue } from "@/components/ui/color-mode";

export function LoginForm() {
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const bgPrimary = useColorModeValue("gray.50", "gray.950");
  const domainHintBg = useColorModeValue("gray.50", "gray.800");

  return (
    <Box
      minH="100vh"
      bg={bgPrimary}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      position="relative"
      overflow="hidden"
    >
      {/* Background decoration */}
      <Box
        position="absolute"
        top="-20%"
        right="-10%"
        width="600px"
        height="600px"
        borderRadius="full"
        bg="linear-gradient(135deg, rgba(0, 188, 139, 0.1) 0%, rgba(0, 149, 193, 0.1) 100%)"
        filter="blur(80px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-20%"
        left="-10%"
        width="500px"
        height="500px"
        borderRadius="full"
        bg="linear-gradient(135deg, rgba(109, 40, 145, 0.08) 0%, rgba(205, 41, 7, 0.08) 100%)"
        filter="blur(80px)"
        pointerEvents="none"
      />

      {/* Color mode toggle */}
      <Box position="absolute" top={4} right={4} zIndex={10}>
        <ColorModeButton />
      </Box>

      <Card.Root
        maxW="480px"
        w="full"
        bg={cardBg}
        shadow="xl"
        borderRadius="2xl"
        border="1px solid"
        borderColor={borderColor}
        p={{ base: 6, md: 10 }}
        position="relative"
        zIndex={1}
        className="animate-slide-up"
      >
        <Card.Body>
          <VStack gap={8} w="full">
            {/* Logo */}
            <Box position="relative" width="200px" height="60px">
              <Image
                src="/curtlandrylogo.svg"
                alt="Curt Landry Ministries"
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            </Box>

            {/* Header */}
            <VStack gap={2} textAlign="center">
              <Text
                as="h1"
                fontSize={{ base: "xl", md: "2xl" }}
                fontWeight="bold"
                color={textPrimary}
              >
                Welcome to CLM Portal
              </Text>
              <Text color={textSecondary} fontSize="md">
                Sign in with your staff account
              </Text>
            </VStack>

            {/* Sign In Options */}
            <VStack w="full" gap={5}>
              {/* CurtLandry Option */}
              <Box w="full">
                <Box
                  bg={domainHintBg}
                  px={3}
                  py={1.5}
                  borderRadius="md"
                  mb={2}
                >
                  <Text fontSize="xs" color={textSecondary} fontWeight="medium">
                    For @curtlandry.com accounts
                  </Text>
                </Box>
                <GoogleLoginButton />
              </Box>

              {/* Divider */}
              <HStack w="full" gap={4}>
                <Box flex={1} h="1px" bg={borderColor} />
                <Text
                  fontSize="xs"
                  color={textSecondary}
                  textTransform="uppercase"
                  letterSpacing="wider"
                  fontWeight="medium"
                >
                  or
                </Text>
                <Box flex={1} h="1px" bg={borderColor} />
              </HStack>

              {/* House of David Option */}
              <Box w="full">
                <Box
                  bg={domainHintBg}
                  px={3}
                  py={1.5}
                  borderRadius="md"
                  mb={2}
                >
                  <Text fontSize="xs" color={textSecondary} fontWeight="medium">
                    For @houseofdavid.us accounts
                  </Text>
                </Box>
                <HodGoogleLoginButton />
              </Box>
            </VStack>

            {/* Footer text */}
            <VStack gap={1} textAlign="center">
              <Text fontSize="xs" color={textSecondary}>
                Contact IT if you need assistance
              </Text>
            </VStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
