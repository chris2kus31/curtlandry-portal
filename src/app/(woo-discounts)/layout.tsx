// src/app/(woo-discounts)/layout.tsx
import { AppLayout } from "@/components/layouts";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function WooDiscountsLayout({
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
