"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Skeleton, Text, VStack } from "@chakra-ui/react";
import { EventForm } from "@/components/events/EventForm";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toaster } from "@/components/ui/toaster";
import {
  adminApplicationsService,
  type AdminEvent,
} from "@/lib/api/admin-applications-service";

export default function EditEventPage() {
  return (
    <ProtectedRoute requiredPermissions={["events.manage"]}>
      <EditEventBody />
    </ProtectedRoute>
  );
}

function EditEventBody() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ev = await adminApplicationsService.getEvent(id);
        if (!cancelled) setEvent(ev);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Event not found.");
          toaster.error({ title: "Failed to load event." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Box p={{ base: 4, md: 8 }}>
        <VStack align="stretch" gap={4}>
          <Skeleton height="40px" width="320px" />
          <Skeleton height="200px" />
          <Skeleton height="200px" />
        </VStack>
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Box p={8}>
        <Text>{error ?? "Event not found."}</Text>
      </Box>
    );
  }

  return <EventForm mode="update" initial={event} />;
}
