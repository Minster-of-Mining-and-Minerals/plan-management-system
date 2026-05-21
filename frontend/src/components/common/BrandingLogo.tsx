"use client";

import Image from "next/image";
import { useBranding } from "@/providers/BrandingProvider";

interface BrandingLogoProps {
  variant?: "compact" | "login";
  width?: number;
  height?: number;
  className?: string;
}

export function BrandingLogo({
  variant = "compact",
  width,
  height,
  className = "",
}: BrandingLogoProps) {
  const { branding } = useBranding();
  const src = variant === "login" ? branding.logo_login_url : branding.logo_url;
  const alt = branding.system_name;

  const defaultSize =
    variant === "login"
      ? { width: width ?? 288, height: height ?? 288 }
      : { width: width ?? 100, height: height ?? 100 };

  return (
    <Image
      src={src}
      alt={alt}
      width={defaultSize.width}
      height={defaultSize.height}
      className={className}
      unoptimized={src.startsWith("http")}
    />
  );
}

export function BrandingName({
  locale = "en",
  className = "",
}: {
  locale?: "en" | "am";
  className?: string;
}) {
  const { branding } = useBranding();
  const name =
    locale === "am" && branding.system_name_am
      ? branding.system_name_am
      : branding.system_name;

  return <span className={className}>{name}</span>;
}
