import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../lib/auth-client";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="text-center mt-16 font-mono">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
