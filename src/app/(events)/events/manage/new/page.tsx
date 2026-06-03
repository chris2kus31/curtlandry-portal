"use client";

import { EventForm } from "@/components/events/EventForm";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function NewEventPage() {
  return (
    <ProtectedRoute requiredPermissions={["events.manage"]}>
      <EventForm mode="create" />
    </ProtectedRoute>
  );
}
