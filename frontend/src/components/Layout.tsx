import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import IdleTimeout from "./IdleTimeout";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "block rounded-xl px-3 py-2 text-sm font-medium transition " +
        (isActive
          ? "bg-clinic-600 text-white"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700")
      }
    >
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  return (
    <div className="flex min-h-screen">
      <IdleTimeout />
      {/* Левый сайдбар */}
      <aside className="flex w-64 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        {/* Верхний левый угол: статус пользователя + выход */}
        <div className="rounded-xl bg-clinic-50 p-3 dark:bg-slate-700/40">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t("app.title")}
          </div>
          <div className="mt-1 flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold">{user?.full_name || user?.username}</div>
              <div className="text-xs uppercase tracking-wide text-clinic-700 dark:text-clinic-400">
                {user?.role}
              </div>
            </div>
            <button
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-slate-600"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              ⎋ {t("nav.logout")}
            </button>
          </div>
        </div>

        <LanguageSwitcher />

        <nav className="flex flex-1 flex-col gap-1">
          <NavItem to="/patients" label={t("nav.patients")} />
          <NavItem to="/analyze" label={t("nav.analyze")} />
          {isAdmin && (
            <>
              <div className="mt-3 px-3 text-xs uppercase text-slate-400">admin</div>
              <NavItem to="/dashboard" label={t("nav.dashboard")} />
              <NavItem to="/users" label={t("nav.users")} />
              <NavItem to="/logs/login" label={t("nav.loginLog")} />
              <NavItem to="/logs/audit" label={t("nav.auditLog")} />
              <NavItem to="/license" label={t("nav.license")} />
            </>
          )}
          <div className="mt-3 px-3 text-xs uppercase text-slate-400">
            {user?.username}
          </div>
          <NavItem to="/signature" label={t("nav.signature")} />
          <NavItem to="/change-password" label={t("nav.changePassword")} />
        </nav>

        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </aside>

      {/* Центральная рабочая область */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
