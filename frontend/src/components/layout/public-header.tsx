"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { AUTH_ROUTES } from "@/constants/authRoutes";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "../LanguageSwitcher/LocaleSwitcher";

const PublicHeader = () => {
  const t = useTranslations("PublicHeader");

  return (
    <header className="w-full z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 fixed top-0 left-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo-only.png"
            alt="Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-semibold text-golden-dark tracking-wide">
              የማዕድን ሚኒስቴር
            </p>
            <p className="text-sm font-semibold text-golden-dark tracking-wide">
              Minister of Mining
            </p>
          </div>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-3 sm:gap-4">
          <LocaleSwitcher />
          <Link
            href={AUTH_ROUTES.login}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white
              bg-golden-dark hover:bg-golden-darkHover
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
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
