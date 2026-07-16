import { useSession } from "../lib/auth-client";

export function Home() {
  const { data: session } = useSession();

  return (
    <div className="max-w-7xl mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold mb-8">Welcome to the dashboard, {session?.user.name}!</h1>
    </div>
  );
}
