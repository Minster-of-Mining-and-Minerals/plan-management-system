"use client";

import { CanvasAnnotationDisplay } from "@/components/canvas-annotation/CanvasAnnotationDisplay";
import { getFileUrl } from "@/utils/fileUrl";
import { flattenFormFields, type FormField, type UserFormConfigGrouped } from "@/redux/types/formField";
import { parseCanvasFieldValue } from "@/components/canvas-annotation/canvasAnnotationTypes";
import { useListMedicalDiagramsQuery } from "@/redux/api/medicalDiagramApi";

function resolveFieldBackgroundUrl(
  field: FormField,
  diagramImageById: Map<string, string>
): string | null {
  const config = field.config || {};
  if (config.canvas_source_type === "custom" && config.custom_image_url) {
    return getFileUrl(String(config.custom_image_url).replace(/^\/+/, ""));
  }
  if (config.diagram_id && diagramImageById.has(config.diagram_id)) {
    return getFileUrl(diagramImageById.get(config.diagram_id)!);
  }
  return null;
}

export function MedicalHistoryCanvasBlocks({
  formSchema,
  formData,
}: {
  formSchema?: UserFormConfigGrouped | null;
  formData?: Record<string, unknown>;
}) {
  if (!formSchema || !formData) return null;

  const { data: diagrams = [] } = useListMedicalDiagramsQuery({
    include_inactive: true,
  });
  const diagramImageById = new Map(
    diagrams
      .filter((d) => d.image_file)
      .map((d) => [d.diagram_id, d.image_file!])
  );

  const canvasFields = flattenFormFields(formSchema).filter(
    (f) => f.field_type === "canvas_annotation" && f.is_visible
  );

  if (!canvasFields.length) return null;

  return (
    <div className="space-y-4">
      {canvasFields.map((field) => {
        const value = formData[field.field_key];
        const parsed = parseCanvasFieldValue(value);
        if (!parsed) return null;

        const bgFromValue = parsed.canvas_data.custom_image_url
          ? getFileUrl(String(parsed.canvas_data.custom_image_url).replace(/^\/+/, ""))
          : parsed.canvas_data.diagram_id &&
              diagramImageById.has(parsed.canvas_data.diagram_id)
            ? getFileUrl(diagramImageById.get(parsed.canvas_data.diagram_id)!)
            : null;

        const bg = bgFromValue || resolveFieldBackgroundUrl(field, diagramImageById);
        if (!bg) return null;

        return (
          <div key={field.field_id} className="rounded-lg border bg-background p-3">
            <CanvasAnnotationDisplay
              value={parsed}
              backgroundUrl={bg}
              label={field.label}
            />
          </div>
        );
      })}
    </div>
  );
}
