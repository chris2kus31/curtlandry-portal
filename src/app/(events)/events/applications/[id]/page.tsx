"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Skeleton,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  LuArrowLeft,
  LuMail,
  LuRefreshCw,
  LuShuffle,
} from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminApplicationDetail,
  type AdminTimelineEntry,
  type ApplicationStatus,
} from "@/lib/api/admin-applications-service";
import { StatusBadge } from "@/components/events/StatusBadge";
import { ApplicationResponses } from "@/components/events/ApplicationResponses";
import { ApplicationNotes } from "@/components/events/ApplicationNotes";
import { ApplicationTimeline } from "@/components/events/ApplicationTimeline";
import { StatusChangeModal } from "@/components/events/StatusChangeModal";
import { AdminEmailModal } from "@/components/events/AdminEmailModal";

/**
 * Application detail page. Lays out applicant info + responses on the left
 * column, with timeline + notes + action panel on the right. Every action
 * (status change, email) updates the detail object in place so the timeline
 * picks up the new entry without a full reload.
 */
export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [detail, setDetail] = useState<AdminApplicationDetail | null>(null);
  const [timeline, setTimeline] = useState<AdminTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusInitialTo, setStatusInitialTo] = useState<ApplicationStatus | undefined>();
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const surfaceBg = useColorModeValue("white", "gray.900");
  const subduedText = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const pageBg = useColorModeValue("gray.50", "gray.950");

  const refetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [d, t] = await Promise.all([
        adminApplicationsService.getApplication(id),
        adminApplicationsService.getTimeline(id),
      ]);
      setDetail(d);
      setTimeline(t);
    } catch (err) {
      console.error(err);
      toaster.error({ title: "Failed to load application." });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  const handleStatusChanged = (next: AdminApplicationDetail) => {
    setDetail(next);
    // Pull the freshest timeline so the new "status_changed" entry shows up.
    if (id) adminApplicationsService.getTimeline(id).then(setTimeline).catch(() => {});
  };

  const handleEmailSent = () => {
    if (id) adminApplicationsService.getTimeline(id).then(setTimeline).catch(() => {});
  };

  if (loading && !detail) {
    return (
      <Box p={{ base: 4, md: 8 }} bg={pageBg} minH="100vh">
        <Skeleton height="32px" width="320px" mb={4} />
        <Skeleton height="200px" mb={4} />
        <Skeleton height="400px" />
      </Box>
    );
  }

  if (!detail) {
    return (
      <Box p={8}>
        <Text>Application not found.</Text>
        <Button mt={4} px={4} onClick={() => router.push("/events/applications")}>
          Back to queue
        </Button>
      </Box>
    );
  }

  const applicantName = [detail.first_name, detail.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <Box bg={pageBg} minH="100vh">
      {/* Header */}
      <Box bg={surfaceBg} borderBottomWidth={1} borderBottomColor={borderColor} px={{ base: 4, md: 8 }} py={4}>
        <HStack gap={4}>
          <NextLink href="/events/applications" passHref>
            <IconButton aria-label="Back to queue" size="sm" variant="ghost">
              <LuArrowLeft />
            </IconButton>
          </NextLink>
          <Box>
            <Heading size="lg">{applicantName || "Application"}</Heading>
            <HStack mt={1} gap={3}>
              <StatusBadge status={detail.status} />
              <Text fontSize="sm" color={subduedText}>
                {detail.reference_number} · {detail.event?.name ?? "—"}
              </Text>
            </HStack>
          </Box>
          <Spacer />
          <Button
            size="sm"
            px={4}
            variant="outline"
            onClick={() => setEmailModalOpen(true)}
          >
            <LuMail /> Email applicant
          </Button>
          <Button
            size="sm"
            px={4}
            colorPalette="brand"
            onClick={() => {
              setStatusInitialTo(undefined);
              setStatusModalOpen(true);
            }}
          >
            <LuShuffle /> Change status
          </Button>
          <IconButton aria-label="Refresh" size="sm" variant="ghost" onClick={() => refetchAll()}>
            <LuRefreshCw />
          </IconButton>
        </HStack>
      </Box>

      <Box p={{ base: 4, md: 8 }}>
        <SimpleGrid columns={{ base: 1, xl: 3 }} gap={6}>
          {/* Left two-thirds */}
          <Box gridColumn={{ xl: "span 2" }}>
            <VStack align="stretch" gap={6}>
              {/* Applicant info */}
              <Box bg={surfaceBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={5}>
                <Heading size="sm" mb={4}>
                  Applicant
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field label="Name" value={applicantName || "—"} />
                  <Field label="Email" value={detail.email ?? "—"} />
                  <Field label="Phone" value={detail.phone ?? "—"} />
                  <Field
                    label="Submitted"
                    value={
                      detail.timestamps.submitted_at
                        ? new Date(detail.timestamps.submitted_at).toLocaleString()
                        : "—"
                    }
                  />
                </SimpleGrid>
              </Box>

              {/* Responses */}
              <Box>
                <Heading size="sm" mb={3}>
                  Application Responses
                </Heading>
                <ApplicationResponses
                  schema={detail.event?.application_schema ?? null}
                  formData={detail.form_data ?? {}}
                />
              </Box>
            </VStack>
          </Box>

          {/* Right rail */}
          <VStack align="stretch" gap={6}>
            {/* Quick actions */}
            <Box bg={surfaceBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={4}>
              <Heading size="sm" mb={3}>
                Quick actions
              </Heading>
              <VStack align="stretch" gap={2}>
                {detail.allowed_transitions.slice(0, 4).map((t) => (
                  <Button
                    key={t.value}
                    size="sm"
                    px={4}
                    variant="outline"
                    onClick={() => {
                      setStatusInitialTo(t.value);
                      setStatusModalOpen(true);
                    }}
                  >
                    Move to {t.label}
                  </Button>
                ))}
                {detail.allowed_transitions.length === 0 && (
                  <Text fontSize="sm" color={subduedText}>
                    No transitions available from this status.
                  </Text>
                )}
              </VStack>
            </Box>

            <ApplicationNotes
              applicationId={detail.id}
              notes={detail.notes}
              onNotesChanged={(notes) => setDetail({ ...detail, notes })}
            />

            <ApplicationTimeline entries={timeline} />
          </VStack>
        </SimpleGrid>
      </Box>

      {/* Modals */}
      <StatusChangeModal
        application={detail}
        open={statusModalOpen}
        initialTo={statusInitialTo}
        onClose={() => setStatusModalOpen(false)}
        onChanged={handleStatusChanged}
      />
      <AdminEmailModal
        applicationId={detail.id}
        applicantName={applicantName || null}
        applicantEmail={detail.email ?? null}
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSent={handleEmailSent}
      />
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const subduedText = useColorModeValue("gray.600", "gray.400");
  return (
    <Box>
      <Text fontSize="xs" color={subduedText} textTransform="uppercase" letterSpacing="wide" mb={1}>
        {label}
      </Text>
      <Text>{value}</Text>
    </Box>
  );
}
