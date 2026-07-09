"use client";

import { useState } from "react";
import { MessageSquare, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TableTabBar } from "@/components/common/TableTabBar";
import { UserCheckboxSelectPanel } from "@/components/common/UserCheckboxSelectPanel";
import { actionFeedback } from "@/components/action-feedback";
import { useForwardDocumentMutation } from "@/redux/api/collaborationApi";
import { useGetUserByIdQuery } from "@/redux/api/userApi";

type ForwardTab = "recipient" | "message";

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
  const [activeTab, setActiveTab] = useState<ForwardTab>("recipient");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [grantAccess, setGrantAccess] = useState(true);

  const recipientUserId = selectedUserIds[0] ?? "";

  const [forwardDocument, { isLoading }] = useForwardDocumentMutation();
  const { data: selectedRecipient } = useGetUserByIdQuery(recipientUserId, {
    skip: !recipientUserId,
  });

  const tabs = [
    {
      value: "recipient" as const,
      label: "Recipient",
      icon: <User className="h-4 w-4" />,
    },
    {
      value: "message" as const,
      label: "Message",
      icon: <MessageSquare className="h-4 w-4" />,
      disabled: !recipientUserId,
    },
  ];

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveTab("recipient");
      setSelectedUserIds([]);
      setMessage("");
      setGrantAccess(true);
    }
    onOpenChange(nextOpen);
  };

  const handleForward = async () => {
    if (!recipientUserId) {
      actionFeedback.error("Select a recipient");
      setActiveTab("recipient");
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
      handleClose(false);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err?.data?.message || "Failed to forward document");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden bg-white sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-bold text-golden-dark">Forward document</DialogTitle>
          <DialogDescription>
            Send a notification with a link to &quot;{documentTitle}&quot;.
          </DialogDescription>
        </DialogHeader>

        <TableTabBar tabs={tabs} value={activeTab} onChange={setActiveTab} className="shrink-0" />

        {activeTab === "recipient" ? (
          <div className="flex min-h-0 flex-1 flex-col py-4">
            <UserCheckboxSelectPanel
              selectedUserIds={selectedUserIds}
              onSelectionChange={setSelectedUserIds}
              selectionMode="single"
              searchPlaceholder="Search users..."
              enabled={open}
              className="min-h-0 flex-1"
              listClassName="min-h-0 flex-1 overflow-y-auto"
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
            {selectedRecipient ? (
              <div className="shrink-0 rounded-lg border p-3">
                <p className="text-xs text-gray-500">Recipient</p>
                <p className="font-medium">{selectedRecipient.full_name}</p>
                <p className="text-sm text-gray-500">{selectedRecipient.email}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="forward-message">Message (optional)</Label>
              <Textarea
                id="forward-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Add a note for the recipient"
                rows={5}
              />
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Grant viewer access</p>
                <p className="text-xs text-muted-foreground">
                  Give the recipient read access if they cannot open the document yet.
                </p>
              </div>
              <Switch checked={grantAccess} onCheckedChange={setGrantAccess} />
            </div>
          </div>
        )}

        <DialogFooter className="mt-auto shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          {activeTab === "recipient" ? (
            <Button
              onClick={() => setActiveTab("message")}
              disabled={!recipientUserId}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleForward} disabled={isLoading || !recipientUserId}>
              {isLoading ? "Forwarding..." : "Forward"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
