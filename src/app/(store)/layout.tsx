// src/app/(store)/layout.tsx
import { AppLayout } from "@/components/layouts";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={["super_admin", "admin"]}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
