"use client";

import { Badge, Box, Heading, HStack, Link, Text, VStack } from "@chakra-ui/react";
import { LuReceipt } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import type {
  AdminApplicationPayment,
  PaymentLedgerStatus,
} from "@/lib/api/admin-applications-service";
import { formatCurrency } from "./format";

const PAYMENT_STATUS_COLORS: Record<PaymentLedgerStatus, string> = {
  pending: "orange",
  paid: "green",
  expired: "gray",
  partially_refunded: "purple",
  refunded: "purple",
};

/**
 * Every Stripe Checkout link minted for this application (primary and
 * guests), newest first. Payments created before group registrations
 * shipped aren't in the ledger — the primary's money summary in the
 * payment panel still covers those.
 */
export function PaymentHistory({ payments }: { payments: AdminApplicationPayment[] }) {
  const surfaceBg = useColorModeValue("white", "gray.900");
  const rowBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const subduedText = useColorModeValue("gray.600", "gray.400");

  if (payments.length === 0) return null;

  return (
    <Box bg={surfaceBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={4}>
      <HStack mb={3}>
        <LuReceipt />
        <Heading size="sm">Payment links</Heading>
      </HStack>
      <VStack align="stretch" gap={2}>
        {payments.map((p) => {
          const when = p.paid_at ?? p.expired_at ?? p.created_at;
          return (
            <Box key={p.id} bg={rowBg} borderWidth={1} borderColor={borderColor} borderRadius="md" p={3}>
              <HStack justify="space-between" align="flex-start" gap={2}>
                <Box minW={0}>
                  <Text fontSize="sm" fontWeight={600} truncate>
                    {p.items.map((i) => i.label).join(", ") || "Payment"}
                  </Text>
                  <Text fontSize="xs" color={subduedText}>
                    {when ? new Date(when).toLocaleString() : "—"}
                    {p.recipient_type === "guest" ? " · sent to guest" : " · sent to applicant"}
                  </Text>
                </Box>
                <VStack align="flex-end" gap={1}>
                  <Badge
                    colorPalette={PAYMENT_STATUS_COLORS[p.status]}
                    variant="subtle"
                    px={2}
                    textTransform="uppercase"
                  >
                    {p.status_label}
                  </Badge>
                  <Text fontSize="sm" fontWeight={500}>
                    {formatCurrency(p.amount_paid_cents ?? p.amount_total_cents, p.currency)}
                  </Text>
                  {(p.amount_refunded_cents ?? 0) > 0 && (
                    <Text fontSize="xs" color={subduedText}>
                      Refunded {formatCurrency(p.amount_refunded_cents ?? 0, p.currency)}
                    </Text>
                  )}
                </VStack>
              </HStack>
              {p.status === "pending" && p.checkout_url && (
                <Link href={p.checkout_url} target="_blank" rel="noreferrer" fontSize="xs" color="brand.500">
                  Open checkout link
                </Link>
              )}
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
