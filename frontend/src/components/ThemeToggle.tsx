import { useEffect, useState } from "react";

// Тёмная тема через класс на <html> (Tailwind darkMode: "class").
export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(
    () => localStorage.getItem("ecg_theme") === "dark",
  );

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("ecg_theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark((v) => !v)}
      className="btn-ghost"
      title="Тема"
      aria-label="Toggle theme"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
