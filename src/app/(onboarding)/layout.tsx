// src/app/(onboarding)/layout.tsx
import { AppLayout } from "@/components/layouts";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function OnboardingLayout({
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
