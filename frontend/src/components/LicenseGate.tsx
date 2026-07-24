import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useAuth } from "../auth";
import License from "../pages/License";
import LanguageSwitcher from "./LanguageSwitcher";

/** Гейт лицензии: если ECG_REQUIRE_LICENSE и устройство не активировано —
 *  блокирует всё приложение и показывает экран активации (для админа) или
 *  просьбу обратиться к администратору. */
export default function LicenseGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [state, setState] = useState<"loading" | "ok" | "blocked">("loading");

  useEffect(() => {
    api
      .get("/license/status")
      .then((s) => setState(!s.require_license || s.status === "active" ? "ok" : "blocked"))
      .catch(() => setState("ok")); // при ошибке не блокируем
  }, []);

  if (state === "loading") return null;
  if (state === "ok") return <>{children}</>;

  // Заблокировано — экран активации.
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-semibold text-amber-600">
            🔒 {t("licenseGate.title")}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-40">
              <LanguageSwitcher />
            </div>
            <button className="btn-ghost" onClick={logout}>
              {t("nav.logout")}
            </button>
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          {t("licenseGate.desc")}
        </p>
        {user?.role === "admin" ? (
          <License />
        ) : (
          <div className="card text-slate-600 dark:text-slate-300">
            {t("licenseGate.contactAdmin")}
          </div>
        )}
      </div>
    </div>
  );
}
