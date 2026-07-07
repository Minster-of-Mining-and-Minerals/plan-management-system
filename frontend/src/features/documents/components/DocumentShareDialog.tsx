"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
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
import { actionFeedback } from "@/components/action-feedback";
import { useGetUsersQuery } from "@/redux/api/userApi";
import {
  useCreateDocumentShareMutation,
  useGetDocumentSharesQuery,
  useRevokeDocumentShareMutation,
} from "@/redux/api/collaborationApi";
import type { DocumentGrantRole } from "@/redux/types/document";

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
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<DocumentGrantRole>("viewer");

  const { data: shares = [], isLoading: isLoadingShares } = useGetDocumentSharesQuery(documentId, {
    skip: !open,
  });
  const { data: users = [], isLoading: isLoadingUsers } = useGetUsersQuery(
    { search: userSearch, page: 1, limit: 100 },
    { skip: !open }
  );
  const [createShare, { isLoading: isCreating }] = useCreateDocumentShareMutation();
  const [revokeShare, { isLoading: isRevoking }] = useRevokeDocumentShareMutation();

  const existingUserIds = useMemo(
    () =>
      new Set(
        shares.filter((share) => share.principal_type === "user").map((share) => share.principal_id)
      ),
    [shares]
  );

  const availableUsers = users.filter((user) => !existingUserIds.has(user.user_id));

  const handleShare = async () => {
    if (!selectedUserId) {
      actionFeedback.error("Select a user to share with");
      return;
    }

    try {
      await createShare({
        documentId,
        principalId: selectedUserId,
        role,
      }).unwrap();
      actionFeedback.success("Document access granted");
      setSelectedUserId("");
      setRole("viewer");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Grant access to &quot;{documentTitle}&quot; for specific users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-user-search">Find user</Label>
            <Input
              id="share-user-search"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by name or email"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select user"} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
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

          <div className="space-y-2">
            <Label>Current access</Label>
            <div className="rounded-lg border">
              {isLoadingShares ? (
                <p className="p-3 text-sm text-muted-foreground">Loading shares...</p>
              ) : shares.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No direct shares yet.</p>
              ) : (
                <ul className="divide-y">
                  {shares.map((share) => (
                    <li
                      key={share.document_grant_id}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {share.principal_name || share.principal_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {share.principal_type} · {share.principal_email || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{share.role}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleShare} disabled={isCreating || !selectedUserId}>
            Grant access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
