"use client";

import dynamic from "next/dynamic";
import { parseCanvasFieldValue } from "./canvasAnnotationTypes";
import { getFileUrl } from "@/utils/fileUrl";

const CanvasAnnotationEditor = dynamic(
  () =>
    import("./CanvasAnnotationEditor").then((m) => m.CanvasAnnotationEditor),
  { ssr: false, loading: () => <p className="text-sm text-muted-foreground">Loading…</p> }
);

type Props = {
  value: unknown;
  backgroundUrl: string;
  label?: string;
};

export function CanvasAnnotationDisplay({ value, backgroundUrl, label }: Props) {
  const parsed = parseCanvasFieldValue(value);
  if (!parsed) return null;

  const preview = parsed.preview_image;
  const previewSrc =
    preview && (preview.startsWith("data:") || preview.startsWith("http"))
      ? preview
      : preview
        ? getFileUrl(preview.replace(/^\/+/, ""))
        : null;

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt={label ? `${label} annotated diagram` : "Annotated diagram"}
          className="max-w-full rounded-md border object-contain"
        />
      ) : (
        <CanvasAnnotationEditor
          backgroundUrl={backgroundUrl}
          value={parsed}
          readOnly
          onChange={() => {}}
        />
      )}
    </div>
  );
}
