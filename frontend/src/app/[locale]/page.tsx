import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PublicHeader from "@/components/layout/public-header";

export default async function Home() {
  const t = await getTranslations("HomePage");
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden font-sans">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-section-accent-subtle-20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-section-accent-subtle-30 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <PublicHeader />

      {/* Hero Section */}
      <main className="flex justify-center items-center min-h-screen z-10 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-section-accent text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-section-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-section-accent"></span>
            </span>
            {t('badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-4xl font-bold text-gray-900 leading-tight">
            {t('heading.line1')}
            <span className="block text-primary mt-2">
              {t('heading.line2')}
            </span>
          </h1>

          <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-6 leading-relaxed">
            {t('description')}
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">

            <Link
              href="/evaluations"
              className="px-8 py-4 bg-white text-primary font-semibold rounded-xl 
                border border-primary/20 hover:border-primary/40 hover:bg-sidebar-hover
                transition-all duration-200 text-lg"
            >
              {t('actions.evaluations')}
            </Link>
          </div>


        </div>
      </main>




    </div>
  );
}