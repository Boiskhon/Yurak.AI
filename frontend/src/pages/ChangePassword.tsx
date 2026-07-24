import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";

export default function ChangePassword() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api.post("/auth/change-password", {
        current_password: current,
        new_password: next,
      });
      setOk(true);
      setMsg("✓");
      setCurrent("");
      setNext("");
    } catch (err) {
      setOk(false);
      setMsg(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">{t("nav.changePassword")}</h1>
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label">{t("auth.currentPassword")}</label>
          <input
            className="input"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">{t("auth.newPassword")}</label>
          <input
            className="input"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </div>
        {msg && (
          <p className={ok ? "text-sm text-teal-600" : "text-sm text-red-600"}>{msg}</p>
        )}
        <button className="btn-primary w-full">{t("patients.save")}</button>
      </form>
    </div>
  );
}
