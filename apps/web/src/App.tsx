import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
