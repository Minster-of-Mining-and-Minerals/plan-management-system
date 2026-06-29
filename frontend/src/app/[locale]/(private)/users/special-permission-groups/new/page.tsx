import CreatePermissionGroup from "@/features/template/component/permissionGroupList/CreatePermissionGroup";
import { SPECIAL_PERMISSION_GROUP_CONFIG } from "@/features/template/component/permissionGroupList/permissionGroupSectionConfig";

export default function NewSpecialPermissionGroupPage() {
  return <CreatePermissionGroup config={SPECIAL_PERMISSION_GROUP_CONFIG} />;
}
