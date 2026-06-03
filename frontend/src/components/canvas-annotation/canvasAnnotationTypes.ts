export type CanvasSourceType = "library" | "custom";

export type CanvasTool =
  | "select"
  | "draw"
  | "text"
  | "arrow"
  | "line"
  | "rect"
  | "circle"
  | "marker"
  | "eraser";

export type CanvasAnnotationShape = {
  id: string;
  type: "path" | "line" | "arrow" | "rect" | "circle" | "text";
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  fontSize?: number;
  rotation?: number;
};

export type CanvasAnnotationsPayload = {
  version: 1;
  objects: CanvasAnnotationShape[];
};

export type CanvasDataPayload = {
  diagram_id?: string | null;
  diagram_code?: string | null;
  source_type: CanvasSourceType;
  custom_image_url?: string | null;
  annotations: CanvasAnnotationsPayload;
  metadata?: {
    background_width?: number;
    background_height?: number;
    updated_at?: string;
  };
};

export type CanvasAnnotationFieldValue = {
  canvas_data: CanvasDataPayload;
  preview_image?: string | null;
};

export const CANVAS_ANNOTATION_VERSION = 1;

export const DEFAULT_CANVAS_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#000000",
] as const;

export function emptyCanvasValue(
  source: CanvasSourceType,
  opts: {
    diagram_id?: string | null;
    diagram_code?: string | null;
    custom_image_url?: string | null;
  } = {}
): CanvasAnnotationFieldValue {
  return {
    canvas_data: {
      source_type: source,
      diagram_id: opts.diagram_id ?? null,
      diagram_code: opts.diagram_code ?? null,
      custom_image_url: opts.custom_image_url ?? null,
      annotations: { version: CANVAS_ANNOTATION_VERSION, objects: [] },
      metadata: {},
    },
    preview_image: null,
  };
}

export function parseCanvasFieldValue(raw: unknown): CanvasAnnotationFieldValue | null {
  if (!raw) return null;
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const v = parsed as CanvasAnnotationFieldValue;
  if (!v.canvas_data) return null;
  if (!v.canvas_data.annotations?.objects) {
    v.canvas_data.annotations = { version: CANVAS_ANNOTATION_VERSION, objects: [] };
  }
  return v;
}
