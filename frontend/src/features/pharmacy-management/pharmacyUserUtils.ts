import type {
  PharmacyUserProfileApi,
  PharmacyUserRow,
} from "@/redux/types/pharmacy";

export function normalizePharmacyUsers(
  users: PharmacyUserProfileApi[] | undefined
): PharmacyUserRow[] {
  if (!users?.length) return [];

  return users.map((profile) => ({
    pharmacy_user_profile_id: profile.pharmacy_user_profile_id,
    user_id: profile.user_id,
    pharmacy_id: profile.pharmacy_id,
    full_name: profile.user?.full_name ?? "",
    email: profile.user?.email ?? "",
    phone_number: profile.user?.phone_number ?? null,
    is_active: profile.user?.is_active ?? profile.is_active ?? true,
    portal_role: profile.portal_role,
  }));
}

export const PORTAL_ROLE_LABELS: Record<PharmacyUserRow["portal_role"], string> = {
  admin: "Admin",
  staff: "Staff",
};
