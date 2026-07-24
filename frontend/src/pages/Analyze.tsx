import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getToken } from "../api";
import Disclaimer from "../components/Disclaimer";

interface Patient {
  id: number;
  full_name: string;
  external_id: string;
}
interface Finding {
  code: string;
  confidence: number;
  labels: Record<string, string>;
}
interface MlResult {
  id: number;
  model_version: string;
  findings: Finding[];
  top_confidence: number;
  needs_review: boolean;
  inference_ms: number;
}

// Изображения с backend требуют Bearer-токен, поэтому грузим их через fetch
// в blob-URL, а не напрямую в <img src>.
function useAuthedImage(url: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let ignore = false;
    let objectUrl: string | null = null;
    if (!url) {
      setSrc(null);
      return;
    }
    fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => {
        // Если url успел смениться — не подставляем устаревшее изображение.
        if (ignore) return;
        objectUrl = URL.createObjectURL(b);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!ignore) setSrc(null);
      });
    return () => {
      ignore = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  return src;
}

export default function Analyze() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState<number | "">("");
  const [patientQuery, setPatientQuery] = useState("");
  const [showList, setShowList] = useState(false);
  const [device, setDevice] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [recordId, setRecordId] = useState<number | null>(null);
  const [ml, setMl] = useState<MlResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [explainUrl, setExplainUrl] = useState<string | null>(null);
  const [explainSummary, setExplainSummary] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const originalSrc = useAuthedImage(recordId ? `/api/ecg/${recordId}/image` : null);
  const previewSrc = useAuthedImage(previewUrl ? `/api${previewUrl.replace("/api", "")}` : previewUrl);
  const explainSrc = useAuthedImage(explainUrl ? `/api${explainUrl.replace("/api", "")}` : explainUrl);

  useEffect(() => {
    api.get("/patients").then(setPatients);
  }, []);

  // Выбор пациента — только из существующих (поиск по ФИО и номеру карты),
  // чтобы нельзя было указать несуществующего пациента.
  const selectedPatient = patients.find((p) => p.id === patientId) || null;
  const q = patientQuery.trim().toLowerCase();
  const filteredPatients = (
    q
      ? patients.filter(
          (p) =>
            p.full_name.toLowerCase().includes(q) ||
            (p.external_id || "").toLowerCase().includes(q),
        )
      : patients
  ).slice(0, 50);

  function pickPatient(p: Patient) {
    setPatientId(p.id);
    setPatientQuery("");
    setShowList(false);
  }

  function resetResult() {
    setMl(null);
    setPreviewUrl(null);
    setExplainUrl(null);
    setExplainSummary(null);
    setDownloadUrl(null);
    setComment("");
  }

  async function analyze() {
    if (!patientId || !file) return;
    setBusy(true);
    setError("");
    resetResult();
    try {
      const rec = await api.upload(Number(patientId), device, file);
      setRecordId(rec.id);
      const res = await api.post(`/ecg/${rec.id}/analyze`);
      setMl(res.ml_result);
      setPreviewUrl(res.preview_url);
      setExplainUrl(res.explain_url);
      setExplainSummary(res.explain_summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function makeReport() {
    if (!recordId) return;
    setBusy(true);
    try {
      if (comment.trim()) {
        await api.post(`/ecg/${recordId}/comment`, { text: comment });
      }
      // Создаём отчёт и сразу скачиваем — один клик.
      const res = await api.post(`/ecg/${recordId}/report`, {
        lang,
        doctor_comment: comment,
      });
      setDownloadUrl(res.download_url);
      const r = await fetch(`/api${res.download_url.replace("/api", "")}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!r.ok) throw new Error(t("common.error"));
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ecg-report.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Disclaimer />
      <h1 className="mb-4 text-2xl font-bold">{t("analyze.title")}</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ввод */}
        <div className="card space-y-3">
          <div className="relative">
            <label className="label">{t("analyze.selectPatient")}</label>
            {selectedPatient ? (
              <div className="input flex items-center justify-between gap-2">
                <span className="truncate">
                  {selectedPatient.full_name}
                  {selectedPatient.external_id && (
                    <span className="text-slate-500">
                      {" "}· {t("patients.externalId")}: {selectedPatient.external_id}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-slate-400 hover:text-red-600"
                  title={t("patients.cancel")}
                  onClick={() => {
                    setPatientId("");
                    setPatientQuery("");
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <input
                className="input"
                placeholder={t("patients.search")}
                value={patientQuery}
                onChange={(e) => {
                  setPatientQuery(e.target.value);
                  setShowList(true);
                }}
                onFocus={() => setShowList(true)}
                onBlur={() => setTimeout(() => setShowList(false), 150)}
              />
            )}
            {showList && !selectedPatient && (
              <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-soft dark:border-slate-600 dark:bg-slate-800">
                {filteredPatients.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-slate-400">
                    {t("patients.notFound")}
                  </li>
                ) : (
                  filteredPatients.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                        onMouseDown={() => pickPatient(p)}
                      >
                        <span className="truncate">{p.full_name}</span>
                        <span className="shrink-0 text-sm tabular-nums text-slate-500">
                          {p.external_id || "—"}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <div>
            <label className="label">{t("analyze.device")}</label>
            <input
              className="input"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t("analyze.upload")}</label>
            <input
              className="input"
              type="file"
              accept="image/*,.scp,.xml,.txt,.dat"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button
            className="btn-primary w-full"
            disabled={!patientId || !file || busy}
            onClick={analyze}
          >
            {busy ? t("common.loading") : t("analyze.analyze")}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Предпросмотр изображений */}
        <div className="card space-y-3">
          {originalSrc && (
            <div>
              <div className="label">{t("analyze.original")}</div>
              <img src={originalSrc} className="w-full rounded-xl border border-slate-200 dark:border-slate-700" />
            </div>
          )}
          {previewSrc && (
            <div>
              <div className="label">{t("analyze.preview")}</div>
              <img src={previewSrc} className="w-full rounded-xl border border-slate-200 dark:border-slate-700" />
            </div>
          )}
          {!originalSrc && (
            <p className="text-sm text-slate-400">{t("analyze.upload")}</p>
          )}
        </div>
      </div>

      {/* Результат ML */}
      {ml && (
        <div className="card mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("analyze.findings")}</h2>
            <span className="text-xs text-slate-400">
              {t("analyze.modelVersion")}: {ml.model_version} · {ml.inference_ms} ms
            </span>
          </div>

          {ml.needs_review && (
            <div className="mb-3 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              ⚠️ {t("analyze.needsReview")}
            </div>
          )}

          <div className="space-y-2">
            {ml.findings.slice(0, 5).map((f) => (
              <div key={f.code} className="flex items-center gap-3">
                <div className="w-48 text-sm">{f.labels[lang] || f.code}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-clinic-500"
                    style={{ width: `${Math.round(f.confidence * 100)}%` }}
                  />
                </div>
                <div className="w-14 text-right text-sm tabular-nums">
                  {(f.confidence * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {/* Объяснимость: куда смотрела модель */}
          {explainSrc && (
            <div className="mt-5">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <span>🔍 {t("analyze.explainTitle")}</span>
              </div>
              <p className="mb-2 text-xs text-slate-500">
                {t("analyze.explainHint")}
                {explainSummary && (
                  <>
                    {" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {t("analyze.explainLeads")}: {explainSummary}
                    </span>
                  </>
                )}
              </p>
              <img
                src={explainSrc}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          )}

          <div className="mt-4">
            <label className="label">{t("analyze.comment")}</label>
            <textarea
              className="input min-h-[80px]"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button className="btn-primary" onClick={makeReport} disabled={busy}>
              ⬇ {t("analyze.makeReport")}
            </button>
            {downloadUrl && (
              <span className="text-sm text-teal-600">✓</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
