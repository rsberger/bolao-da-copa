import { headers, cookies } from "next/headers";
import { locales, type Locale } from "./translations";

export async function getLocale(): Promise<Locale> {
  // Cookie preference takes priority over browser setting
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  const headersList = await headers();
  const accept = headersList.get("accept-language") ?? "";
  const preferred = accept
    .split(",")
    .map((s) => s.split(";")[0].trim().slice(0, 2).toLowerCase());
  return preferred.find((l): l is Locale => locales.includes(l as Locale)) ?? "pt";
}
