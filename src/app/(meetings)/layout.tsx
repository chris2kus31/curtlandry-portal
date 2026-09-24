// src/app/(meetings)/layout.tsx
import { AppLayout } from "@/components/layouts";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function MeetingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
