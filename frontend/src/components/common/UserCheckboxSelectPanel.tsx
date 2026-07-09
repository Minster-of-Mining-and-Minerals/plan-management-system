"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { cn } from "@/lib/utils";

interface UserCheckboxSelectPanelProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  excludeUserIds?: string[];
  selectionMode?: "single" | "multiple";
  searchPlaceholder?: string;
  emptyMessage?: string;
  enabled?: boolean;
  className?: string;
  listClassName?: string;
}

export function UserCheckboxSelectPanel({
  selectedUserIds,
  onSelectionChange,
  excludeUserIds = [],
  selectionMode = "multiple",
  searchPlaceholder = "Search users...",
  emptyMessage = "No users found",
  enabled = true,
  className,
  listClassName,
}: UserCheckboxSelectPanelProps) {
  const [userSearch, setUserSearch] = useState("");
  const { data: allUsers = [], isLoading } = useGetUsersQuery(
    { search: userSearch },
    { skip: !enabled }
  );

  const excludedIds = new Set(excludeUserIds);
  const filteredUsers = allUsers.filter((user) => !excludedIds.has(user.user_id));

  const handleToggleUser = (userId: string) => {
    if (selectionMode === "single") {
      onSelectionChange(selectedUserIds.includes(userId) ? [] : [userId]);
      return;
    }

    onSelectionChange(
      selectedUserIds.includes(userId)
        ? selectedUserIds.filter((id) => id !== userId)
        : [...selectedUserIds, userId]
    );
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder={searchPlaceholder}
          className="pl-10"
          value={userSearch}
          onChange={(event) => setUserSearch(event.target.value)}
          disabled={!enabled}
        />
      </div>

      <div
        className={cn(
          "space-y-2 overflow-y-auto pr-2",
          listClassName ?? "min-h-[12rem] max-h-48"
        )}
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.user_id}
              className="flex shrink-0 cursor-pointer items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50"
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
          <div className="py-8 text-center text-gray-500">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
