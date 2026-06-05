import { AppLayout } from "@/components/layouts";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

/**
 * The /events/* portal subtree (applications review + future event mgmt).
 * Anyone with the `applications.review` permission can enter; ProtectedRoute
 * also gracefully handles unauth/loading states.
 */
export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredPermissions={["applications.review"]}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
