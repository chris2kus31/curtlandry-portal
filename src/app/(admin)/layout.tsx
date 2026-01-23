// src/app/(admin)/layout.tsx
import { AppLayout } from "@/components/layouts";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={["super_admin"]}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
