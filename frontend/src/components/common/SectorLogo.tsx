"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileUrl } from "@/utils/fileUrl";

const sizeClasses = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
} as const;

const iconSizeClasses = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-7 w-7",
  xl: "h-10 w-10",
} as const;

export function resolveSectorLogoPath(logoPath?: string | null): string | null {
  if (!logoPath || typeof logoPath !== "string") return null;
  const trimmed = logoPath.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface SectorLogoProps {
  name: string;
  logoPath?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  showRing?: boolean;
}

export function SectorLogo({
  name,
  logoPath,
  size = "sm",
  className,
  imageClassName,
  fallbackClassName,
  showRing = false,
}: SectorLogoProps) {
  const normalizedPath = resolveSectorLogoPath(logoPath);
  const imageUrl = normalizedPath ? getFileUrl(normalizedPath) : null;

  if (!imageUrl) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10",
          sizeClasses[size],
          className
        )}
        title={name}
      >
        <Building2
          className={cn("text-primary", iconSizeClasses[size], fallbackClassName)}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <Avatar
      className={cn(
        "shrink-0",
        sizeClasses[size],
        showRing && "ring-2 ring-primary/20 ring-offset-2 ring-offset-background shadow-sm",
        className
      )}
      title={name}
    >
      <AvatarImage
        src={imageUrl}
        alt={`${name} logo`}
        className={cn("object-cover", imageClassName)}
      />
      <AvatarFallback className={cn("bg-primary/10", fallbackClassName)}>
        <Building2 className={cn("text-primary", iconSizeClasses[size])} aria-hidden />
      </AvatarFallback>
    </Avatar>
  );
}
