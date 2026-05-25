"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { BrandingLogo, BrandingName } from "@/components/common/BrandingLogo";
import { Button } from "@/components/ui/button";
import {
  MODULE_NAV_ITEMS,
  PRIMARY_NAV,
} from "@/features/public/config/navigation";
import { useLocale } from "next-intl";

function normalizePath(path: string) {
  const segments = path.split("/").filter(Boolean);
  if (segments[0] === "en" || segments[0] === "am") segments.shift();
  return "/" + segments.join("/");
}

export function PublicNavbar() {
  const pathname = usePathname();
  const locale = useLocale() as "en" | "am";
  const current = normalizePath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <BrandingLogo variant="compact" width={40} height={40} />
          <BrandingName locale={locale} className="hidden text-base font-semibold text-foreground sm:block" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((item) =>
            item.href === "/modules" ? (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => setModulesOpen(true)}
                onMouseLeave={() => setModulesOpen(false)}
              >
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    current.startsWith("/modules")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  <ChevronDown className="h-4 w-4" />
                </button>
                <AnimatePresence>
                  {modulesOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute left-0 top-full z-50 mt-2 w-[640px] rounded-2xl border border-border/60 bg-card/95 p-4 shadow-2xl backdrop-blur-xl"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {MODULE_NAV_ITEMS.map((mod) => {
                          const Icon = mod.icon;
                          return (
                            <Link
                              key={mod.href}
                              href={mod.href}
                              className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-section-accent-subtle-10"
                            >
                              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                              <div>
                                <p className="text-sm font-semibold text-foreground">{mod.label}</p>
                                <p className="text-xs text-muted-foreground">{mod.description}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  current === item.href || current.startsWith(`${item.href}/`)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/demo">Request Demo</Link>
          </Button>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-foreground lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/50 bg-background/95 lg:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {[...PRIMARY_NAV, { label: "Contact", href: "/contact" }, { label: "Demo", href: "/demo" }].map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                )
              )}
              <Button asChild className="mt-3 w-full">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
