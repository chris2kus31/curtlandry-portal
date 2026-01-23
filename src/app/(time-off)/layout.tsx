// src/app/(time-off)/layout.tsx
import { AppLayout } from "@/components/layouts";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function TimeOffLayout({
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
