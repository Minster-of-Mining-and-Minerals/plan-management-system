"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeftIcon, Mail, ShieldCheck, Lock, EyeIcon, EyeOffIcon } from "lucide-react";
import { useRequestOTPMutation, useVerifyOTPMutation, useResetPasswordMutation } from "@/redux/api/authApi";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const otpSchema = z.object({
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});

const resetSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type EmailValues = z.infer<typeof emailSchema>;
type OtpValues = z.infer<typeof otpSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [requestOTPMutation, { isLoading: requesting }] = useRequestOTPMutation();
  const [verifyOTPMutation, { isLoading: verifying }] = useVerifyOTPMutation();
  const [resetPasswordMutation, { isLoading: resetting }] = useResetPasswordMutation();

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onEmailSubmit = async (values: EmailValues) => {
    try {
      await requestOTPMutation({ email: values.email }).unwrap();
      setEmail(values.email);
      setStep(2);
      toast.success("OTP sent to your email");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to send OTP");
    }
  };

  const onOtpSubmit = async (values: OtpValues) => {
    try {
      await verifyOTPMutation({ email, otp: values.otp }).unwrap();
      setOtp(values.otp);
      setStep(3);
      toast.success("OTP verified");
    } catch (error: any) {
      toast.error(error?.data?.message || "Invalid or expired OTP");
    }
  };

  const onResetSubmit = async (values: ResetValues) => {
    try {
      await resetPasswordMutation({
        email,
        otp,
        newPassword: values.newPassword
      }).unwrap();
      toast.success("Password reset successfully! Please login.");
      router.push("/login");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to reset password");
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC] flex items-center justify-center px-4 py-12">
      <div className="w-full relative max-w-6xl min-h-[80vh] shadow-2xl rounded-2xl border border-[#DCE7F1] overflow-hidden flex flex-col lg:flex-row bg-white">

        {/* Back Button */}
        <Button
          onClick={() => step === 1 ? router.push("/login") : setStep((prev) => (prev - 1) as any)}
          className="cursor-pointer shadow-none z-50 bg-transparent hover:bg-slate-100 p-2 top-4 left-4 absolute flex items-center gap-1"
        >
          <ArrowLeftIcon className="w-5 h-5 text-golden-dark" />
          <span className="text-sm text-golden-dark font-medium">Back</span>
        </Button>

        {/* Left Section */}
        <div className="w-full bg-[#F9FBFC] p-8 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#DCE7F1]">
          <div className="text-center">
            <img
              src="/logo-mom.png"
              alt="Organization Logo"
              className="h-64 lg:h-96 mx-auto mb-6 p-2"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="w-full px-8 lg:px-16 py-12 flex items-center justify-center">
          <div className="w-full max-w-md">

            {/* Step 1: Request OTP */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="bg-golden-light/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-golden-dark" />
                  </div>
                  <h1 className="text-3xl font-bold text-golden-dark mb-2">Forgot Password?</h1>
                  <p className="text-sm text-golden-dark/70">Enter your email and we'll send you an OTP to reset your password.</p>
                </div>

                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-golden-dark">Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="example@gov.et" {...field} className="h-14 border-golden-dark focus:ring-0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-golden-dark hover:bg-golden-dark/90 h-14 text-xl text-white font-semibold rounded-md shadow-md mt-6"
                      disabled={requesting}
                    >
                      {requesting ? "Sending OTP..." : "Send OTP"}
                    </Button>
                  </form>
                </Form>
              </div>
            )}

            {/* Step 2: Verify OTP */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="bg-golden-light/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="h-8 w-8 text-golden-dark" />
                  </div>
                  <h1 className="text-3xl font-bold text-golden-dark mb-2">Verify OTP</h1>
                  <p className="text-sm text-golden-dark/70">Enter the 6-digit code sent to <span className="font-bold">{email}</span></p>
                </div>

                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-golden-dark">6-Digit OTP</FormLabel>
                          <FormControl>
                            <Input placeholder="123456" maxLength={6} {...field} className="h-14 text-center text-2xl tracking-[1em] border-golden-dark focus:ring-0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-golden-dark hover:bg-golden-dark/90 h-14 text-xl text-white font-semibold rounded-md shadow-md mt-6"
                      disabled={verifying}
                    >
                      {verifying ? "Verifying..." : "Verify OTP"}
                    </Button>
                    <p className="text-center text-sm text-golden-dark/70 mt-4">
                      Didn't receive code? <button type="button" onClick={() => onEmailSubmit({ email })} className="text-golden-dark font-bold hover:underline">Resend</button>
                    </p>
                  </form>
                </Form>
              </div>
            )}

            {/* Step 3: Reset Password */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="bg-golden-light/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-8 w-8 text-golden-dark" />
                  </div>
                  <h1 className="text-3xl font-bold text-golden-dark mb-2">New Password</h1>
                  <p className="text-sm text-golden-dark/70">Set a strong password to secure your account.</p>
                </div>

                <Form {...resetForm}>
                  <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                    <FormField
                      control={resetForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-golden-dark">New Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                {...field}
                                className="h-14 border-golden-dark focus:ring-0 pr-10"
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute top-1/2 right-3 -translate-y-1/2"
                            >
                              {showPassword ? <EyeIcon className="h-5 w-5 text-golden-dark" /> : <EyeOffIcon className="h-5 w-5 text-golden-dark" />}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={resetForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-golden-dark">Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              {...field}
                              className="h-14 border-golden-dark focus:ring-0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-golden-dark hover:bg-golden-dark/90 h-14 text-xl text-white font-semibold rounded-md shadow-md mt-6"
                      disabled={resetting}
                    >
                      {resetting ? "Resetting..." : "Reset Password"}
                    </Button>
                  </form>
                </Form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
