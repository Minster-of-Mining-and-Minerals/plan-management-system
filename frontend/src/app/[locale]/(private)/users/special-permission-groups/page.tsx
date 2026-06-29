import PermissionGroupList from "@/features/template/component/permissionGroupList/PermissionGroupList";
import { SPECIAL_PERMISSION_GROUP_CONFIG } from "@/features/template/component/permissionGroupList/permissionGroupSectionConfig";

export default function SpecialPermissionGroupsPage() {
  return <PermissionGroupList config={SPECIAL_PERMISSION_GROUP_CONFIG} />;
}
