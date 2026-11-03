"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { getSession, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircleIcon, ArrowLeftIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { login } from "@/actions/user";
import { useBranding } from "@/providers/BrandingProvider";
import StrataBackground from "@/components/landing/StrataBackground";
import { normalizeEmail } from "@/utils/emailUtils";
import {
  AUTH_ROUTES,
  resolvePostAuthRedirect,
} from "@/constants/authRoutes";

// Soft shade over the rock layers so the text and glass card stay readable.
const LOGIN_SCRIM =
  "radial-gradient(ellipse 70% 70% at 50% 50%, rgb(36 56 68 / .45), rgb(36 56 68 / .2) 70%, rgb(36 56 68 / .35))";

// Clear glass card that holds both the branding and the form.
const GLASS_CARD =
  "rounded-[22px] border border-white/20 bg-white/[0.06] backdrop-blur-[10px] backdrop-saturate-[1.1] " +
  "shadow-[0_40px_90px_-40px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.18)]";

// See-through inputs for the clear glass card.
const GLASS_INPUT =
  "rounded-xl border-white/30 bg-white/10 text-white placeholder:text-[#e6edf1]/60 " +
  "focus-visible:border-[#efc23f] focus-visible:bg-white/15 focus-visible:ring-[#efc23f]/25";

export default function ExternalLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const router = useRouter();
  const { branding } = useBranding();

  const { data: session, status, update } = useSession();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    // The client-side session can be stale right after a logout. Confirm with
    // the server before redirecting, otherwise we'd send a logged-out user to
    // a private page and the middleware would answer with a 404.
    getSession().then((fresh) => {
      if (cancelled || !fresh?.user) return;
      const regionId = fresh.user.region_id ?? session?.user?.region_id;
      const companyId = fresh.user.company_id ?? session?.user?.company_id;
      const purchasingCenterId = fresh.user.purchasing_center_id ?? session?.user?.purchasing_center_id;
      if (purchasingCenterId && (!rawCallbackUrl || rawCallbackUrl === "/dashboard")) {
        router.replace(`/purchasing-centers/${purchasingCenterId}` as any);
      } else if (companyId && (!rawCallbackUrl || rawCallbackUrl === "/dashboard")) {
        router.replace(`/companies/${companyId}` as any);
      } else if (regionId && (!rawCallbackUrl || rawCallbackUrl === "/dashboard")) {
        router.replace(`/regions/${regionId}` as any);
      } else {
        router.replace(resolvePostAuthRedirect(rawCallbackUrl || "/dashboard") as any);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.region_id, session?.user?.company_id, session?.user?.purchasing_center_id, rawCallbackUrl, router]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(
      normalizeEmail(formData.email),
      formData.password.trim()
    );
    if (result?.error) {
      setAuthError(result.error);
    }

    if (result?.success) {
      const newSession: any = await update();
      const isFirstLogin = newSession?.user?.is_first_logged_in;

      if (isFirstLogin) {
        router.replace(AUTH_ROUTES.changePassword);
      } else {
        const regionId = newSession?.user?.region_id;
        const companyId = newSession?.user?.company_id;
        const purchasingCenterId = newSession?.user?.purchasing_center_id;
        if (purchasingCenterId && (!rawCallbackUrl || rawCallbackUrl === "/dashboard")) {
          router.replace(`/purchasing-centers/${purchasingCenterId}` as any);
        } else if (companyId && (!rawCallbackUrl || rawCallbackUrl === "/dashboard")) {
          router.replace(`/companies/${companyId}` as any);
        } else if (regionId && (!rawCallbackUrl || rawCallbackUrl === "/dashboard")) {
          router.replace(`/regions/${regionId}` as any);
        } else {
          router.replace(resolvePostAuthRedirect(rawCallbackUrl || "/dashboard") as any);
        }
      }
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#3a5565] text-[#f4f7f9] flex items-center justify-center px-4 py-10">
      {/* Background: same rock layers and gold vein as the home page */}
      <StrataBackground className="absolute inset-0 -z-20 h-full w-full" />
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{ background: LOGIN_SCRIM }}
        aria-hidden="true"
      />

      {/* One clear glass card containing both panels */}
      <div className={`relative w-full max-w-6xl min-h-[80vh] grid lg:grid-cols-2 overflow-hidden ${GLASS_CARD}`}>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-[9px] bg-white/10 py-1.5 pl-2 pr-3 text-sm font-semibold text-white
            transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#efc23f]"
        >
          <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
          Back
        </button>

        {/* Left: branding */}
        <div className="flex items-center justify-center px-6 pt-16 pb-10 sm:px-10 lg:py-10 border-b border-white/15 lg:border-b-0 lg:border-r">
          <div className="grid justify-items-center gap-3.5 text-center [text-shadow:0_1px_12px_rgb(20_34_44/0.55)]">
            {/* Same emblem as the home page header */}
            <Image
              src="/logo-only.png"
              alt={branding.system_name_full}
              width={224}
              height={224}
              priority
              className="h-36 w-36 lg:h-56 lg:w-56 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
            />
            <div className="grid gap-0.5">
              <span lang="am" className="text-lg font-semibold text-[#f4d986]">
                የማዕድን ሚኒስቴር
              </span>
              <span className="text-base font-semibold text-white">Minister of Mining</span>
            </div>
            {branding.system_tagline && (
              <p className="max-w-[34ch] text-[0.95rem] text-[#d4dee4]">{branding.system_tagline}</p>
            )}
          </div>
        </div>

        {/* Right: the form */}
        <div className="flex items-center justify-center px-6 py-11 sm:px-12">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-center text-white mb-2">Login</h1>
            <p className="text-center text-sm text-[#d4dee4] mb-6">{branding.system_name_full}</p>

            {authError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-[10px] border border-[#fecdca]/50 bg-[#b42318]/25 px-3 py-2.5 mb-4 text-sm text-[#fff1f0]"
              >
                <AlertCircleIcon className="mt-0.5 h-[18px] w-[18px] flex-none" aria-hidden="true" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="login-email" className="text-[#eef3f6]">Email</Label>
                <Input
                  id="login-email"
                  type="text"
                  autoComplete="username"
                  placeholder="user@mom-demo.et"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full h-14 mt-1 ${GLASS_INPUT}`}
                />
              </div>

              <div>
                <Label htmlFor="login-password" className="text-[#eef3f6]">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full h-14 pr-12 ${GLASS_INPUT}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-[9px] text-[#e6edf1] hover:bg-white/10
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#efc23f]"
                  >
                    {showPassword ? (
                      <EyeIcon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <EyeOffIcon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="w-full text-right">
                <Link
                  href={AUTH_ROUTES.forgotPassword}
                  className="text-sm font-semibold text-[#f4d986] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-xl text-xl font-bold bg-[#efc23f] text-[#1b1404] hover:bg-[#f6cf5a]
                  hover:shadow-[0_0_0_6px_rgba(239,194,63,0.22)] focus-visible:ring-[#efc23f]/60"
              >
                Log In
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
