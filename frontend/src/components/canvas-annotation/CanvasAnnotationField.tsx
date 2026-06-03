"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { getFileUrl } from "@/utils/fileUrl";
import {
  emptyCanvasValue,
  parseCanvasFieldValue,
  type CanvasAnnotationFieldValue,
  type CanvasSourceType,
} from "./canvasAnnotationTypes";
import type { FormFieldConfig } from "@/redux/types/formField";
import { useGetMedicalDiagramQuery } from "@/redux/api/medicalDiagramApi";

const CanvasAnnotationEditor = dynamic(
  () =>
    import("./CanvasAnnotationEditor").then((m) => m.CanvasAnnotationEditor),
  { ssr: false, loading: () => <p className="text-sm text-muted-foreground">Loading canvas…</p> }
);

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
  const diagramId = config.diagram_id;
  const { data: diagram } = useGetMedicalDiagramQuery(diagramId!, {
    skip: !diagramId || config.canvas_source_type !== "library",
  });

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
        source === "custom"
          ? config.custom_image_url ?? null
          : null,
    });
  }, [parsed, config, diagram?.code]);

  useEffect(() => {
    if (!parsed && backgroundUrl) {
      onChange(fieldKey, canvasValue);
    }
  }, [backgroundUrl, canvasValue, fieldKey, onChange, parsed]);

  const handleChange = (next: CanvasAnnotationFieldValue) => {
    onChange(fieldKey, next);
  };

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
      <CanvasAnnotationEditor
        backgroundUrl={backgroundUrl}
        value={canvasValue}
        disabled={disabled}
        readOnly={readOnly}
        onChange={handleChange}
      />
      {canvasValue.preview_image && (
        <div className="rounded border p-2">
          <p className="mb-1 text-xs text-muted-foreground">Preview snapshot</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={canvasValue.preview_image}
            alt={`${label} annotation preview`}
            className="max-h-48 w-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
