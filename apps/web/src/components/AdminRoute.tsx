import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../lib/auth-client";

export function AdminRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="text-center mt-16 font-mono">Loading...</div>;
  }

  if (session?.user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
