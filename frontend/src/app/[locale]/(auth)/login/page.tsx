"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { login } from "@/actions/user";
import { useBranding } from "@/providers/BrandingProvider";
import { normalizeEmail } from "@/utils/emailUtils";

export default function ExternalLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const router = useRouter();
  const { branding, logoSecondaryUrl, logoPrimaryUrl } = useBranding();

  const { status, update } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated") {
      const target = callbackUrl === "/login" || !callbackUrl ? "/dashboard" : callbackUrl;
      router.replace(target as any);
    }
  }, [status, callbackUrl, router]);

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
        router.replace("/change-password");
      } else {
        const target = callbackUrl === "/login" || !callbackUrl ? "/dashboard" : callbackUrl;
        router.replace(target as any);
      }
    }
  };

  const displayLogo = logoSecondaryUrl || logoPrimaryUrl;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full relative max-w-6xl min-h-[80vh] shadow-2xl rounded-2xl border border-border overflow-hidden flex flex-col lg:flex-row">
        <Button
          onClick={() => router.push("/")}
          variant="ghost"
          className="cursor-pointer shadow-none z-50 p-2 top-4 left-4 absolute flex items-center gap-1"
        >
          <ArrowLeftIcon className="w-5 h-5 text-primary" />
          <span className="text-sm text-primary font-medium">Back</span>
        </Button>

        <div className="w-full bg-muted/30 p-8 flex items-center justify-center">
          <div className="backdrop-blur-md p-6 rounded-xl text-center">
            {displayLogo ? (
              <Image
                src={displayLogo}
                alt={branding.system_name_full}
                width={288}
                height={288}
                className="h-72 w-auto mx-auto mb-3 rounded-xl p-2 object-contain"
                unoptimized
              />
            ) : null}
            {branding.system_tagline && (
              <p className="text-sm text-muted-foreground">{branding.system_tagline}</p>
            )}
          </div>
        </div>

        <div className="w-full px-16 py-8 flex items-center justify-center bg-card">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-semibold text-center text-primary mb-2">Login</h1>
            <p className="text-center text-sm text-muted-foreground mb-6">
              {branding.system_name_full}
            </p>

            {authError && (
              <div className="rounded-md w-full text-center bg-destructive/10 border border-destructive/30 px-3 py-2 mb-4">
                <div className="text-sm text-destructive">{authError}</div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label className="text-primary">Email</Label>
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="user@mom-demo.et"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-14 mt-1"
                />
              </div>

              <div>
                <Label className="text-primary">Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-14 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="h-5 w-5 text-primary" />
                    ) : (
                      <EyeOffIcon className="h-5 w-5 text-primary" />
                    )}
                  </button>
                </div>
              </div>

              <div className="w-full text-right">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <Button type="submit" className="w-full h-14 text-xl">
                Log In
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
