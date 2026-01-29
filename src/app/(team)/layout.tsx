// src/app/(team)/layout.tsx
import { AppLayout } from "@/components/layouts";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiresDirectReports>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
