import type { PlanAccessRole } from "@/redux/types/plan";

export type PlanTreeAccessMode = "full" | "sector" | "direct" | "participant" | "none";

const OVERSIGHT_READ_ONLY_ROLES: PlanAccessRole[] = ["oversight", "global"];

export function isOversightReadOnlyAccessRole(
  role: PlanAccessRole | undefined | null
): boolean {
  return Boolean(role && OVERSIGHT_READ_ONLY_ROLES.includes(role));
}

export function planTreeAccessModeLabel(mode: PlanTreeAccessMode | undefined): string {
  switch (mode) {
    case "full":
      return "Full plan view";
    case "sector":
      return "Sector scope";
    case "direct":
      return "Direct assignment";
    case "none":
      return "No hierarchy access";
    default:
      return "Participant";
  }
}

export function planTreeAccessModeDescription(
  mode: PlanTreeAccessMode | undefined
): string {
  switch (mode) {
    case "full":
      return "You can browse the complete plan tree. Structure and lifecycle changes are read-only.";
    case "sector":
      return "You can browse nodes assigned to your sector and their descendants. Changes are read-only.";
    case "direct":
      return "You see only nodes assigned to you or your department, plus their ancestors.";
    case "none":
      return "You are linked to this plan but no hierarchy nodes are visible with your current access.";
    default:
      return "You have participant access based on your assignments.";
  }
}

export function planAccessRoleBadgeLabel(role: PlanAccessRole | undefined): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "global":
      return "Full plan";
    case "oversight":
      return "Sector scope";
    case "participant":
    default:
      return "Participant";
  }
}
