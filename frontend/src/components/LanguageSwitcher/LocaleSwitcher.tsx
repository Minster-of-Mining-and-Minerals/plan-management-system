'use client';

import clsx from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Locale } from 'next-intl';
import { ChangeEvent, useEffect, useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Globe, ChevronDown } from 'lucide-react';
import { routing } from '@/i18n/routing';


/* ===== LOCAL STORAGE KEY ===== */
const LOCALE_KEY = 'NEXT_LOCALE';

export default function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  /* ===== SAVE LOCALE ===== */
  const setLocaleStorage = (lang: Locale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_KEY, lang);
    }
  };


  /* ===== RESTORE LOCALE ON LOAD ===== */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedLocale = localStorage.getItem(LOCALE_KEY) as Locale | null;

    if (
      storedLocale &&
      storedLocale !== locale &&
      routing.locales.includes(storedLocale)
    ) {
      startTransition(() => {
        router.replace(
          // @ts-expect-error params & pathname always match
          { pathname, params },
          { locale: storedLocale }
        );
      });
    }
  }, [locale, pathname, params, router]);

  /* ===== CHANGE HANDLER ===== */
  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;

    setLocaleStorage(nextLocale);

    startTransition(() => {
      router.replace(
        // @ts-expect-error params & pathname always match
        { pathname, params },
        { locale: nextLocale }
      );
    });
  }

  /* ===== UI (UNCHANGED) ===== */
  return (
    <div className="relative inline-flex hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
      <label className="sr-only">{t('label')}</label>

      <div
        className={clsx(
          'flex items-center bg-white rounded-md w-full',
          'focus-within:ring-1 focus-within:ring-primary focus-within:ring-offset-1 transition-all'
        )}
      >
        <Globe className="h-5 w-5 text-gray-500 ml-2 mr-1 flex-shrink-0" />

        <select
          defaultValue={locale}
          disabled={isPending}
          onChange={onSelectChange}
          className={clsx(
            'appearance-none cursor-pointer bg-transparent pr-6 py-2 pl-1 text-gray-700 font-medium w-full',
            'border-none focus:outline-none focus:ring-0'
          )}
        >
          {routing.locales.map((cur) => (
            <option key={cur} value={cur}>
              {t('locale', { locale: cur })}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
          <ChevronDown className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}