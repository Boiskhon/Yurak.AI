import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";

interface Stats {
  total_ecg_records: number;
  total_analyses: number;
  patients_with_ecg: number;
  load_by_user: { user: string; count: number }[];
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-3xl font-bold text-clinic-600">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get("/admin/dashboard").then(setStats);
  }, []);

  if (!stats) return <p>{t("common.loading")}</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold">{t("nav.dashboard")}</h1>
      <div className="grid grid-cols-3 gap-4">
        <Stat label={t("nav.analyze")} value={stats.total_analyses} />
        <Stat label={t("common.ecg")} value={stats.total_ecg_records} />
        <Stat label={t("nav.patients")} value={stats.patients_with_ecg} />
      </div>

      <div className="card mt-4">
        <h2 className="mb-3 font-semibold">{t("logs.user")}</h2>
        {stats.load_by_user.map((u) => (
          <div key={u.user} className="flex justify-between border-b border-slate-100 py-2 last:border-0 dark:border-slate-700/50">
            <span>{u.user}</span>
            <span className="font-medium">{u.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
