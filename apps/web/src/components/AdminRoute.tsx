import { Navigate, Outlet } from "react-router-dom";
import { Role } from "core/constants/role";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "../lib/auth-client";

export function AdminRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (session?.user.role !== Role.admin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
