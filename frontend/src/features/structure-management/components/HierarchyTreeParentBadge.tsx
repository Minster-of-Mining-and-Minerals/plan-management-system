import { GitForkIcon } from "lucide-react";

interface HierarchyTreeParentBadgeProps {
  parentName: string;
  variant?: "department" | "government";
}

export function HierarchyTreeParentBadge({
  parentName,
  variant = "department",
}: HierarchyTreeParentBadgeProps) {
  const variantClass =
    variant === "department"
      ? "bg-primary/10 text-primary/80"
      : "bg-primary/10 text-primary/70";

  return (
    <div
      className={`mb-2 flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] ${variantClass}`}
      title={`Parent: ${parentName}`}
    >
      <GitForkIcon className="h-3 w-3 shrink-0 rotate-180" />
      <span className="min-w-0 truncate">Parent: {parentName}</span>
    </div>
  );
}
