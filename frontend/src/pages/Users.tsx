import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api, ApiError, getToken } from "../api";
import { useAuth } from "../auth";
import { SETTINGS_CHANGED_EVENT } from "../components/IdleTimeout";

interface User {
  id: number;
  username: string;
  full_name: string;
  role: "admin" | "doctor" | "technician";
  branch: string;
  is_active: boolean;
}

export default function Users() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);

  async function load() {
    setUsers(await api.get("/admin/users"));
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(u: User) {
    await api.patch(`/admin/users/${u.id}/active`);
    load();
  }
  async function remove(u: User) {
    if (!confirm(t("users.confirmDelete", { name: u.username }))) return;
    await api.del(`/admin/users/${u.id}`);
    load();
  }

  // Передача прав администратора (с повторным вводом пароля админа).
  async function transferAdmin(u: User) {
    const pwd = prompt(t("users.transferConfirm", { name: u.username }));
    if (!pwd) return;
    try {
      await api.post("/auth/transfer-admin", {
        target_user_id: u.id,
        current_password: pwd,
      });
      alert(t("users.transferDone"));
      // Текущий пользователь только что понижен до доктора — обновляем его роль
      // и уходим с админ-страницы, иначе все админ-запросы начнут падать 403.
      await refreshUser();
      navigate("/");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  // Логотип клиники.
  const logoInput = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<string | null>(null);
  function loadLogo() {
    fetch("/api/media/logo", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) =>
        setLogo((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(b);
        }),
      )
      .catch(() =>
        setLogo((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        }),
      );
  }
  useEffect(loadLogo, []);

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    await fetch("/api/media/logo", {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    loadLogo();
  }
  async function removeLogo() {
    await api.del("/media/logo");
    setLogo(null);
  }

  // Автовыход по неактивности (настройка админа).
  const [idleEnabled, setIdleEnabled] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(15);
  const [idleSaved, setIdleSaved] = useState(false);
  useEffect(() => {
    api.get("/settings").then((s) => {
      setIdleEnabled(s.idle_logout_enabled);
      setIdleMinutes(s.idle_logout_minutes);
    });
  }, []);
  async function saveIdle() {
    const s = await api.put("/settings", {
      idle_logout_enabled: idleEnabled,
      idle_logout_minutes: idleMinutes,
    });
    setIdleEnabled(s.idle_logout_enabled);
    setIdleMinutes(s.idle_logout_minutes);
    setIdleSaved(true);
    // Просим смонтированный IdleTimeout перечитать настройку сразу, без F5.
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
    setTimeout(() => setIdleSaved(false), 2000);
  }

  const roleLabel = (r: string) => t(`users.role_${r}`);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold">{t("users.title")}</h1>

      {/* Логотип клиники (в шапке PDF-отчёта) */}
      <div className="card mb-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="font-semibold">{t("users.clinicLogo")}</div>
          <p className="text-sm text-slate-500">{t("users.clinicLogoHint")}</p>
          <div className="mt-2 flex gap-2">
            <button className="btn-ghost" onClick={() => logoInput.current?.click()}>
              {t("users.uploadLogo")}
            </button>
            {logo && (
              <button className="btn-ghost text-red-600" onClick={removeLogo}>
                {t("users.delete", { defaultValue: t("patients.delete") })}
              </button>
            )}
          </div>
          <input
            ref={logoInput}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={uploadLogo}
          />
        </div>
        {logo && (
          <img
            src={logo}
            alt="logo"
            className="max-h-20 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700"
          />
        )}
      </div>

      {/* Автовыход по неактивности */}
      <div className="card mb-5 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={idleEnabled}
            onChange={(e) => setIdleEnabled(e.target.checked)}
          />
          <span className="font-medium">{t("settings.idleLogout")}</span>
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">{t("settings.idleMinutes")}:</span>
          <input
            type="number"
            min={1}
            max={240}
            className="input w-20 py-1"
            value={idleMinutes}
            disabled={!idleEnabled}
            onChange={(e) => setIdleMinutes(Number(e.target.value))}
          />
        </div>
        <button className="btn-primary" onClick={saveIdle}>
          {t("patients.save")}
        </button>
        {idleSaved && <span className="text-sm text-teal-600">✓</span>}
        <p className="w-full text-xs text-slate-400">{t("settings.idleHint")}</p>
      </div>

      {/* Регистрация — самостоятельная; админ подтверждает новые аккаунты. */}
      <div className="card mb-5 border border-clinic-100 bg-clinic-50/50 dark:border-slate-700 dark:bg-slate-700/20">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t("users.approvalHint")}
        </p>
      </div>

      {/* Список */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
            <tr>
              <th className="p-3">{t("auth.username")}</th>
              <th className="p-3">{t("auth.fullName")}</th>
              <th className="p-3">{t("users.roleLabel")}</th>
              <th className="p-3">{t("users.status")}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-slate-100 last:border-0 dark:border-slate-700/50"
              >
                <td className="p-3 font-medium">{u.username}</td>
                <td className="p-3">{u.full_name || "—"}</td>
                <td className="p-3">
                  <span
                    className={
                      "rounded-lg px-2 py-0.5 text-xs " +
                      (u.role === "admin"
                        ? "bg-clinic-100 text-clinic-800 dark:bg-clinic-800/40 dark:text-clinic-200"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")
                    }
                  >
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="p-3">
                  {u.is_active ? (
                    <span className="text-teal-600">● {t("users.active")}</span>
                  ) : (
                    <span className="text-amber-600">● {t("users.pending")}</span>
                  )}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  {u.role !== "admin" && (
                    <button
                      className="mr-3 text-clinic-600 hover:underline"
                      onClick={() => transferAdmin(u)}
                    >
                      {t("users.makeAdmin")}
                    </button>
                  )}
                  <button
                    className={
                      "mr-3 hover:underline " +
                      (u.is_active ? "text-slate-500" : "text-teal-600 font-medium")
                    }
                    onClick={() => toggle(u)}
                  >
                    {u.is_active ? t("users.disable") : t("users.approve")}
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => remove(u)}
                  >
                    {t("patients.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
