import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, BarChart3, ClipboardCheck, Target } from "lucide-react";
import PublicHeader from "@/components/layout/public-header";
import { AUTH_ROUTES } from "@/constants/authRoutes";

const FEATURES = [
  { key: "planning", icon: Target },
  { key: "monitoring", icon: ClipboardCheck },
  { key: "reporting", icon: BarChart3 },
] as const;

// Shown in all three languages on every locale, by design.
const GREETINGS = [
  { text: "Welcome", lang: "en" },
  { text: "እንኳን ደህና መጡ", lang: "am" },
  { text: "Baga nagaan dhuftan", lang: "om" },
] as const;

export default function Home() {
  const t = useTranslations("HomePage");
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#fffdf7] via-white to-white font-sans">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="w-full max-w-3xl flex flex-col items-center text-center gap-6">
          {/* Emblem */}
          <div className="rounded-full bg-white p-1 ring-[10px] ring-golden-dark/10 shadow-[0_20px_40px_-20px_rgba(184,143,20,0.8)]">
            <Image
              src="/logo-only.png"
              alt="Ministry of Mines emblem"
              width={112}
              height={112}
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-contain"
              priority
            />
          </div>

          {/* Trilingual welcome */}
          <p className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-sm sm:text-base font-semibold text-golden-dark">
            {GREETINGS.map((g, i) => (
              <span key={g.lang} className="inline-flex items-center gap-3">
                {i > 0 && (
                  <span className="text-gray-300" aria-hidden="true">
                    ·
                  </span>
                )}
                <span lang={g.lang}>{g.text}</span>
              </span>
            ))}
          </p>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight text-balance">
            {t("title")}
          </h1>

          <div className="h-[3px] w-14 rounded-full bg-golden-dark" aria-hidden="true" />

          <p className="max-w-2xl text-base sm:text-lg text-gray-600 leading-relaxed">
            {t("description")}
          </p>

          <Link
            href={AUTH_ROUTES.login}
            className="group mt-2 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-golden-dark text-white text-base sm:text-lg font-semibold
              shadow-lg shadow-golden-dark/25 hover:bg-golden-darkHover hover:shadow-xl
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-golden-dark
              transition-all duration-200"
          >
            {t("actions.signIn")}
            <ArrowRight
              className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Link>

          {/* Feature pills */}
          <ul className="mt-2 flex flex-wrap justify-center gap-3">
            {FEATURES.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-800"
              >
                <Icon className="h-4 w-4 text-golden-dark" aria-hidden="true" />
                {t(`features.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-500">
        © {year} {t("footer")}
      </footer>
    </div>
  );
}
