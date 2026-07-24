import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

/** Событие, которым страница настроек просит перечитать таймаут без перезагрузки. */
export const SETTINGS_CHANGED_EVENT = "ecg:settings-changed";

/** Автовыход по неактивности. Настройку задаёт админ (вкл/выкл + минуты);
 *  по умолчанию выключен. Любая активность (мышь/клавиши/скролл) сбрасывает таймер.
 *  Компонент смонтирован один раз в Layout, поэтому он перечитывает настройки не
 *  только при монтировании, но и по событию SETTINGS_CHANGED_EVENT — иначе
 *  включение автовыхода не срабатывало бы до перезагрузки страницы. */
export default function IdleTimeout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer: number | undefined;
    let detach: (() => void) | undefined;

    const teardown = () => {
      if (detach) {
        detach();
        detach = undefined;
      }
      if (timer) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    // Перечитываем настройки и заново вооружаем таймер (или выключаем его).
    const arm = async () => {
      teardown();
      let s: { idle_logout_enabled?: boolean; idle_logout_minutes?: number };
      try {
        s = await api.get("/settings");
      } catch {
        return; // недоступность настроек не должна ронять приложение
      }
      if (!s?.idle_logout_enabled) return;
      const ms = Math.max(1, s.idle_logout_minutes ?? 15) * 60 * 1000;
      const reset = () => {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          logout();
          navigate("/login");
        }, ms);
      };
      const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
      events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
      detach = () => events.forEach((e) => window.removeEventListener(e, reset));
      reset();
    };

    arm();
    const onChange = () => arm();
    window.addEventListener(SETTINGS_CHANGED_EVENT, onChange);

    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, onChange);
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
