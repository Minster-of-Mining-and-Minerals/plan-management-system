"use client";
import { ActionButton } from "@/types/tableLayout";
import { Building, Building2, Users, UserPlus } from "lucide-react";
import { useState } from "react";
import UsersGroupList from "./UsersGroupList";
import GovernmentStructuresGroupList from "./GovernmentStructuresGroupList";
import DepartmentsGroupList from "./DepartmentsGroupList";
import { useGetPermissionGroupByIdQuery } from "@/redux/api/permissionGroupApi";
import { AddGroupMembersModal } from "./AddGroupMembersModal";
import {
  PermissionGroupSectionConfig,
  STANDARD_PERMISSION_GROUP_CONFIG,
} from "./permissionGroupSectionConfig";

interface GroupManagementProps {
  groupId?: string;
  readOnly?: boolean;
  config?: PermissionGroupSectionConfig;
}

type GroupTab = "users" | "government_structures" | "departments";

function GroupManagement({
  groupId,
  readOnly = false,
  config = STANDARD_PERMISSION_GROUP_CONFIG,
}: GroupManagementProps) {
  const isSpecial = config.groupKind === "special";
  const [activeTab, setActiveTab] = useState<GroupTab>("users");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: group, isLoading } = useGetPermissionGroupByIdQuery(groupId as string, {
    skip: !groupId,
  });

  const sideActions: ActionButton[] = [
    {
      label: "Users",
      icon: <Users className="h-4 w-4" />,
      variant: activeTab === "users" ? "default" : "outline",
      size: "default",
      onClick: () => setActiveTab("users"),
    },
    {
      label: "Sector Structures",
      icon: <Building className="h-4 w-4" />,
      variant: activeTab === "government_structures" ? "default" : "outline",
      size: "default",
      onClick: () => setActiveTab("government_structures"),
    },
    ...(isSpecial
      ? [
          {
            label: "Departments",
            icon: <Building2 className="h-4 w-4" />,
            variant: (activeTab === "departments" ? "default" : "outline") as
              | "default"
              | "outline",
            size: "default" as const,
            onClick: () => setActiveTab("departments"),
          },
        ]
      : []),
  ];

  const actions: ActionButton[] =
    groupId && !readOnly
      ? [
          {
            label: "Add Member",
            icon: <UserPlus className="h-4 w-4" />,
            variant: "default",
            onClick: () => setIsAddModalOpen(true),
          },
        ]
      : [];

  if (!groupId) return null;

  return (
    <div className="space-y-4 mt-8 pt-8 border-t w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-golden-dark">Group Members</h3>
      </div>

      {activeTab === "users" && (
        <UsersGroupList
          sideActions={sideActions}
          actions={actions}
          users={group?.users || []}
          groupId={readOnly ? undefined : groupId}
          isLoading={isLoading}
        />
      )}
      {activeTab === "government_structures" && (
        <GovernmentStructuresGroupList
          sideActions={sideActions}
          actions={actions}
          structures={group?.structures || []}
          groupId={readOnly ? undefined : groupId}
          isLoading={isLoading}
        />
      )}
      {isSpecial && activeTab === "departments" && (
        <DepartmentsGroupList
          sideActions={sideActions}
          actions={actions}
          departments={group?.internalStructures || []}
          groupId={readOnly ? undefined : groupId}
          isLoading={isLoading}
        />
      )}

      <AddGroupMembersModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        groupId={groupId}
        existingUserIds={group?.users?.map((u) => u.user_id) || []}
        existingStructureIds={group?.structures?.map((s) => s.government_structure_id) || []}
        existingDepartmentIds={
          group?.internalStructures?.map((d) => d.internal_structure_id) || []
        }
        isSpecialGroup={isSpecial}
        linkedStructureIds={group?.structures?.map((s) => s.government_structure_id) || []}
      />
    </div>
  );
}

export default GroupManagement;
