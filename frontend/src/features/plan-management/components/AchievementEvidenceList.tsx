"use client";

import { Paperclip } from "lucide-react";
import { useGetAttachmentsQuery } from "@/redux/api/attachementApi";
import { getFileUrl } from "@/utils/fileUrl";
import { cn } from "@/lib/utils";

/** Read-only list of evidence documents submitted with an achievement. */
export function AchievementEvidenceList({
    attachmentIds,
    className,
}: {
    attachmentIds?: string[] | null;
    className?: string;
}) {
    const ids = attachmentIds ?? [];
    const { data } = useGetAttachmentsQuery(undefined, { skip: ids.length === 0 });
    if (ids.length === 0) return null;

    const all = data?.attachments ?? [];
    const files = ids.map((id) => {
        const found = all.find((attachment) => attachment.attachment_id === id);
        return {
            id,
            name: found?.file_name ?? "Evidence document",
            url: found ? getFileUrl(found.file_path) : null,
        };
    });

    return (
        <div className={cn("space-y-1", className)} onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                Evidence ({files.length})
            </p>
            <ul className="flex flex-wrap gap-1.5">
                {files.map((file) => (
                    <li key={file.id}>
                        {file.url ? (
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex max-w-[220px] items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-primary hover:underline"
                                title={file.name}
                            >
                                <span className="truncate">{file.name}</span>
                            </a>
                        ) : (
                            <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                                {file.name}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
