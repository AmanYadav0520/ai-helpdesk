import { useEffect, useState } from "react";
import { APITester } from "./APITester";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

const API_ORIGIN = process.env.BUN_PUBLIC_API_URL ?? "http://localhost:3001";

export function App() {
  const [healthMessage, setHealthMessage] = useState("Checking API health...");

  useEffect(() => {
    fetch(`${API_ORIGIN}/api/health`)
      .then(res => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then(data => setHealthMessage(`API status: ${data.status}`))
      .catch(err => setHealthMessage(`API health check failed: ${err.message}`));
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-8 text-center relative z-10">
      <div className="flex justify-center items-center gap-8 mb-8">
        <img
          src={logo}
          alt="Bun Logo"
          className="h-24 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa] scale-120"
        />
        <img
          src={reactLogo}
          alt="React Logo"
          className="h-24 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] animate-[spin_20s_linear_infinite]"
        />
      </div>

      <h1 className="text-5xl font-bold my-4 leading-tight">Bun + React</h1>
      <p>
        Edit <code className="bg-[#1a1a1a] px-2 py-1 rounded font-mono">src/App.tsx</code> and save to test HMR
      </p>
      <p className="mt-4 font-mono">{healthMessage}</p>
      <APITester />
    </div>
  );
}

export default App;
