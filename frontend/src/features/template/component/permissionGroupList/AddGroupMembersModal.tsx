"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TableTabBar } from "@/components/common/TableTabBar";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import {
  useAddUsersToGroupMutation,
  useAddStructuresToGroupMutation,
  useAddDepartmentsToGroupMutation,
} from "@/redux/api/permissionGroupApi";
import { actionFeedback } from "@/components/action-feedback";
import { Building, Building2, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetInternalStructuresQuery } from "@/redux/api/internalStructureApi";
import { DIALOG_SCROLLABLE_CONTENT } from "@/lib/dialogLayout";
import { cn } from "@/lib/utils";

interface AddGroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  existingUserIds: string[];
  existingStructureIds: string[];
  existingDepartmentIds?: string[];
  isSpecialGroup?: boolean;
  linkedStructureIds?: string[];
}

export const AddGroupMembersModal: React.FC<AddGroupMembersModalProps> = ({
  isOpen,
  onClose,
  groupId,
  existingUserIds,
  existingStructureIds,
  existingDepartmentIds = [],
  isSpecialGroup = false,
  linkedStructureIds = [],
}) => {
  const [activeTab, setActiveTab] = useState("users");
  const [userSearch, setUserSearch] = useState("");
  const [structureSearch, setStructureSearch] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedStructureIds, setSelectedStructureIds] = useState<string[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);

  const singleLinkedStructureId =
    linkedStructureIds.length === 1 ? linkedStructureIds[0] : undefined;
  const canPickUsers = linkedStructureIds.length > 0;

  const userQueryParams = canPickUsers
    ? {
        search: userSearch || undefined,
        ...(singleLinkedStructureId
          ? { government_structure_id: singleLinkedStructureId }
          : {}),
      }
    : undefined;

  const { data: allUsers = [], isLoading: loadingUsers } = useGetUsersQuery(
    userQueryParams,
    { skip: !canPickUsers }
  );
  const { data: allStructures = [], isLoading: loadingStructures } = useGetGovernmentStructuresQuery({
    search: structureSearch,
  });
  const structureFilterId = linkedStructureIds.length === 1 ? linkedStructureIds[0] : undefined;
  const { data: allDepartments = [], isLoading: loadingDepartments } = useGetInternalStructuresQuery(
    structureFilterId ? { government_structure_id: structureFilterId } : undefined,
    { skip: !isSpecialGroup || !structureFilterId }
  );

  const [addUsers, { isLoading: isAddingUsers }] = useAddUsersToGroupMutation();
  const [addStructures, { isLoading: isAddingStructures }] = useAddStructuresToGroupMutation();
  const [addDepartments, { isLoading: isAddingDepartments }] = useAddDepartmentsToGroupMutation();

  const filteredUsers = allUsers.filter((user) => {
    if (existingUserIds.includes(user.user_id)) return false;
    if (linkedStructureIds.length > 1) {
      const structureId = user.government_structure_id;
      return structureId != null && linkedStructureIds.includes(structureId);
    }
    return true;
  });
  const filteredStructures = allStructures.filter(
    (s) => !existingStructureIds.includes(s.government_structure_id)
  );
  const filteredDepartments = allDepartments.filter(
    (department) =>
      !existingDepartmentIds.includes(department.internal_structure_id) &&
      (linkedStructureIds.length === 0 ||
        linkedStructureIds.includes(department.government_structure_id)) &&
      matchesDepartmentSearch(department, departmentSearch)
  );

  function matchesDepartmentSearch(
    department: { name: string },
    query: string
  ) {
    if (!query.trim()) return true;
    return department.name.toLowerCase().includes(query.trim().toLowerCase());
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleStructure = (structureId: string) => {
    setSelectedStructureIds((prev) =>
      prev.includes(structureId)
        ? prev.filter((id) => id !== structureId)
        : [...prev, structureId]
    );
  };

  const handleToggleDepartment = (departmentId: string) => {
    setSelectedDepartmentIds((prev) =>
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const handleSave = async () => {
    try {
      if (selectedUserIds.length > 0) {
        await addUsers({
          permission_group_id: groupId,
          user_ids: selectedUserIds,
        }).unwrap();
      }
      if (selectedStructureIds.length > 0) {
        await addStructures({
          permission_group_id: groupId,
          government_structure_ids: selectedStructureIds,
        }).unwrap();
      }
      if (selectedDepartmentIds.length > 0) {
        await addDepartments({
          permission_group_id: groupId,
          internal_structure_ids: selectedDepartmentIds,
        }).unwrap();
      }
      actionFeedback.success("Members added successfully");
      handleClose();
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === "object" &&
        "data" in error &&
        error.data &&
        typeof error.data === "object" &&
        "message" in error.data &&
        typeof error.data.message === "string"
          ? error.data.message
          : "Failed to add members";
      actionFeedback.error(message);
    }
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setSelectedStructureIds([]);
    setSelectedDepartmentIds([]);
    setUserSearch("");
    setStructureSearch("");
    setDepartmentSearch("");
    onClose();
  };

  const tabs = [
    { value: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    {
      value: "structures",
      label: "Sector Structures",
      icon: <Building className="h-4 w-4" />,
    },
    ...(isSpecialGroup
      ? [
          {
            value: "departments",
            label: "Departments",
            icon: <Building2 className="h-4 w-4" />,
          },
        ]
      : []),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(DIALOG_SCROLLABLE_CONTENT, "max-w-2xl bg-white")}>
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="text-golden-dark text-xl font-bold">Add Members to Group</DialogTitle>
        </DialogHeader>

        <TableTabBar
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
          className="mx-6 shrink-0"
        />

        {activeTab === "users" ? (
          <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
            {!canPickUsers ? (
              <div className="text-center py-8 text-gray-500">
                Link at least one sector structure to this group before adding users.
              </div>
            ) : (
              <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users in linked sectors..."
                className="pl-10"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
              {loadingUsers ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleToggleUser(user.user_id)}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-golden-dark focus:ring-golden-dark"
                      checked={selectedUserIds.includes(user.user_id)}
                      readOnly
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{user.full_name}</span>
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No eligible users found in the linked sector structures.
                </div>
              )}
            </div>
              </>
            )}
          </div>
        ) : activeTab === "structures" ? (
          <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sectors..."
                className="pl-10"
                value={structureSearch}
                onChange={(e) => setStructureSearch(e.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
              {loadingStructures ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))
              ) : filteredStructures.length > 0 ? (
                filteredStructures.map((structure) => (
                  <div
                    key={structure.government_structure_id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleToggleStructure(structure.government_structure_id)}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-golden-dark focus:ring-golden-dark"
                      checked={selectedStructureIds.includes(structure.government_structure_id)}
                      readOnly
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{structure.name}</span>
                      <span className="text-xs text-gray-500">Level {structure.level}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No sectors found</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
            {linkedStructureIds.length !== 1 ? (
              <div className="text-center py-8 text-gray-500">
                Link exactly one sector structure to this group before adding departments.
              </div>
            ) : (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search departments..."
                    className="pl-10"
                    value={departmentSearch}
                    onChange={(e) => setDepartmentSearch(e.target.value)}
                  />
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
                  {loadingDepartments ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))
                  ) : filteredDepartments.length > 0 ? (
                    filteredDepartments.map((department) => (
                      <div
                        key={department.internal_structure_id}
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          handleToggleDepartment(department.internal_structure_id)
                        }
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-golden-dark focus:ring-golden-dark"
                          checked={selectedDepartmentIds.includes(
                            department.internal_structure_id
                          )}
                          readOnly
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{department.name}</span>
                          <span className="text-xs text-gray-500">
                            Level {department.level}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No departments found
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isAddingUsers ||
              isAddingStructures ||
              isAddingDepartments ||
              (selectedUserIds.length === 0 &&
                selectedStructureIds.length === 0 &&
                selectedDepartmentIds.length === 0)
            }
          >
            {isAddingUsers || isAddingStructures || isAddingDepartments
              ? "Adding..."
              : "Add Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
