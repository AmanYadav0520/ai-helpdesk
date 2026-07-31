import { Outlet } from "react-router-dom";
import { NavBar } from "./NavBar";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavBar />
      <main className="flex-1 animate-in-page">
        <Outlet />
      </main>
    </div>
  );
}

