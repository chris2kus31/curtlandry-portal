"use client";

import { Box, VStack, Text, Button } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useColorModeValue } from "@/components/ui/color-mode";

export default function ForbiddenPage() {
  const router = useRouter();
  const bg = useColorModeValue("gray.50", "gray.950");
  const cardBg = useColorModeValue("white", "gray.900");
  const textPrimary = useColorModeValue("gray.900", "gray.50");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Box
      minH="100vh"
      bg={bg}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Box
        bg={cardBg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="2xl"
        shadow="lg"
        p={{ base: 8, md: 12 }}
        maxW="480px"
        w="full"
      >
        <VStack gap={6} textAlign="center">
          <Box
            w="16"
            h="16"
            bg="red.100"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="2xl" color="red.500">
              403
            </Text>
          </Box>

          <VStack gap={2}>
            <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
              Access Denied
            </Text>
            <Text fontSize="sm" color={textSecondary}>
              You don&apos;t have permission to view this page. If you believe
              this is an error, contact your administrator.
            </Text>
          </VStack>

          <Button
            colorScheme="brand"
            onClick={() => router.push("/dashboard")}
            size="lg"
            w="full"
          >
            Go to Dashboard
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}
