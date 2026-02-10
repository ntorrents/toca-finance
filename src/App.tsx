import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Home } from "@/pages/Home";
import { Dashboard } from "@/pages/Dashboard";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  console.warn("Falta VITE_CLERK_PUBLISHABLE_KEY en el entorno.");
}

function App() {
  return (
    <ClerkProvider publishableKey={publishableKey ?? ""}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}

export default App;
