"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FileUploadField } from "@/components/common/FileUploadField";
import { useGetUserByIdQuery, useUpdateUserMutation } from "@/redux/api/userApi";
import { getAttachmentFileUrl, getFileUrl } from "@/utils/fileUrl";

type Props = {
  userId: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function UserSignatureSettings({ userId }: Props) {
  const { data: user, refetch } = useGetUserByIdQuery(userId);
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  const [signatureFile, setSignatureFile] = useState<string>("");
  const [signatureEnabled, setSignatureEnabled] = useState(false);

  useEffect(() => {
    const profile = user?.internalProfile;
    setSignatureFile(profile?.signature_file || "");
    setSignatureEnabled(Boolean(profile?.signature_enabled && profile?.signature_file));
  }, [user]);

  const previewUrl = signatureFile
    ? UUID_RE.test(signatureFile.trim())
      ? getAttachmentFileUrl(signatureFile.trim())
      : getFileUrl(signatureFile)
    : null;

  const save = async (overrides?: {
    signature_file?: string | null;
    signature_enabled?: boolean;
  }) => {
    try {
      await updateUser({
        id: userId,
        data: {
          signature_file:
            overrides?.signature_file !== undefined
              ? overrides.signature_file
              : signatureFile || null,
          signature_enabled:
            overrides?.signature_enabled !== undefined
              ? overrides.signature_enabled
              : signatureEnabled,
        },
      }).unwrap();
      toast.success("Signature settings saved");
      refetch();
    } catch {
      toast.error("Failed to save signature settings");
    }
  };

  const removeSignature = async () => {
    setSignatureFile("");
    setSignatureEnabled(false);
    await save({ signature_file: null, signature_enabled: false });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prescription signature</CardTitle>
        <p className="text-xs text-muted-foreground">
          Used on printed prescriptions when you select &quot;Use my signature&quot;. Upload
          via the attachment system.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUploadField
          id="user_signature_file"
          label="Signature image"
          value={signatureFile}
          multiple={false}
          valueFormat="attachmentIds"
          onChange={(v) => {
            const next = typeof v === "string" ? v : Array.isArray(v) ? v[0] || "" : "";
            setSignatureFile(next);
            if (!next) setSignatureEnabled(false);
          }}
          accept="image/*"
        />

        {previewUrl && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Signature preview"
              className="max-h-24 object-contain"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div>
            <Label htmlFor="sig-enabled">Enable my signature on prescriptions</Label>
            <p className="text-xs text-muted-foreground">
              Disabled until a signature file is uploaded.
            </p>
          </div>
          <Switch
            id="sig-enabled"
            checked={signatureEnabled}
            disabled={!signatureFile}
            onCheckedChange={(v) => setSignatureEnabled(v)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => save()} disabled={isLoading}>
            Save signature
          </Button>
          {signatureFile && (
            <Button
              type="button"
              variant="outline"
              onClick={removeSignature}
              disabled={isLoading}
            >
              Remove signature
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
