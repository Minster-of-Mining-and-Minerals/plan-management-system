import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/layout/public-header";
import StrataBackground from "@/components/landing/StrataBackground";
import DeviceMockup from "@/components/landing/DeviceMockup";
import { AUTH_ROUTES } from "@/constants/authRoutes";

// Shown in English and Amharic on every locale, by design.
const GREETINGS = [
  { text: "Welcome", lang: "en" },
  { text: "እንኳን ደህና መጡ", lang: "am" },
] as const;

// Medium-tone scrim so the text stays readable over the rock layers.
const SCRIM =
  "linear-gradient(90deg, rgb(36 56 68 / .93) 0%, rgb(36 56 68 / .72) 42%, rgb(36 56 68 / .25) 70%, rgb(36 56 68 / .4) 100%)";
const SCRIM_MOBILE = "linear-gradient(180deg, rgb(36 56 68 / .9), rgb(36 56 68 / .78))";

export default function Home() {
  const t = useTranslations("HomePage");

  return (
    <div className="relative isolate min-h-screen flex flex-col overflow-hidden bg-[#3a5565] text-[#f4f7f9] font-sans">
      {/* Background */}
      <StrataBackground className="absolute inset-0 -z-20 h-full w-full" />
      <div className="absolute inset-0 -z-10 pointer-events-none lg:hidden" style={{ background: SCRIM_MOBILE }} aria-hidden="true" />
      <div className="absolute inset-0 -z-10 pointer-events-none hidden lg:block" style={{ background: SCRIM }} aria-hidden="true" />

      <PublicHeader />

      <main className="flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          {/* Text */}
          <div className="grid gap-5 max-w-3xl">
            <span className="justify-self-start inline-flex items-center gap-2.5 rounded-full border border-[#f4d986]/30 bg-[#f4d986]/10 py-2 pl-2.5 pr-4">
              <b className="rounded-full bg-[#efc23f] px-2.5 py-0.5 text-sm font-bold text-[#1b1404]">MoM</b>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:text-base font-semibold text-[#f4d986]">
                {GREETINGS.map((g, i) => (
                  <span key={g.lang} className="inline-flex items-center gap-3">
                    {i > 0 && <i className="h-1 w-1 rounded-full bg-[#f4d986]/50" aria-hidden="true" />}
                    <span lang={g.lang}>{g.text}</span>
                  </span>
                ))}
              </span>
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.12] tracking-tight text-balance">
              {t("heading.line1")} <span className="text-[#efc23f]">{t("heading.line2")}</span>
            </h1>

            <p className="text-lg sm:text-xl font-medium text-[#e6edf1]" lang="am">
              ከመሬት በታች እስከ ብሔራዊ ግብ፤ አንድ ዕቅድ፣ አንድ መድረክ።
            </p>

            <p className="max-w-[52ch] text-lg sm:text-xl leading-relaxed text-[#d4dee4]">{t("description")}</p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={AUTH_ROUTES.login}
                className="group inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#efc23f] px-7 py-3.5 text-lg font-semibold text-[#1b1404]
                  transition-[background-color,box-shadow] duration-200 hover:bg-[#f6cf5a] hover:shadow-[0_0_0_6px_rgb(239_194_63/0.18)]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#3a5565]"
              >
                {t("actions.signIn")}
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-[3px] motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
              <span className="inline-flex items-center gap-2 text-sm sm:text-base text-[#c3d1d9]">
                <ShieldCheck className="h-5 w-5 text-[#f4d986]" aria-hidden="true" />
                {t("secureNote")}
              </span>
            </div>
          </div>

          {/* Devices */}
          <div className="hidden md:flex justify-center lg:justify-end">
            <DeviceMockup label={t("mockupLabel")} />
          </div>
        </div>
      </main>
    </div>
  );
}
