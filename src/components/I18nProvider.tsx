import { useEffect, useState, type ReactNode } from "react";
import { I18nContext, translations, type Lang, type Currency, type TranslationKey } from "@/lib/i18n";

const LANG_KEY = "app.lang";
const CUR_KEY = "app.currency";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fa");
  const [currency, setCurrencyState] = useState<Currency>("AFN");

  useEffect(() => {
    const l = (typeof window !== "undefined" && (localStorage.getItem(LANG_KEY) as Lang)) || "fa";
    const c = (typeof window !== "undefined" && (localStorage.getItem(CUR_KEY) as Currency)) || "AFN";
    setLangState(l);
    setCurrencyState(c);
  }, []);

  const dir = lang === "fa" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang === "fa" ? "fa-AF" : "en-US";
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  };
  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(CUR_KEY, c);
  };

  const t = (k: TranslationKey) => translations[lang][k] ?? k;

  const formatMoney = (n: number) => {
    const v = Number.isFinite(n) ? n : 0;
    const locale = lang === "fa" ? "fa-AF" : "en-US";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(v);
    } catch {
      return `${v.toLocaleString(locale)} ${currency}`;
    }
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, currency, setCurrency, t, dir, formatMoney }}>
      {children}
    </I18nContext.Provider>
  );
}
