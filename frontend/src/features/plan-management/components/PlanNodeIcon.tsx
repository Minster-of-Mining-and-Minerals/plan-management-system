import { Flag, Target, BarChart3, CheckSquare } from "lucide-react";

export function PlanNodeIcon({ type, className = "h-4 w-4" }: { type: string; className?: string }) {
    switch (type) {
        case "strategic":
            return <Flag className={`${className} text-purple-500`} />;
        case "goal":
            return <Target className={`${className} text-blue-500`} />;
        case "kpi":
            return <BarChart3 className={`${className} text-green-500`} />;
        case "task":
            return <CheckSquare className={`${className} text-orange-500`} />;
        default:
            return null;
    }
}
