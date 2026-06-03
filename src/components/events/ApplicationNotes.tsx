"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Spacer,
  Text,
  Textarea,
  VStack,
  chakra,
} from "@chakra-ui/react";
import { LuPin, LuPlus, LuTrash2 } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminApplicationNote,
} from "@/lib/api/admin-applications-service";

interface Props {
  applicationId: string;
  notes: AdminApplicationNote[];
  onNotesChanged: (notes: AdminApplicationNote[]) => void;
}

/**
 * Internal-only notes panel. Sits in the right rail of the detail page.
 * Composer is collapsed by default; expands on click so the rail stays
 * scannable when reviewers are just reading.
 */
export function ApplicationNotes({ applicationId, notes, onNotesChanged }: Props) {
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const subduedText = useColorModeValue("gray.600", "gray.400");
  const cardBg = useColorModeValue("white", "gray.900");
  const noteBg = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const pinAccent = useColorModeValue("amber.700", "amber.300");

  const handleAdd = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const note = await adminApplicationsService.addNote(applicationId, {
        body: body.trim(),
        is_pinned: pinned,
      });
      onNotesChanged([note, ...notes]);
      setBody("");
      setPinned(false);
      setComposerOpen(false);
      toaster.success({ title: "Note added." });
    } catch (err) {
      console.error(err);
      toaster.error({ title: "Failed to add note." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    try {
      await adminApplicationsService.deleteNote(applicationId, id);
      onNotesChanged(notes.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
      toaster.error({ title: "Failed to delete note." });
    }
  };

  // Pinned notes float to the top; remainder retains creation order.
  const ordered = [...notes].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));

  return (
    <Box bg={cardBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={4}>
      <HStack mb={3}>
        <Heading size="sm">Internal Notes</Heading>
        <Spacer />
        {!composerOpen && (
          <Button
            size="xs"
            px={4}
            variant="ghost"
            onClick={() => setComposerOpen(true)}
          >
            <LuPlus /> Add note
          </Button>
        )}
      </HStack>

      {composerOpen && (
        <VStack align="stretch" gap={2} mb={4}>
          <Textarea
            placeholder="Internal note — applicants never see this."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            px={4}
          />
          <HStack>
            <chakra.label display="flex" alignItems="center" gap={2} fontSize="xs" color={subduedText}>
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              Pin to top
            </chakra.label>
            <Spacer />
            <Button size="xs" px={4} variant="ghost" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button
              size="xs"
              px={4}
              colorPalette="brand"
              onClick={handleAdd}
              loading={submitting}
              disabled={!body.trim()}
            >
              Save note
            </Button>
          </HStack>
        </VStack>
      )}

      {ordered.length === 0 ? (
        <Text fontSize="sm" color={subduedText}>
          No notes yet.
        </Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {ordered.map((n) => (
            <Box
              key={n.id}
              bg={noteBg}
              borderWidth={1}
              borderColor={borderColor}
              borderRadius="md"
              p={3}
            >
              <Flex align="center" gap={2} mb={1}>
                {n.is_pinned && <LuPin size={12} color={pinAccent} />}
                <Text fontSize="xs" color={subduedText}>
                  {n.author?.name ?? "Unknown"} ·{" "}
                  {n.created_at ? new Date(n.created_at).toLocaleString() : "—"}
                </Text>
                <Spacer />
                <IconButton
                  aria-label="Delete note"
                  size="2xs"
                  variant="ghost"
                  onClick={() => handleDelete(n.id)}
                >
                  <LuTrash2 size={12} />
                </IconButton>
              </Flex>
              <Text whiteSpace="pre-wrap" fontSize="sm">
                {n.body}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}
