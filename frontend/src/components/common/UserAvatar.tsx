"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getFileUrl } from "@/utils/fileUrl";

function getInitials(name: string): string {
  return (name || "U")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface UserAvatarProps {
  name: string;
  profileImage?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({
  name,
  profileImage,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const imageUrl = profileImage ? getFileUrl(profileImage) : undefined;

  return (
    <Avatar className={cn("h-9 w-9", className)}>
      {imageUrl ? (
        <AvatarImage src={imageUrl} alt={name} className="object-cover" />
      ) : null}
      <AvatarFallback className={cn("bg-primary/10 text-primary font-semibold", fallbackClassName)}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
