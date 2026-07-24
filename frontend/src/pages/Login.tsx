import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Disclaimer from "../components/Disclaimer";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    setInfo("");
    try {
      if (mode === "register") {
        const u = await api.post("/auth/register", {
          username,
          password,
          full_name: fullName,
        });
        // Первый пользователь — админ, входит сразу. Остальные ждут подтверждения.
        if (u.role !== "admin") {
          setMode("login");
          setInfo(t("auth.pendingApproval"));
          setPassword("");
          setBusy(false);
          return;
        }
      }
      await login(username, password);
      navigate("/patients");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <div className="w-40">
            <LanguageSwitcher />
          </div>
        </div>
        <div className="card">
          <h1 className="mb-1 text-2xl font-bold text-clinic-700 dark:text-clinic-400">
            {t("app.title")}
          </h1>
          <p className="mb-4 text-sm text-slate-500">
            {mode === "register" ? t("auth.register") : t("auth.login")}
          </p>

          <Disclaimer />

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">{t("auth.username")}</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>
            {mode === "register" && (
              <div>
                <label className="label">{t("auth.fullName")}</label>
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="label">{t("auth.password")}</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {mode === "register" && (
              <p className="text-xs text-slate-500">{t("auth.firstUserAdmin")}</p>
            )}
            {info && (
              <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:bg-teal-900/20 dark:text-teal-300">
                {info}
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <button className="btn-primary w-full" disabled={busy}>
              {mode === "register" ? t("auth.createAccount") : t("auth.signIn")}
            </button>
          </form>

          <button
            className="mt-3 w-full text-center text-sm text-clinic-600 hover:underline"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
