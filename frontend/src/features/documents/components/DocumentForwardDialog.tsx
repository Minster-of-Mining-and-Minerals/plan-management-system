"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { actionFeedback } from "@/components/action-feedback";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { useForwardDocumentMutation } from "@/redux/api/collaborationApi";

interface DocumentForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

export function DocumentForwardDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
}: DocumentForwardDialogProps) {
  const [userSearch, setUserSearch] = useState("");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [message, setMessage] = useState("");
  const [grantAccess, setGrantAccess] = useState(true);

  const { data: users = [], isLoading: isLoadingUsers } = useGetUsersQuery(
    { search: userSearch, page: 1, limit: 100 },
    { skip: !open }
  );
  const [forwardDocument, { isLoading }] = useForwardDocumentMutation();

  const handleForward = async () => {
    if (!recipientUserId) {
      actionFeedback.error("Select a recipient");
      return;
    }

    try {
      await forwardDocument({
        documentId,
        recipientUserId,
        message: message.trim() || undefined,
        grantAccess,
      }).unwrap();
      actionFeedback.success("Document forwarded");
      setRecipientUserId("");
      setMessage("");
      setGrantAccess(true);
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err?.data?.message || "Failed to forward document");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Forward document</DialogTitle>
          <DialogDescription>
            Send a notification with a link to &quot;{documentTitle}&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forward-user-search">Find recipient</Label>
            <Input
              id="forward-user-search"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by name or email"
            />
          </div>

          <div className="space-y-2">
            <Label>Recipient</Label>
            <Select value={recipientUserId} onValueChange={setRecipientUserId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select user"} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="forward-message">Message (optional)</Label>
            <Textarea
              id="forward-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add a note for the recipient"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Grant viewer access</p>
              <p className="text-xs text-muted-foreground">
                Give the recipient read access if they cannot open the document yet.
              </p>
            </div>
            <Switch checked={grantAccess} onCheckedChange={setGrantAccess} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleForward} disabled={isLoading || !recipientUserId}>
            Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
