import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";

export const languages = [
  { name: "English", code: "en", flag: "🇬🇧" },
  { name: "Deutsch", code: "de", flag: "🇩🇪" },
  { name: "Español", code: "es", flag: "🇪🇸" },
  { name: "Français", code: "fr", flag: "🇫🇷" },
  { name: "हिन्दी", code: "hi", flag: "🇮🇳" },
  { name: "Italiano", code: "it", flag: "🇮🇹" },
  { name: "日本語", code: "ja", flag: "🇯🇵" },
  { name: "한국어", code: "ko", flag: "🇰🇷" },
  { name: "Nederlands", code: "nl", flag: "🇳🇱" },
  { name: "Português", code: "pt", flag: "🇧🇷" },
  { name: "Svenska", code: "sv", flag: "🇸🇪" },
  { name: "Türkçe", code: "tr", flag: "🇹🇷" },
  { name: "繁體中文", code: "tw", flag: "🇹🇼" },
  { name: "Tiếng Việt", code: "vi", flag: "🇻🇳" },
  { name: "简体中文", code: "zh", flag: "🇨🇳" },
];

i18next
  .use(LanguageDetector)
  .use(resourcesToBackend((language: string) => import(`./languages/${language}.json`)))
  .use(initReactI18next)
  .init({
    load: "languageOnly",
    fallbackLng: "en",
    debug: false,
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

function setDocumentLang(lng: string) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
}

i18next.on("languageChanged", setDocumentLang);
i18next.on("initialized", () => setDocumentLang(i18next.language));

export default i18next;
