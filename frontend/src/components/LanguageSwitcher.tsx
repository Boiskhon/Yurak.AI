import { useTranslation } from "react-i18next";

const LANGS: { code: string; label: string }[] = [
  { code: "uz", label: "UZ" },
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2);
  return (
    <div className="flex w-full overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => i18n.changeLanguage(l.code)}
          className={
            "flex-1 py-1 text-center text-sm transition " +
            (current === l.code
              ? "bg-clinic-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300")
          }
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
