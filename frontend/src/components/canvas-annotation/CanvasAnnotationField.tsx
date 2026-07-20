"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Label } from "@/components/ui/label";
import { getFileUrl } from "@/utils/fileUrl";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  emptyCanvasValue,
  parseCanvasFieldValue,
  type CanvasAnnotationFieldValue,
  type CanvasSourceType,
} from "./canvasAnnotationTypes";
import {
  isDataUrl,
  resolveCanvasPreviewSrc,
  uploadCanvasPreviewDataUrl,
} from "./canvasAnnotationUtils";
import type { FormFieldConfig } from "@/redux/types/formField";
import { useGetMedicalDiagramQuery } from "@/redux/api/medicalDiagramApi";
import { useUploadAttachmentsMutation } from "@/redux/api/attachementApi";

const CanvasAnnotationEditor = dynamic(
  () =>
    import("./CanvasAnnotationEditor").then((m) => m.CanvasAnnotationEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[480px] items-center justify-center rounded-md border bg-muted/20"
        aria-hidden
      >
        <p className="text-sm text-muted-foreground">Preparing canvas…</p>
      </div>
    ),
  }
);

const STAGE_HEIGHT = 480;

type Props = {
  fieldKey: string;
  label: string;
  config: FormFieldConfig;
  value: unknown;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (key: string, value: unknown) => void;
};

function resolveBackgroundUrl(
  config: FormFieldConfig,
  diagramImageFile?: string | null
): string | null {
  const source = config.canvas_source_type as CanvasSourceType | undefined;
  if (source === "custom" && config.custom_image_url) {
    return getFileUrl(String(config.custom_image_url).replace(/^\/+/, ""));
  }
  if (source === "library" && diagramImageFile) {
    return getFileUrl(diagramImageFile.replace(/^\/+/, ""));
  }
  if (source === "library" && config.custom_image_url) {
    return getFileUrl(String(config.custom_image_url).replace(/^\/+/, ""));
  }
  return null;
}

export function CanvasAnnotationField({
  fieldKey,
  label,
  config,
  value,
  disabled,
  readOnly,
  onChange,
}: Props) {
  const mounted = useClientMounted();
  const diagramId = config.diagram_id;
  const { data: diagram } = useGetMedicalDiagramQuery(diagramId!, {
    skip: !diagramId || config.canvas_source_type !== "library",
  });
  const [uploadAttachments] = useUploadAttachmentsMutation();
  const uploadInFlight = useRef(false);
  const didInitialize = useRef(false);

  const backgroundUrl = useMemo(
    () => resolveBackgroundUrl(config, diagram?.image_file),
    [config, diagram?.image_file]
  );

  const parsed = parseCanvasFieldValue(value);
  const canvasValue: CanvasAnnotationFieldValue = useMemo(() => {
    if (parsed) return parsed;
    const source = (config.canvas_source_type || "library") as CanvasSourceType;
    return emptyCanvasValue(source, {
      diagram_id: config.diagram_id ?? null,
      diagram_code: diagram?.code ?? null,
      custom_image_url:
        source === "custom" ? config.custom_image_url ?? null : null,
    });
  }, [parsed, config, diagram?.code]);

  useEffect(() => {
    if (!mounted || parsed || !backgroundUrl || didInitialize.current) return;
    didInitialize.current = true;
    onChange(fieldKey, canvasValue);
  }, [mounted, backgroundUrl, canvasValue, fieldKey, onChange, parsed]);

  const persistPreviewUpload = useCallback(
    async (next: CanvasAnnotationFieldValue) => {
      const preview = next.preview_image;
      if (!preview || !isDataUrl(preview) || readOnly || disabled) {
        onChange(fieldKey, next);
        return;
      }
      if (uploadInFlight.current) return;
      uploadInFlight.current = true;
      try {
        const storedPath = await uploadCanvasPreviewDataUrl(
          preview,
          fieldKey,
          async (arg) => {
            const res = await uploadAttachments(arg).unwrap();
            return {
              attachments: res.attachments?.map((a: any) => ({
                file_path: a.file_path || "",
              })),
            };
          }
        );
        onChange(fieldKey, {
          ...next,
          preview_image: storedPath,
        });
      } catch {
        onChange(fieldKey, { ...next, preview_image: null });
      } finally {
        uploadInFlight.current = false;
      }
    },
    [disabled, fieldKey, onChange, readOnly, uploadAttachments]
  );

  const handleChange = useCallback(
    (next: CanvasAnnotationFieldValue) => {
      if (next.preview_image && isDataUrl(next.preview_image) && !readOnly && !disabled) {
        const storedPreview =
          parsed?.preview_image && !isDataUrl(parsed.preview_image)
            ? parsed.preview_image
            : null;
        onChange(fieldKey, {
          canvas_data: next.canvas_data,
          preview_image: storedPreview,
        });
        void persistPreviewUpload(next);
        return;
      }
      onChange(fieldKey, next);
    },
    [disabled, fieldKey, onChange, parsed?.preview_image, persistPreviewUpload, readOnly]
  );

  const previewSrc = mounted ? resolveCanvasPreviewSrc(canvasValue.preview_image) : "";

  if (!backgroundUrl) {
    return (
      <p className="text-sm text-amber-700">
        Canvas diagram image is not configured. Ask an administrator to upload the{" "}
        {config.canvas_source_type === "library" ? "library diagram" : "custom diagram"} for
        this field.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {config.description ? (
        <p className="text-xs text-muted-foreground">{config.description}</p>
      ) : null}
      <Label className="text-sm font-medium">{label}</Label>
      {!mounted ? (
        <div
          className="flex items-center justify-center rounded-lg border bg-muted/20"
          style={{ minHeight: STAGE_HEIGHT }}
          aria-hidden
        >
          <p className="text-sm text-muted-foreground">Loading canvas editor…</p>
        </div>
      ) : (
        <CanvasAnnotationEditor
          backgroundUrl={backgroundUrl}
          value={canvasValue}
          disabled={disabled}
          readOnly={readOnly}
          onChange={handleChange}
        />
      )}
      {mounted && previewSrc ? (
        <div className="rounded border p-2">
          <p className="mb-1 text-xs text-muted-foreground">Preview snapshot</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt={`${label} annotation preview`}
            className="max-h-48 w-full object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
