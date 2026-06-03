"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Rect, Circle, Text, Group } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Circle as CircleIcon,
  Eraser,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  Highlighter,
} from "lucide-react";
import {
  type CanvasAnnotationFieldValue,
  type CanvasAnnotationShape,
  type CanvasTool,
  DEFAULT_CANVAS_COLORS,
  CANVAS_ANNOTATION_VERSION,
} from "./canvasAnnotationTypes";
import { CanvasTextInsertDialog } from "./CanvasTextInsertDialog";

const STAGE_WIDTH = 720;
const STAGE_HEIGHT = 480;

type Props = {
  backgroundUrl: string;
  value: CanvasAnnotationFieldValue;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (value: CanvasAnnotationFieldValue) => void;
  onPreviewReady?: (dataUrl: string) => void;
};

function BackgroundImage({ url, width, height }: { url: string; width: number; height: number }) {
  const [image] = useImage(url, "anonymous");
  if (!image) return null;
  const scale = Math.min(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  return <KonvaImage image={image} x={x} y={y} width={w} height={h} listening={false} />;
}

function ShapeNode({
  shape,
  readOnly,
  onSelect,
  selected,
  onUpdatePosition,
}: {
  shape: CanvasAnnotationShape;
  readOnly?: boolean;
  onSelect?: (id: string) => void;
  selected?: boolean;
  onUpdatePosition?: (id: string, x: number, y: number) => void;
}) {
  const common = {
    stroke: shape.stroke || "#ef4444",
    strokeWidth: shape.strokeWidth ?? 2,
    opacity: shape.opacity ?? 1,
    draggable: !readOnly && selected,
    onClick: () => onSelect?.(shape.id),
    onTap: () => onSelect?.(shape.id),
  };

  if (shape.type === "path" && shape.points?.length) {
    return (
      <Line
        {...common}
        points={shape.points}
        tension={0.4}
        lineCap="round"
        lineJoin="round"
        globalCompositeOperation={
          shape.stroke === "eraser" ? "destination-out" : "source-over"
        }
      />
    );
  }

  if (shape.type === "line" || shape.type === "arrow") {
    const pts = shape.points || [];
    return (
      <Group>
        <Line {...common} points={pts} lineCap="round" />
        {shape.type === "arrow" && pts.length >= 4 && (
          <Line
            points={arrowHeadPoints(pts)}
            stroke={shape.stroke || "#ef4444"}
            strokeWidth={shape.strokeWidth ?? 2}
            closed
            fill={shape.stroke || "#ef4444"}
            listening={false}
          />
        )}
      </Group>
    );
  }

  if (shape.type === "rect") {
    return (
      <Rect
        {...common}
        x={shape.x ?? 0}
        y={shape.y ?? 0}
        width={shape.width ?? 0}
        height={shape.height ?? 0}
        fill={shape.fill || "transparent"}
      />
    );
  }

  if (shape.type === "circle") {
    return (
      <Circle
        {...common}
        x={shape.x ?? 0}
        y={shape.y ?? 0}
        radius={shape.radius ?? 10}
        fill={shape.fill || "transparent"}
      />
    );
  }

  if (shape.type === "text") {
    const textColor = shape.stroke || "#000000";
    return (
      <Text
        x={shape.x ?? 0}
        y={shape.y ?? 0}
        text={shape.text || ""}
        fontSize={shape.fontSize ?? 16}
        fill={textColor}
        fontStyle="bold"
        listening={!readOnly}
        draggable={!readOnly && selected}
        onClick={() => onSelect?.(shape.id)}
        onTap={() => onSelect?.(shape.id)}
        onDragEnd={(e) => {
          const node = e.target;
          onUpdatePosition?.(shape.id, node.x(), node.y());
        }}
      />
    );
  }

  return null;
}

function arrowHeadPoints(pts: number[]) {
  const x1 = pts[pts.length - 4];
  const y1 = pts[pts.length - 3];
  const x2 = pts[pts.length - 2];
  const y2 = pts[pts.length - 1];
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 12;
  return [
    x2,
    y2,
    x2 - size * Math.cos(angle - Math.PI / 6),
    y2 - size * Math.sin(angle - Math.PI / 6),
    x2 - size * Math.cos(angle + Math.PI / 6),
    y2 - size * Math.sin(angle + Math.PI / 6),
  ];
}

function cloneObjects(objects: CanvasAnnotationShape[]) {
  return JSON.parse(JSON.stringify(objects)) as CanvasAnnotationShape[];
}

let shapeIdCounter = 0;
function nextShapeId() {
  shapeIdCounter += 1;
  return `shape-${shapeIdCounter}`;
}

export function CanvasAnnotationEditor({
  backgroundUrl,
  value,
  disabled,
  readOnly,
  onChange,
  onPreviewReady,
}: Props) {
  const stageContainerId = useId().replace(/:/g, "");
  const stageRef = useRef<Konva.Stage>(null);
  const [tool, setTool] = useState<CanvasTool>("draw");
  const [color, setColor] = useState<string>(DEFAULT_CANVAS_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [customColor, setCustomColor] = useState("#9333ea");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<CanvasAnnotationShape[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const pendingTextPoint = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef<{
    id: string;
    type: CanvasAnnotationShape["type"];
    points: number[];
    startX: number;
    startY: number;
  } | null>(null);
  const scheduleExportPreviewRef = useRef<(() => void) | null>(null);

  const committedObjects = value.canvas_data.annotations.objects;
  const [localObjects, setLocalObjects] = useState(committedObjects);
  const localObjectsRef = useRef(committedObjects);

  const syncLocalObjects = useCallback((next: CanvasAnnotationShape[]) => {
    localObjectsRef.current = next;
    setLocalObjects(next);
  }, []);

  useEffect(() => {
    if (!drawingRef.current) {
      syncLocalObjects(committedObjects);
    }
  }, [committedObjects, syncLocalObjects]);

  const objects = localObjects;

  const pushHistory = useCallback(
    (next: CanvasAnnotationShape[]) => {
      const slice = history.slice(0, historyIndex + 1);
      slice.push(cloneObjects(next));
      setHistory(slice);
      setHistoryIndex(slice.length - 1);
    },
    [history, historyIndex]
  );

  const commitObjects = useCallback(
    (next: CanvasAnnotationShape[], recordHistory = true) => {
      if (recordHistory) pushHistory(committedObjects);
      syncLocalObjects(next);
      onChange({
        ...value,
        canvas_data: {
          ...value.canvas_data,
          annotations: { version: CANVAS_ANNOTATION_VERSION, objects: next },
          metadata: {
            ...value.canvas_data.metadata,
            background_width: STAGE_WIDTH,
            background_height: STAGE_HEIGHT,
            updated_at: new Date().toISOString(),
          },
        },
      });
    },
    [committedObjects, onChange, pushHistory, syncLocalObjects, value]
  );

  const updateShapePosition = useCallback(
    (id: string, x: number, y: number) => {
      const next = objects.map((s) =>
        s.id === id ? { ...s, x, y } : s
      );
      commitObjects(next);
      scheduleExportPreviewRef.current?.();
    },
    [commitObjects, objects]
  );

  const activeColor = useMemo(() => {
    if (tool === "marker") return color;
    if (tool === "eraser") return "eraser";
    return customColor.startsWith("#") ? customColor : color;
  }, [tool, color, customColor]);

  const getPointer = (stage: Konva.Stage) => {
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(pos);
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (readOnly || disabled) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pt = getPointer(stage);
    if (!pt) return;

    if (tool === "select") {
      if (e.target === stage) setSelectedId(null);
      return;
    }

    if (tool === "text") {
      pendingTextPoint.current = { x: pt.x, y: pt.y };
      setTextDialogOpen(true);
      return;
    }

    if (tool === "eraser") {
      const hit = stage.getIntersection(pt);
      if (hit?.id()) {
        commitObjects(objects.filter((o) => o.id !== hit.id()));
        scheduleExportPreviewRef.current?.();
      }
      return;
    }

    const id = nextShapeId();
    const type: CanvasAnnotationShape["type"] =
      tool === "draw" || tool === "marker"
        ? "path"
        : tool === "line" || tool === "arrow"
          ? tool
          : tool === "rect"
            ? "rect"
            : tool === "circle"
              ? "circle"
              : "path";

    drawingRef.current = {
      id,
      type,
      points: [pt.x, pt.y],
      startX: pt.x,
      startY: pt.y,
    };

    const stroke = activeColor;
    const width = tool === "marker" ? Math.max(strokeWidth, 8) : strokeWidth;
    const opacity = tool === "marker" ? 0.45 : 1;

    const base: CanvasAnnotationShape = {
      id,
      type,
      stroke,
      strokeWidth: width,
      opacity,
      points: type === "path" || type === "line" || type === "arrow" ? [pt.x, pt.y] : undefined,
      x: type === "rect" || type === "circle" ? pt.x : undefined,
      y: type === "rect" || type === "circle" ? pt.y : undefined,
      width: type === "rect" ? 0 : undefined,
      height: type === "rect" ? 0 : undefined,
      radius: type === "circle" ? 0 : undefined,
    };

    syncLocalObjects([...objects, base]);
  };

  const handleTextConfirm = (text: string) => {
    const pt = pendingTextPoint.current;
    pendingTextPoint.current = null;
    if (!pt) return;
    const id = nextShapeId();
    const next = [
      ...objects,
      {
        id,
        type: "text" as const,
        x: pt.x,
        y: pt.y,
        text,
        fontSize: 16,
        stroke: activeColor === "eraser" ? "#000000" : activeColor,
      },
    ];
    commitObjects(next);
    setSelectedId(id);
    scheduleExportPreviewRef.current?.();
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const draft = drawingRef.current;
    if (!draft || readOnly || disabled) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pt = getPointer(stage);
    if (!pt) return;

    const next = objects.map((shape) => {
      if (shape.id !== draft.id) return shape;
      if (shape.type === "path") {
        return { ...shape, points: [...(shape.points || []), pt.x, pt.y] };
      }
      if (shape.type === "line" || shape.type === "arrow") {
        return {
          ...shape,
          points: [draft.startX, draft.startY, pt.x, pt.y],
        };
      }
      if (shape.type === "rect") {
        return {
          ...shape,
          width: pt.x - draft.startX,
          height: pt.y - draft.startY,
        };
      }
      if (shape.type === "circle") {
        const dx = pt.x - draft.startX;
        const dy = pt.y - draft.startY;
        return {
          ...shape,
          radius: Math.sqrt(dx * dx + dy * dy),
        };
      }
      return shape;
    });

    syncLocalObjects(next);
  };

  const handleMouseUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = null;
    commitObjects(localObjectsRef.current, true);
    scheduleExportPreviewRef.current?.();
  };

  const exportPreview = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || readOnly) return;
    const currentObjects = cloneObjects(localObjectsRef.current);
    try {
      const dataUrl = stage.toDataURL({ pixelRatio: 1.25 });
      onPreviewReady?.(dataUrl);
      onChange({
        canvas_data: {
          ...value.canvas_data,
          annotations: {
            version: CANVAS_ANNOTATION_VERSION,
            objects: currentObjects,
          },
          metadata: {
            ...value.canvas_data.metadata,
            background_width: STAGE_WIDTH,
            background_height: STAGE_HEIGHT,
            updated_at: new Date().toISOString(),
          },
        },
        preview_image: dataUrl,
      });
    } catch {
      /* ignore export errors */
    }
  }, [onChange, onPreviewReady, readOnly, value.canvas_data]);

  const scheduleExportPreview = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => exportPreview());
    });
  }, [exportPreview]);

  scheduleExportPreviewRef.current = readOnly ? null : scheduleExportPreview;

  const undo = () => {
    if (historyIndex < 0) return;
    const prev = history[historyIndex];
    setHistoryIndex(historyIndex - 1);
    onChange({
      ...value,
      canvas_data: {
        ...value.canvas_data,
        annotations: { version: CANVAS_ANNOTATION_VERSION, objects: cloneObjects(prev) },
      },
    });
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
    onChange({
      ...value,
      canvas_data: {
        ...value.canvas_data,
        annotations: { version: CANVAS_ANNOTATION_VERSION, objects: cloneObjects(next) },
      },
    });
  };

  const clearCanvas = () => {
    if (!confirm("Clear all annotations on this diagram?")) return;
    commitObjects([]);
    scheduleExportPreview();
  };

  const tools: { id: CanvasTool; label: string; icon: React.ReactNode }[] = [
    { id: "select", label: "Select", icon: <MousePointer2 className="h-4 w-4" /> },
    { id: "draw", label: "Draw", icon: <Pencil className="h-4 w-4" /> },
    { id: "marker", label: "Marker", icon: <Highlighter className="h-4 w-4" /> },
    { id: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
    { id: "arrow", label: "Arrow", icon: <ArrowRight className="h-4 w-4" /> },
    { id: "line", label: "Line", icon: <Minus className="h-4 w-4" /> },
    { id: "rect", label: "Rectangle", icon: <Square className="h-4 w-4" /> },
    { id: "circle", label: "Circle", icon: <CircleIcon className="h-4 w-4" /> },
    { id: "eraser", label: "Eraser", icon: <Eraser className="h-4 w-4" /> },
  ];

  return (
    <>
    <CanvasTextInsertDialog
      open={textDialogOpen}
      onOpenChange={setTextDialogOpen}
      onConfirm={handleTextConfirm}
    />
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          {tools.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tool === t.id ? "default" : "outline"}
              disabled={disabled}
              onClick={() => setTool(t.id)}
              title={t.label}
            >
              {t.icon}
            </Button>
          ))}
          <div className="mx-1 h-6 w-px bg-border" />
          {DEFAULT_CANVAS_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-primary" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              disabled={disabled}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
          <Input
            type="color"
            className="h-8 w-12 cursor-pointer p-0"
            value={customColor}
            disabled={disabled}
            onChange={(e) => setCustomColor(e.target.value)}
            title="Custom color"
          />
          <Input
            type="range"
            min={1}
            max={16}
            value={strokeWidth}
            disabled={disabled}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-24"
            title="Stroke width"
          />
          <div className="mx-1 h-6 w-px bg-border" />
          <Button type="button" size="sm" variant="outline" onClick={undo} disabled={disabled}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={redo} disabled={disabled}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setScale((s) => Math.min(3, s + 0.15))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setScale((s) => Math.max(0.4, s - 0.15))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
          >
            Reset view
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={clearCanvas}>
            Clear
          </Button>
        </div>
      )}

      <div
        id={stageContainerId}
        className="overflow-auto rounded-md border bg-white"
        suppressHydrationWarning
      >
        <Stage
          ref={stageRef}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          draggable={!readOnly && tool === "select"}
          onDragEnd={(e) => {
            if (tool === "select") {
              setPosition({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: readOnly ? "default" : "crosshair" }}
        >
          <Layer>
            <BackgroundImage url={backgroundUrl} width={STAGE_WIDTH} height={STAGE_HEIGHT} />
          </Layer>
          <Layer>
            {objects.map((shape) => (
              <Group key={shape.id} id={shape.id}>
                <ShapeNode
                  shape={shape}
                  readOnly={readOnly}
                  selected={selectedId === shape.id}
                  onSelect={setSelectedId}
                  onUpdatePosition={readOnly ? undefined : updateShapePosition}
                />
              </Group>
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
    </>
  );
}
