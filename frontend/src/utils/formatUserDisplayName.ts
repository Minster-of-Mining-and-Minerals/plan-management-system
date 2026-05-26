import type { User } from "@/redux/types/user";

type TitleLike = { name: string } | null | undefined;

/**
 * Formats internal staff display name with professional title prefix.
 * Examples: "Dr. Hana Tesfaye", "Nurse Abel", "Mr. Daniel Bekele"
 */
export function formatUserDisplayName(
  fullName?: string | null,
  title?: TitleLike | string | null
): string {
  const name = fullName?.trim() || "";
  if (!name) return "—";

  const titleName =
    typeof title === "string"
      ? title.trim()
      : title?.name?.trim() || "";

  if (!titleName) return name;

  const needsSpace = !titleName.endsWith(".");
  return `${titleName}${needsSpace ? " " : ""}${name}`;
}

/** Resolve display name from a User record with internal profile. */
export function formatInternalUserDisplayName(user: User): string {
  const title =
    user.internalProfile?.titleRef?.name ??
    null;
  return formatUserDisplayName(user.full_name, title);
}
