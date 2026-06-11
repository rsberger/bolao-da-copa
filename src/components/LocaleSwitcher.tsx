"use client";

import { useRouter } from "next/navigation";

const LOCALES = [
  { code: "pt", label: "PT", flag: "🇧🇷" },
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "nl", label: "NL", flag: "🇳🇱" },
];

export function LocaleSwitcher({ current }: { current: string }) {
  const router = useRouter();

  function setLocale(code: string) {
    document.cookie = `locale=${code}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-0.5">
      {LOCALES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          title={label}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            current === code
              ? "bg-slate-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          }`}
        >
          {flag} {label}
        </button>
      ))}
    </div>
  );
}
