"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/auth";
import { login } from "@/actions/user";
import { BrandingLogo, BrandingName } from "@/components/common/BrandingLogo";

export default function ExternalLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const router = useRouter();

  const { data: session, status, update } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/profile";

  useEffect(() => {
    if (status === "authenticated") {
      // Avoid redirecting to login or empty path
      const target = (callbackUrl === "/login" || !callbackUrl) ? "/profile" : callbackUrl;
      router.replace(target as any);
    }
  }, [status, callbackUrl, router]);

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(formData.email as string, formData.password as string);
    if (result?.error) {
      setAuthError(result.error);
    }

    if (result?.success) {
      const newSession: any = await update(); // Force session refresh
      const isFirstLogin = newSession?.user?.is_first_logged_in;

      if (isFirstLogin) {
        router.replace("/change-password");
      } else {
        const target = (callbackUrl === "/login" || !callbackUrl) ? "/profile" : callbackUrl;
        router.replace(target as any);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full relative max-w-6xl min-h-[80vh] shadow-2xl rounded-2xl border border-auth-panel overflow-hidden flex flex-col lg:flex-row bg-card">

        {/* Back Button */}
        <Button
          onClick={() => router.push("/")}
          className="cursor-pointer shadow-none z-50 bg-transparent hover:bg-slate-100 p-2 top-4 left-4 absolute flex items-center gap-1"
        >
          <ArrowLeftIcon className="w-5 h-5 text-primary" />
          <span className="text-sm text-primary font-medium">Back</span>
        </Button>

        {/* Left Section */}
        <div className="w-full bg-auth-background p-8 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-auth-panel">
          <BrandingLogo
            variant="login"
            width={288}
            height={288}
            className="h-72 w-auto mx-auto object-contain"
          />
        </div>

        {/* Right Section */}
        <div className="w-full bg-card px-16 py-8 flex items-center justify-center">
          <div className="w-full max-w-md">
            <BrandingName className="text-3xl font-semibold text-center text-primary mb-6 block" />

            {authError && (
              <div className="rounded-md w-full text-center bg-red-50 border border-red-200 px-3 py-2 mb-4">
                <div className="text-sm text-red-700">{authError}</div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">

              {/* Email */}
              <div>
                <Label className="text-primary">Email</Label>
                <Input
                  placeholder="example.xx@gov.et"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full h-14 mt-1 px-3 py-2   rounded-md text-sm border-blue-300 focus:ring-0 focus:outline-none focus:border-none"
                />
              </div>

              {/* Password */}
              <div>
                <Label className="text-primary">Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full h-14 px-3 py-2 pr-10 border rounded-md text-sm border-blue-300 focus:ring-0 focus:outline-none focus:border-none"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="h-5 w-5 text-[#0C4A6E]" />
                    ) : (
                      <EyeOffIcon className="h-5 w-5 text-[#0C4A6E]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="w-full text-right">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot Password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-primary h-14 hover:bg-primary/90 text-xl text-white py-2 rounded-md shadow-md"
              >
                Log In
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
