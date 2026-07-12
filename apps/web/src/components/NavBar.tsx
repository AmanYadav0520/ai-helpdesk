import { Link, useNavigate } from "react-router-dom";
import { authClient, useSession } from "../lib/auth-client";

export function NavBar() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => navigate("/login"),
      },
    });
  };

  return (
    <header className="flex items-center justify-between bg-[#1a1a1a] border-b-2 border-[#fbf0df] px-6 py-4">
      <span className="font-bold text-[#fbf0df]">Help Desk</span>
      <div className="flex items-center gap-4">
        {session?.user.role === "admin" && (
          <Link to="/users" className="font-mono text-sm text-[#fbf0df] hover:underline">
            Users
          </Link>
        )}
        <span className="font-mono text-sm text-[#fbf0df]">{session?.user.name}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="bg-[#fbf0df] text-[#1a1a1a] border-0 px-4 py-1.5 rounded-lg font-bold text-sm transition-all duration-100 hover:bg-[#f3d5a3] hover:-translate-y-px cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
