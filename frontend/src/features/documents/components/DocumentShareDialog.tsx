"use client";

import { useMemo, useState } from "react";
import { Trash2, UserPlus, Users, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TableTabBar } from "@/components/common/TableTabBar";
import { UserCheckboxSelectPanel } from "@/components/common/UserCheckboxSelectPanel";
import { actionFeedback } from "@/components/action-feedback";
import {
  useCreateDocumentShareMutation,
  useGetDocumentSharesQuery,
  useRevokeDocumentShareMutation,
} from "@/redux/api/collaborationApi";
import type { DocumentGrant, DocumentGrantRole } from "@/redux/types/document";

type ShareTab = "add_users" | "current_users";

function matchesShareSearch(share: DocumentGrant, query: string) {
  if (!query.trim()) return true;

  const normalized = query.trim().toLowerCase();
  const fields = [
    share.principal_name,
    share.principal_email,
    share.principal_type,
    share.role,
    share.principal_id,
  ];

  return fields.some((field) => field?.toLowerCase().includes(normalized));
}

interface DocumentShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

export function DocumentShareDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
}: DocumentShareDialogProps) {
  const [activeTab, setActiveTab] = useState<ShareTab>("add_users");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sharedUserSearch, setSharedUserSearch] = useState("");
  const [role, setRole] = useState<DocumentGrantRole>("viewer");

  const { data: shares = [], isLoading: isLoadingShares } = useGetDocumentSharesQuery(documentId, {
    skip: !open,
  });
  const [createShare, { isLoading: isCreating }] = useCreateDocumentShareMutation();
  const [revokeShare, { isLoading: isRevoking }] = useRevokeDocumentShareMutation();

  const existingUserIds = useMemo(
    () =>
      shares
        .filter((share) => share.principal_type === "user")
        .map((share) => share.principal_id),
    [shares]
  );

  const filteredShares = useMemo(
    () => shares.filter((share) => matchesShareSearch(share, sharedUserSearch)),
    [shares, sharedUserSearch]
  );

  const tabs = [
    {
      value: "add_users" as const,
      label: "Add Users",
      icon: <UserPlus className="h-4 w-4" />,
    },
    {
      value: "current_users" as const,
      label: `Shared Users (${shares.length})`,
      icon: <Users className="h-4 w-4" />,
    },
  ];

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveTab("add_users");
      setSelectedUserIds([]);
      setSharedUserSearch("");
      setRole("viewer");
    }
    onOpenChange(nextOpen);
  };

  const handleShare = async () => {
    if (selectedUserIds.length === 0) {
      actionFeedback.error("Select at least one user to share with");
      return;
    }

    try {
      await Promise.all(
        selectedUserIds.map((principalId) =>
          createShare({
            documentId,
            principalId,
            role,
          }).unwrap()
        )
      );
      actionFeedback.success(
        selectedUserIds.length === 1
          ? "Document access granted"
          : `Document access granted to ${selectedUserIds.length} users`
      );
      setSelectedUserIds([]);
      setRole("viewer");
      setActiveTab("current_users");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err?.data?.message || "Failed to share document");
    }
  };

  const handleRevoke = async (grantId: string, name: string) => {
    if (
      !(await actionFeedback.confirm(`Remove access for "${name}"?`, {
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      await revokeShare({ documentId, grantId }).unwrap();
      actionFeedback.success("Share removed");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err?.data?.message || "Failed to remove share");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden bg-white sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-bold text-golden-dark">Share document</DialogTitle>
          <DialogDescription>
            Grant access to &quot;{documentTitle}&quot; for specific users.
          </DialogDescription>
        </DialogHeader>

        <TableTabBar tabs={tabs} value={activeTab} onChange={setActiveTab} className="shrink-0" />

        {activeTab === "add_users" ? (
          <div className="flex min-h-0 flex-1 flex-col py-4">
            <UserCheckboxSelectPanel
              selectedUserIds={selectedUserIds}
              onSelectionChange={setSelectedUserIds}
              excludeUserIds={existingUserIds}
              selectionMode="multiple"
              enabled={open}
              className="min-h-0 flex-1"
              listClassName="min-h-0 flex-1 overflow-y-auto"
            />

            <div className="mt-4 shrink-0 space-y-2">
              <Label>Access level</Label>
              <Select value={role} onValueChange={(value) => setRole(value as DocumentGrantRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col py-4">
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search shared users..."
                className="pl-10"
                value={sharedUserSearch}
                onChange={(event) => setSharedUserSearch(event.target.value)}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-white">
              {isLoadingShares ? (
                <p className="p-3 text-sm text-muted-foreground">Loading shares...</p>
              ) : shares.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No users have access yet.</div>
              ) : filteredShares.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No shared users found</div>
              ) : (
                <ul className="divide-y">
                  {filteredShares.map((share) => (
                    <li
                      key={share.document_grant_id}
                      className="flex shrink-0 items-start justify-between gap-3 p-3 hover:bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {share.principal_name || share.principal_id}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {share.principal_email || share.principal_type}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {share.role}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          disabled={isRevoking}
                          onClick={() =>
                            handleRevoke(
                              share.document_grant_id,
                              share.principal_name || share.principal_id
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-auto shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Close
          </Button>
          {activeTab === "add_users" ? (
            <Button onClick={handleShare} disabled={isCreating || selectedUserIds.length === 0}>
              {isCreating ? "Granting..." : "Grant access"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
