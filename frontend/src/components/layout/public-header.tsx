"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FileText, ClipboardCheck, BarChart3, Home } from "lucide-react";
// import LocaleSwitcher from "@/components/common/LanguageSwitcher/LocaleSwitcher";
import { AUTH_ROUTES } from "@/constants/authRoutes";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "../LanguageSwitcher/LocaleSwitcher";

const PublicHeader = () => {
  const pathname = usePathname(); // e.g., "/en/complaint"
  const t = useTranslations("PublicHeader");

  // Helper to remove locale prefix from pathname
  const normalizePathname = (path: string) => {
    const segments = path.split("/").filter(Boolean); // remove empty
    if (segments[0] === "en" || segments[0] === "am") {
      segments.shift(); // remove locale
    }
    return "/" + segments.join("/");
  };

  const normalizedPath = normalizePathname(pathname);

  const tabs = [
    {
      label: t("tabs.home"),
      href: "/",
      icon: Home,
    },
    {
      label: t("tabs.plans"),
      href: "/plans",
      icon: FileText,
    },
    {
      label: t("tabs.evaluations"),
      href: "/evaluations",
      icon: ClipboardCheck,
    },
    {
      label: t("tabs.reports"),
      href: "/reports",
      icon: BarChart3,
    }
  ];

  return (
    <header className="w-full z-20 bg-white/80 backdrop-blur-md shadow-md border-b border-gray-100 fixed top-0 left-0">
      <div className="mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo-only.png"
            alt="Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <div>
            <h1 className="text-base font-semibold text-golden-dark tracking-wide hidden sm:block">
              የማዕድን ሚኒስቴር
            </h1>
            <h1 className="text-base font-semibold text-golden-dark tracking-wide -mt-[5px] hidden sm:block">
              Minister of Mining
            </h1>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          {/* Locale Switcher */}
          <LocaleSwitcher />

          {/* Tabs */}
          <nav className="flex items-center gap-4">
            {tabs.map((tab) => {
              const isActive = normalizedPath === tab.href;
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`relative flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold transition-all duration-200
                    ${isActive
                      ? "text-golden-dark rounded-b-none border-b-0"
                      : "text-gray-500 hover:text-golden-dark"
                    }
                  `}
                >
                  {/* Tab label */}
                  <span>{tab.label}</span>

                  {/* Active underline */}
                  <span
                    className={`absolute -bottom-[1px] left-0 h-[2px] w-full bg-golden-dark transition-transform duration-300
                      ${isActive ? "scale-x-100" : "scale-x-0"}
                    `}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Login Button */}
          <Link
            href={AUTH_ROUTES.login}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white 
              bg-golden-dark hover:bg-golden-darkHover 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary 
              transition-all duration-200 shadow-sm"
          >
            {t("login")}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;