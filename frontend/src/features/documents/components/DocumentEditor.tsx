"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DocumentEditor as OnlyOfficeEditor } from "@onlyoffice/document-editor-react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EditorSession } from "@/redux/types/document";

interface DocumentEditorProps {
  session: EditorSession;
  className?: string;
  editorId?: string;
  heightClassName?: string;
  showFullscreenToggle?: boolean;
}

function formatOnlyofficeError(errorCode: number, errorDescription: string) {
  switch (errorCode) {
    case -1:
      return `ONLYOFFICE failed to load: ${errorDescription}`;
    case -2:
      return `Cannot reach ONLYOFFICE at ${errorDescription}. Run: cd collaboration-service && docker compose up -d`;
    case -3:
      return "ONLYOFFICE API is not available. Wait 1-2 minutes after starting Docker, then refresh.";
    default:
      return `ONLYOFFICE error (${errorCode}): ${errorDescription}`;
  }
}

export function DocumentEditor({
  session,
  className,
  editorId = "onlyoffice-editor",
  heightClassName = "h-[75vh]",
  showFullscreenToggle = true,
}: DocumentEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const documentServerUrl =
    process.env.NEXT_PUBLIC_ONLYOFFICE_URL || session.documentServerUrl;

  const config = useMemo(() => {
    if (session.config.token) {
      return { token: session.config.token as string };
    }

    const editorConfig = (session.config.editorConfig || {}) as Record<string, unknown>;
    const customization = (editorConfig.customization || {}) as Record<string, unknown>;

    return {
      ...session.config,
      height: "100%",
      width: "100%",
      editorConfig: {
        ...editorConfig,
        customization: {
          ...customization,
          forcesave: customization.forcesave ?? true,
        },
      },
    };
  }, [session.config]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = window.document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      window.dispatchEvent(new Event("resize"));
    };

    window.document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      window.document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (window.document.fullscreenElement === containerRef.current) {
        await window.document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      setError("Fullscreen is not supported in this browser.");
    }
  };

  return (
    <div className={className}>
      {error ? (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden rounded-lg border bg-background",
          isFullscreen ? "h-screen rounded-none border-0" : heightClassName
        )}
      >
        {showFullscreenToggle ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-3 top-3 z-20 shadow-sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        ) : null}
        <div className="h-full w-full">
          <OnlyOfficeEditor
            id={editorId}
            documentServerUrl={documentServerUrl}
            config={config}
            onLoadComponentError={(errorCode, errorDescription) => {
              setError(formatOnlyofficeError(errorCode, errorDescription));
            }}
          />
        </div>
      </div>
    </div>
  );
}
