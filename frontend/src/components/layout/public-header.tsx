"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { AUTH_ROUTES } from "@/constants/authRoutes";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "../LanguageSwitcher/LocaleSwitcher";

/** Transparent header that sits on top of the landing-page hero. */
const PublicHeader = () => {
  const t = useTranslations("PublicHeader");

  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#efc23f]">
          <Image
            src="/logo-only.png"
            alt="Logo"
            width={40}
            height={40}
            className="h-10 w-10 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
          />
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-semibold text-[#f4d986] tracking-wide">
              የማዕድን ሚኒስቴር
            </p>
            <p className="text-sm font-semibold text-[#f4d986] tracking-wide">
              Minister of Mining
            </p>
          </div>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Home page offers English and Amharic only for now; the rest of the app keeps all locales. */}
          <LocaleSwitcher locales={["en", "am"]} />
          <Link
            href={AUTH_ROUTES.login}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#1b1404]
              bg-[#efc23f] hover:bg-[#f6cf5a]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#3a5565]
              transition-colors duration-200 shadow-sm"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {t("login")}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
