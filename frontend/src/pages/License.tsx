import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";

interface LicenseStatus {
  status: string;
  message: string;
  fingerprint: string;
  expires_at: string | null;
  require_license: boolean;
  license_path: string;
}

export default function License() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [code, setCode] = useState("");
  const [requestBlob, setRequestBlob] = useState("");
  const [licenseBlob, setLicenseBlob] = useState("");
  const [msg, setMsg] = useState("");

  function refresh() {
    api.get("/license/status").then(setStatus);
  }
  useEffect(refresh, []);

  async function makeRequest() {
    const r = await api.post("/license/activation-request", { activation_code: code });
    setRequestBlob(r.request_blob);
  }

  async function activate() {
    setMsg("");
    try {
      const r = await api.post("/license/activate", { license_blob: licenseBlob });
      setMsg(r.message);
      api.get("/license/status").then(setStatus);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("common.error"));
    }
  }

  const statusColor =
    status?.status === "active"
      ? "text-teal-600"
      : status?.status === "unlicensed"
        ? "text-slate-500"
        : "text-red-600";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t("nav.license")}</h1>

      {status && (
        <div className="card mb-4">
          <div className={"text-lg font-semibold " + statusColor}>
            {status.status.toUpperCase()}
          </div>
          <p className="text-sm text-slate-500">{status.message}</p>
          {status.expires_at && (
            <p className="mt-1 text-sm">
              {t("license.expires")}:{" "}
              <span className="font-medium">
                {new Date(status.expires_at).toLocaleDateString()}
              </span>
            </p>
          )}
          <div className="mt-3 text-xs">
            <div className="text-slate-400">{t("license.fingerprint")}:</div>
            <code className="break-all text-slate-600 dark:text-slate-300">
              {status.fingerprint}
            </code>
          </div>
        </div>
      )}

      {/* Простой файловый способ (без формы) */}
      {status && status.status !== "active" && (
        <div className="card mb-4 space-y-2 border border-clinic-100 bg-clinic-50/50 dark:border-slate-700 dark:bg-slate-700/20">
          <h2 className="font-semibold">{t("license.fileWay")}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("license.fileWayHint")}
          </p>
          <code className="block break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status.license_path}
          </code>
          <button className="btn-primary" onClick={refresh}>
            {t("license.recheck")}
          </button>
        </div>
      )}

      {/* Онлайн-активация (вставка кода) — необязательно */}
      <div className="card mb-4 space-y-3">
        <h2 className="font-semibold">{t("license.step1")}</h2>
        <input
          className="input"
          placeholder={t("license.codePlaceholder")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="btn-primary" onClick={makeRequest} disabled={!code}>
          {t("license.generate")}
        </button>
        {requestBlob && (
          <textarea className="input min-h-[100px] text-xs" readOnly value={requestBlob} />
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">{t("license.step2")}</h2>
        <textarea
          className="input min-h-[100px] text-xs"
          placeholder={t("license.pastePlaceholder")}
          value={licenseBlob}
          onChange={(e) => setLicenseBlob(e.target.value)}
        />
        <button className="btn-primary" onClick={activate} disabled={!licenseBlob}>
          {t("license.activate")}
        </button>
        {msg && <p className="text-sm">{msg}</p>}
      </div>
    </div>
  );
}
