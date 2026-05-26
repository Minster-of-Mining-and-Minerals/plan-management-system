"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { DoctorInfo } from "../types";

export function DoctorAvatar({
  doctor,
  size = "md",
}: {
  doctor: Pick<DoctorInfo, "avatarInitials" | "name">;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";

  return (
    <Avatar className={sizeClass}>
      <AvatarFallback className="bg-gradient-to-br from-primary to-section-accent font-semibold text-primary-foreground">
        {doctor.avatarInitials}
      </AvatarFallback>
    </Avatar>
  );
}
