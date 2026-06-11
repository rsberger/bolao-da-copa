"use client";

import { createContext, useContext, type ReactNode } from "react";
import { translations, type Locale, type T } from "./translations";

type CtxValue = { t: T; locale: string };

const LocaleContext = createContext<CtxValue>({ t: translations.pt, locale: "pt" });

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <LocaleContext.Provider value={{ t: translations[locale], locale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useT(): T {
  return useContext(LocaleContext).t;
}

export function useLocale(): string {
  return useContext(LocaleContext).locale;
}
