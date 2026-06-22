"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { FileUploadField } from "@/components/common/FileUploadField";
import { actionFeedback } from "@/components/action-feedback";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
  useCreateNoteMutation,
  useGetNoteByIdQuery,
  useUpdateNoteMutation,
} from "@/redux/api/noteApi";
import { NOTES_UPDATE } from "@/redux/types/note";

interface NoteEditorPageProps {
  noteId?: string;
}

export default function NoteEditorPage({ noteId }: NoteEditorPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = !noteId;
  const forceEdit = searchParams.get("edit") === "1";

  const { data: note, isLoading } = useGetNoteByIdQuery(noteId!, { skip: isNew });
  const [createNote, { isLoading: isCreating }] = useCreateNoteMutation();
  const [updateNote, { isLoading: isUpdating }] = useUpdateNoteMutation();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(isNew || forceEdit);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setIsPinned(note.is_pinned);
      setAttachmentIds(note.attachments?.map((a) => a.attachment_id) ?? []);
      if (!forceEdit) setIsEditing(false);
    }
  }, [note, forceEdit]);

  const isSaving = isCreating || isUpdating;
  const readOnly = !isNew && !isEditing;

  const save = async () => {
    if (!title.trim()) {
      actionFeedback.error("Title is required");
      return;
    }

    const payload = {
      title: title.trim(),
      content,
      is_pinned: isPinned,
      ...(attachmentIds.length > 0 || !isNew
        ? { attachment_ids: attachmentIds }
        : {}),
    };

    try {
      if (isNew) {
        await createNote(payload).unwrap();
      } else {
        await updateNote({ id: noteId!, body: payload }).unwrap();
      }
      actionFeedback.success("Note saved");
      router.push("/settings/notes");
    } catch (error: any) {
      actionFeedback.error(error?.data?.message || "Failed to save note");
    }
  };

  if (!isNew && isLoading) return <Loading01 />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/settings/notes")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Notes
        </Button>
        {!isNew && readOnly && (
          <PermissionGuard requireAny={[...NOTES_UPDATE]}>
            <Button onClick={() => setIsEditing(true)}>Edit Note</Button>
          </PermissionGuard>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">
                {isNew ? "Create Note" : readOnly ? "View Note" : "Edit Note"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                  disabled={readOnly}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="pinned"
                  checked={isPinned}
                  onCheckedChange={setIsPinned}
                  disabled={readOnly}
                />
                <Label htmlFor="pinned" className="flex items-center gap-1">
                  <Pin className="h-4 w-4" /> Pin Note
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <RichTextEditor value={content} onChange={setContent} readOnly={readOnly} />
              </div>

              {!readOnly && (
                <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                  <Button type="button" disabled={isSaving} onClick={save}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push("/settings/notes")}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-primary">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadField
                id="note-attachments"
                label="Files"
                value={attachmentIds}
                onChange={setAttachmentIds}
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.png,.jpg,.jpeg,.webp,.txt,image/*"
                fieldClass={readOnly ? "pointer-events-none opacity-70" : ""}
              />
            </CardContent>
          </Card>

          {note && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-primary">Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Pinned</p>
                  <p className="font-medium">{note.is_pinned ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created Date</p>
                  <p className="font-medium">{new Date(note.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated Date</p>
                  <p className="font-medium">{new Date(note.updated_at).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
