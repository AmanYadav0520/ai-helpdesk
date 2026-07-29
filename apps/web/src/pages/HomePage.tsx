import { useSession } from "../lib/auth-client";
import { DashboardStats } from "./DashboardStats";

export function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome back, {session?.user.name}!</h1>
      <DashboardStats />
    </div>
  );
}
