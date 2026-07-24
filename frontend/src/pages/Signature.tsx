import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getToken } from "../api";

/** Планшет для рукописной подписи: врач рисует мышью/пальцем, сохраняет PNG. */
export default function Signature() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // Загружаем существующую подпись (если есть).
  useEffect(() => {
    let ignore = false;
    let objectUrl: string | null = null;
    fetch("/api/media/signature", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => {
        if (ignore) return;
        objectUrl = URL.createObjectURL(b);
        setSaved(objectUrl);
      })
      .catch(() => {
        if (!ignore) setSaved(null);
      });
    return () => {
      ignore = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  function ctx() {
    const c = canvasRef.current!;
    const g = c.getContext("2d")!;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = 2.5;
    g.strokeStyle = "#0f172a";
    return g;
  }

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    // Масштабируем координаты: canvas отображается в CSS-размере, отличном от
    // внутреннего (width/height), иначе точка рисования смещена.
    return {
      x: (e.clientX - rect.left) * (c.width / rect.width),
      y: (e.clientY - rect.top) * (c.height / rect.height),
    };
  }

  function start(e: React.PointerEvent) {
    drawing.current = true;
    dirty.current = true;
    const { x, y } = pos(e);
    const g = ctx();
    g.beginPath();
    g.moveTo(x, y);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const { x, y } = pos(e);
    const g = ctx();
    g.lineTo(x, y);
    g.stroke();
  }
  function end() {
    drawing.current = false;
  }

  function clear() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
  }

  async function save() {
    if (!dirty.current) {
      setMsg(t("signature.drawFirst"));
      return;
    }
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    await api.post("/media/signature", { image: dataUrl });
    setSaved(dataUrl);
    setMsg("✓ " + t("signature.saved"));
  }

  async function remove() {
    await api.del("/media/signature");
    setSaved(null);
    clear();
    setMsg(t("signature.deleted"));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">{t("signature.title")}</h1>
      <p className="mb-4 text-sm text-slate-500">{t("signature.hint")}</p>

      <div className="card space-y-3">
        <canvas
          ref={canvasRef}
          width={520}
          height={180}
          className="w-full touch-none rounded-xl border border-dashed border-slate-300 bg-white dark:border-slate-600"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        <div className="flex gap-2">
          <button className="btn-primary" onClick={save}>
            {t("signature.save")}
          </button>
          <button className="btn-ghost" onClick={clear}>
            {t("signature.clear")}
          </button>
          {saved && (
            <button className="btn-ghost text-red-600" onClick={remove}>
              {t("signature.delete")}
            </button>
          )}
        </div>
        {msg && <p className="text-sm text-teal-600">{msg}</p>}
      </div>

      {saved && (
        <div className="card mt-4">
          <div className="label">{t("signature.current")}</div>
          <img
            src={saved}
            alt="signature"
            className="max-h-24 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700"
          />
        </div>
      )}
    </div>
  );
}
