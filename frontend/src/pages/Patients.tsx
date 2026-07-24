import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import Disclaimer from "../components/Disclaimer";

interface Patient {
  id: number;
  full_name: string;
  birth_date: string | null;
  sex: string | null;
  phone: string;
  external_id: string;
}

export default function Patients() {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    sex: "",
    phone: "",
    external_id: "",
  });

  async function load() {
    const data = await api.get(`/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setPatients(data);
  }

  useEffect(() => {
    // Каждое нажатие клавиши шлёт запрос; более ранний ответ может прийти позже
    // нового — флаг ignore отбрасывает устаревший результат поиска.
    let ignore = false;
    api
      .get(`/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((data) => {
        if (!ignore) setPatients(data);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function create(e: FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = { full_name: form.full_name };
    if (form.birth_date) payload.birth_date = form.birth_date;
    if (form.sex) payload.sex = form.sex;
    if (form.phone) payload.phone = form.phone;
    if (form.external_id) payload.external_id = form.external_id;
    await api.post("/patients", payload);
    setForm({ full_name: "", birth_date: "", sex: "", phone: "", external_id: "" });
    setShowForm(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm(t("patients.confirmDelete"))) return;
    await api.del(`/patients/${id}`);
    load();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Disclaimer />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("patients.title")}</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          + {t("patients.add")}
        </button>
      </div>

      <input
        className="input mb-4"
        placeholder={t("patients.search")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {showForm && (
        <form onSubmit={create} className="card mb-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">{t("patients.fullName")}</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">{t("patients.birthDate")}</label>
            <input
              className="input"
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{t("patients.sex")}</label>
            <select
              className="input"
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value })}
            >
              <option value="">—</option>
              <option value="male">{t("patients.male")}</option>
              <option value="female">{t("patients.female")}</option>
            </select>
          </div>
          <div>
            <label className="label">{t("patients.phone")}</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{t("patients.externalId")}</label>
            <input
              className="input"
              value={form.external_id}
              onChange={(e) => setForm({ ...form, external_id: e.target.value })}
            />
          </div>
          <div className="col-span-2 flex gap-2">
            <button className="btn-primary" type="submit">
              {t("patients.save")}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowForm(false)}
            >
              {t("patients.cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="card p-0">
        {patients.length === 0 ? (
          <p className="p-5 text-slate-500">{t("patients.empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
              <tr>
                <th className="p-3">{t("patients.fullName")}</th>
                <th className="p-3">{t("patients.externalId")}</th>
                <th className="p-3">{t("patients.birthDate")}</th>
                <th className="p-3">{t("patients.sex")}</th>
                <th className="p-3">{t("patients.phone")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-700/50"
                >
                  <td className="p-3 font-medium">{p.full_name}</td>
                  <td className="p-3 tabular-nums">{p.external_id || "—"}</td>
                  <td className="p-3">{p.birth_date || "—"}</td>
                  <td className="p-3">{p.sex || "—"}</td>
                  <td className="p-3">{p.phone || "—"}</td>
                  <td className="p-3 text-right">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => remove(p.id)}
                    >
                      {t("patients.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
