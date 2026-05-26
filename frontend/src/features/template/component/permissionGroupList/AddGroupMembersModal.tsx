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
import { useGetUsersQuery } from "@/redux/api/userApi";
import { useAddUsersToGroupMutation } from "@/redux/api/permissionGroupApi";
import { toast } from "sonner";
import { formatInternalUserDisplayName } from "@/utils/formatUserDisplayName";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface AddGroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  existingUserIds: string[];
}

export const AddGroupMembersModal: React.FC<AddGroupMembersModalProps> = ({
  isOpen,
  onClose,
  groupId,
  existingUserIds,
}) => {
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const { data: allUsers = [], isLoading: loadingUsers } = useGetUsersQuery({
    search: userSearch,
  });

  const [addUsers, { isLoading: isAddingUsers }] = useAddUsersToGroupMutation();

  const filteredUsers = allUsers.filter((u) => !existingUserIds.includes(u.user_id));

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
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
      toast.success("Members added successfully");
      handleClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to add members");
    }
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setUserSearch("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-white max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-section-accent text-xl font-bold">Add Members to Group</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 py-4">
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
                    className="h-4 w-4 rounded border-gray-300 text-section-accent focus:ring-section-accent"
                    checked={selectedUserIds.includes(user.user_id)}
                    readOnly
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{formatInternalUserDisplayName(user)}</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No users found</div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-auto">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isAddingUsers || selectedUserIds.length === 0}
          >
            {isAddingUsers ? "Adding..." : "Add Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
