import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import LicenseGate from "./components/LicenseGate";
import Login from "./pages/Login";
import Patients from "./pages/Patients";
import Analyze from "./pages/Analyze";
import Logs from "./pages/Logs";
import Dashboard from "./pages/Dashboard";
import License from "./pages/License";
import ChangePassword from "./pages/ChangePassword";
import Users from "./pages/Users";
import Signature from "./pages/Signature";

function Protected({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) return <div className="p-8">{t("common.loading")}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/patients" replace />;
  return <>{children}</>;
}

function Router() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <LicenseGate>
              <Layout />
            </LicenseGate>
          </Protected>
        }
      >
        <Route index element={<Navigate to="/patients" replace />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/signature" element={<Signature />} />
        <Route
          path="/dashboard"
          element={
            <Protected adminOnly>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/users"
          element={
            <Protected adminOnly>
              <Users />
            </Protected>
          }
        />
        <Route
          path="/logs/login"
          element={
            <Protected adminOnly>
              <Logs kind="login" />
            </Protected>
          }
        />
        <Route
          path="/logs/audit"
          element={
            <Protected adminOnly>
              <Logs kind="audit" />
            </Protected>
          }
        />
        <Route
          path="/license"
          element={
            <Protected adminOnly>
              <License />
            </Protected>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AuthProvider>
  );
}
