import { useTranslation } from "react-i18next";

// Несмываемый дисклеймер — по требованию архитектуры показывается вверху
// рабочей области и не может быть скрыт пользователем.
export default function Disclaimer() {
  const { t } = useTranslation();
  return (
    <div
      role="note"
      className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50
                 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40
                 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <span aria-hidden className="mt-0.5">⚠️</span>
      <span>{t("disclaimer")}</span>
    </div>
  );
}
