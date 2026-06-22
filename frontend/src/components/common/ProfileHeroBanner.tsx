import { cn } from "@/lib/utils";

interface ProfileHeroBannerProps {
  children: React.ReactNode;
  className?: string;
}

/** Profile card header — uses system branding primary color via CSS variables. */
export function ProfileHeroBanner({ children, className }: ProfileHeroBannerProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-br from-primary via-primary/95 to-primary/75 text-primary-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
