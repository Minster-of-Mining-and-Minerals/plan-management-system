import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActiveStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export function ActiveStatusBadge({ isActive, className }: ActiveStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        isActive
          ? "bg-green-50 text-green-700 border-green-100"
          : "bg-gray-50 text-gray-500 border-gray-200",
        className
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
