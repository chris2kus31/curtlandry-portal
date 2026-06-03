"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Input,
  Portal,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import { adminApplicationsService } from "@/lib/api/admin-applications-service";

interface Props {
  applicationId: string | null;
  applicantName: string | null;
  applicantEmail: string | null;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

/**
 * Free-form admin → applicant email. Used for clarifying questions,
 * coordinating logistics, etc. — anything outside the canned lifecycle
 * emails attached to status transitions.
 */
export function AdminEmailModal({
  applicationId,
  applicantName,
  applicantEmail,
  open,
  onClose,
  onSent,
}: Props) {
  const subduedText = useColorModeValue("gray.600", "gray.400");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject("");
      setBody("");
    }
  }, [open]);

  const handleSend = async () => {
    if (!applicationId || !subject.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      await adminApplicationsService.sendEmail(applicationId, {
        subject: subject.trim(),
        body: body.trim(),
      });
      toaster.success({ title: "Email queued for delivery." });
      onSent?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to send email.";
      toaster.error({ title: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(d) => !d.open && onClose()}
      size="lg"
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner padding={4}>
          <Dialog.Content maxW="640px" w="full" mx={4} borderRadius="xl">
            <Dialog.Header px={6} pt={6} pb={2}>
              <Dialog.Title fontSize="lg" fontWeight={700}>
                Email applicant
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={3} right={3} asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={6} py={4}>
              <VStack align="stretch" gap={4}>
                <Box>
                  <Text fontSize="xs" color={subduedText} textTransform="uppercase" mb={1}>
                    To
                  </Text>
                  <Text>
                    {applicantName ?? "—"}{" "}
                    <Text as="span" color={subduedText}>
                      ({applicantEmail ?? "—"})
                    </Text>
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color={subduedText} mb={1} textTransform="uppercase">
                    Subject
                  </Text>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Quick question about your application"
                    maxLength={160}
                    px={4}
                  />
                </Box>

                <Box>
                  <Text fontSize="xs" color={subduedText} mb={1} textTransform="uppercase">
                    Message
                  </Text>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={10}
                    placeholder="Plain text — line breaks are preserved. Your name and email will be appended automatically as the reply-to."
                    px={4}
                  />
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer px={6} pb={6} pt={2} gap={3}>
              <Button variant="ghost" onClick={onClose} px={4}>
                Cancel
              </Button>
              <Button
                colorPalette="brand"
                onClick={handleSend}
                disabled={!subject.trim() || !body.trim()}
                loading={submitting}
                px={4}
              >
                Send email
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
