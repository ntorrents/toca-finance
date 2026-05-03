import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Login } from "@/pages/Login";
import { PanelPage } from "@/pages/PanelPage";
import { GastosPage } from "@/pages/GastosPage";
import { AnalisisPage } from "@/pages/AnalisisPage";
import { ExtractosPage } from "@/pages/ExtractosPage";
import { SoportePage } from "@/pages/SoportePage";
import { AjustesPage } from "@/pages/AjustesPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/panel" replace />} />
          <Route path="panel" element={<PanelPage />} />
          <Route path="gastos" element={<GastosPage />} />
          <Route path="analisis" element={<AnalisisPage />} />
          <Route path="extractos" element={<ExtractosPage />} />
          <Route path="soporte" element={<SoportePage />} />
          <Route path="ajustes" element={<AjustesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/panel" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
