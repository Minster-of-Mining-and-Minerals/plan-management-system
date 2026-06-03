"use client";

import dynamic from "next/dynamic";
import { useClientMounted } from "@/hooks/useClientMounted";
import { parseCanvasFieldValue } from "./canvasAnnotationTypes";
import { resolveCanvasPreviewSrc } from "./canvasAnnotationUtils";

const CanvasAnnotationEditor = dynamic(
  () =>
    import("./CanvasAnnotationEditor").then((m) => m.CanvasAnnotationEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[320px] items-center justify-center rounded-md border bg-muted/20"
        aria-hidden
      >
        <p className="text-sm text-muted-foreground">Loading diagram…</p>
      </div>
    ),
  }
);

type Props = {
  value: unknown;
  backgroundUrl: string;
  label?: string;
};

export function CanvasAnnotationDisplay({ value, backgroundUrl, label }: Props) {
  const mounted = useClientMounted();
  const parsed = parseCanvasFieldValue(value);
  if (!parsed) return null;

  const hasAnnotations = parsed.canvas_data.annotations.objects.length > 0;
  const previewSrc = mounted ? resolveCanvasPreviewSrc(parsed.preview_image) || null : null;

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      {mounted ? (
        <CanvasAnnotationEditor
          backgroundUrl={backgroundUrl}
          value={parsed}
          readOnly
          onChange={() => {}}
        />
      ) : (
        <div
          className="flex h-[320px] items-center justify-center rounded-md border bg-muted/20"
          aria-hidden
        >
          <p className="text-sm text-muted-foreground">Loading diagram…</p>
        </div>
      )}
      {previewSrc && hasAnnotations && (
        <p className="text-xs text-muted-foreground">
          Snapshot preview (live view above includes all labels and marks).
        </p>
      )}
    </div>
  );
}
