// src/app/(team)/layout.tsx
import { AppLayout } from "@/components/layouts";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={["manager", "admin", "super_admin"]}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
