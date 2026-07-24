import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getToken } from "../api";

interface Row {
  id: number;
  username: string;
  action: string;
  success?: boolean;
  ip_address?: string;
  details?: string;
  entry_hash?: string;
  created_at: string;
}

export default function Logs({ kind }: { kind: "login" | "audit" }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [chain, setChain] = useState<{ intact: boolean; first_broken_id: number | null } | null>(null);

  useEffect(() => {
    const path = kind === "login" ? "/admin/login-log" : "/admin/audit-log";
    api.get(path).then(setRows);
    setChain(null);
  }, [kind]);

  async function verify() {
    const r = await api.get("/admin/audit-log/verify");
    setChain(r);
  }

  async function downloadPdf() {
    const path = kind === "login" ? "/api/admin/login-log/pdf" : "/api/admin/audit-log/pdf";
    const r = await fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!r.ok) {
      alert(t("common.error"));
      return;
    }
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = kind === "login" ? "login_log.pdf" : "audit_log.pdf";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {kind === "login" ? t("nav.loginLog") : t("nav.auditLog")}
        </h1>
        <div className="flex gap-2">
          {kind === "audit" && (
            <button className="btn-ghost" onClick={verify}>
              {t("logs.verifyChain")}
            </button>
          )}
          <button className="btn-primary" onClick={downloadPdf}>
            ⬇ PDF
          </button>
        </div>
      </div>

      {chain && (
        <div
          className={
            "mb-4 rounded-xl px-4 py-2 text-sm " +
            (chain.intact
              ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200")
          }
        >
          {chain.intact ? "✓ " + t("logs.chainIntact") : "✗ " + t("logs.chainBroken")}
        </div>
      )}

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
            <tr>
              <th className="p-3">{t("logs.date")}</th>
              <th className="p-3">{t("logs.user")}</th>
              <th className="p-3">{t("logs.action")}</th>
              {kind === "login" ? (
                <>
                  <th className="p-3">{t("logs.success")}</th>
                  <th className="p-3">{t("logs.ip")}</th>
                </>
              ) : (
                <th className="p-3">{t("logs.details")}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-slate-100 last:border-0 dark:border-slate-700/50"
              >
                <td className="p-3 whitespace-nowrap text-slate-500">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="p-3 font-medium">{r.username || "—"}</td>
                <td className="p-3">{r.action}</td>
                {kind === "login" ? (
                  <>
                    <td className="p-3">
                      {r.success ? "✓" : <span className="text-red-600">✗</span>}
                    </td>
                    <td className="p-3 text-slate-500">{r.ip_address || "—"}</td>
                  </>
                ) : (
                  <td className="p-3 text-slate-500">{r.details || "—"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
