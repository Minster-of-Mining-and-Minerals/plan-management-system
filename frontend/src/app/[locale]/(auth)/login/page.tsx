"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/auth";
import { login } from "@/actions/user";

export default function ExternalLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData.email, formData.password, "formData");
    const result = await login(formData.email as string, formData.password as string);
    console.log(result, "result");
    if (result?.error) {
      setAuthError(result.error);
    }

    if (result?.success) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC]  flex items-center justify-center px-4">
      <div className="w-full relative max-w-6xl min-h-[80vh] shadow-2xl rounded-2xl border border-[#DCE7F1] overflow-hidden flex flex-col lg:flex-row">
        
        {/* Back Button */}
        <Button
          onClick={() => router.push("/")}
          className="cursor-pointer shadow-none z-50 bg-transparent hover:bg-slate-100 p-2 top-4 left-4 absolute flex items-center gap-1"
        >
          <ArrowLeftIcon className="w-5 h-5 text-[#0C4A6E]" />
          <span className="text-sm text-[#0C4A6E] font-medium">Back</span>
        </Button>

        {/* Left Section */}
        <div className="w-full bg-cover bg-center p-8 flex items-center justify-center">
          <div className="backdrop-blur-md p-6 rounded-xl text-center">
            <img
              src="/logo-aii.png"
              alt="Organization Logo"
              className="h-72 mx-auto mb-3 rounded-xl p-2"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="w-full px-16 py-8 flex items-center justify-center">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-semibold text-center text-[#0C4A6E] mb-6">
              Login
            </h1>

            {authError && (
              <div className="rounded-md w-full text-center bg-red-50 border border-red-200 px-3 py-2 mb-4">
                <div className="text-sm text-red-700">{authError}</div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">

              {/* Email */}
              <div>
                <Label className="text-[#0C4A6E]">Email</Label>
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
                <Label className="text-[#0C4A6E]">Password</Label>
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
                <Link href="/forgot-password" className="text-sm text-[#0C4A6E] hover:underline">
                  Forgot Password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-[#073954] h-14 hover:bg-[#073954]/90 text-xl text-white py-2 rounded-md shadow-md"
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
