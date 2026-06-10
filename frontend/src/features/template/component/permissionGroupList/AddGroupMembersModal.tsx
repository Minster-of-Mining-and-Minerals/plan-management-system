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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import {
  useAddUsersToGroupMutation,
  useAddStructuresToGroupMutation,
} from "@/redux/api/permissionGroupApi";
import { actionFeedback } from "@/components/action-feedback";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface AddGroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  existingUserIds: string[];
  existingStructureIds: string[];
}

export const AddGroupMembersModal: React.FC<AddGroupMembersModalProps> = ({
  isOpen,
  onClose,
  groupId,
  existingUserIds,
  existingStructureIds,
}) => {
  const [activeTab, setActiveTab] = useState("users");
  const [userSearch, setUserSearch] = useState("");
  const [structureSearch, setStructureSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedStructureIds, setSelectedStructureIds] = useState<string[]>([]);

  const { data: allUsers = [], isLoading: loadingUsers } = useGetUsersQuery({
    search: userSearch,
  });
  const { data: allStructures = [], isLoading: loadingStructures } = useGetGovernmentStructuresQuery({
    search: structureSearch,
  });

  const [addUsers, { isLoading: isAddingUsers }] = useAddUsersToGroupMutation();
  const [addStructures, { isLoading: isAddingStructures }] = useAddStructuresToGroupMutation();

  const filteredUsers = allUsers.filter((u) => !existingUserIds.includes(u.user_id));
  const filteredStructures = allStructures.filter(
    (s) => !existingStructureIds.includes(s.government_structure_id)
  );

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
      actionFeedback.success("Members added successfully");
      handleClose();
    } catch (error: any) {
      actionFeedback.error(error?.data?.message || "Failed to add members");
    }
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setSelectedStructureIds([]);
    setUserSearch("");
    setStructureSearch("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-white max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-golden-dark text-xl font-bold">Add Members to Group</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="structures">Sector Structures</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="flex-1 flex flex-col min-h-0 py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                className="pl-10"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
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
                <div className="text-center py-8 text-gray-500">No users found</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="structures" className="flex-1 flex flex-col min-h-0 py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sectors..."
                className="pl-10"
                value={structureSearch}
                onChange={(e) => setStructureSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
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
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4 border-t mt-auto">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isAddingUsers ||
              isAddingStructures ||
              (selectedUserIds.length === 0 && selectedStructureIds.length === 0)
            }
          >
            {isAddingUsers || isAddingStructures ? "Adding..." : "Add Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
