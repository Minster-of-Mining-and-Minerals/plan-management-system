"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { DocumentEditor as OnlyOfficeEditor } from "@onlyoffice/document-editor-react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EditorSession } from "@/redux/types/document";
import {
  buildOnlyofficeStartupMessage,
  checkOnlyofficeHealth,
  resolveOnlyofficeUrl,
} from "../utils/onlyofficeHealth";

interface DocumentEditorProps {
  session: EditorSession;
  className?: string;
  editorId?: string;
  heightClassName?: string;
  showFullscreenToggle?: boolean;
}

type OnlyOfficeConfig = ComponentProps<typeof OnlyOfficeEditor>["config"];

function formatOnlyofficeError(errorCode: number, errorDescription: string, documentServerUrl: string) {
  switch (errorCode) {
    case -1:
      return `ONLYOFFICE failed to load: ${errorDescription}`;
    case -2:
      return buildOnlyofficeStartupMessage(documentServerUrl);
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
  const [isCheckingOnlyoffice, setIsCheckingOnlyoffice] = useState(true);
  const [isOnlyofficeReady, setIsOnlyofficeReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const documentServerUrl = resolveOnlyofficeUrl(session.documentServerUrl);

  const config = useMemo((): OnlyOfficeConfig => {
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
    } as OnlyOfficeConfig;
  }, [session.config]);

  useEffect(() => {
    let cancelled = false;

    async function verifyOnlyoffice() {
      setIsCheckingOnlyoffice(true);
      setIsOnlyofficeReady(false);
      setError(null);

      const health = await checkOnlyofficeHealth(documentServerUrl);
      if (cancelled) return;

      if (!health.ok) {
        setError(health.message);
        setIsOnlyofficeReady(false);
      } else {
        setIsOnlyofficeReady(true);
      }

      setIsCheckingOnlyoffice(false);
    }

    void verifyOnlyoffice();

    return () => {
      cancelled = true;
    };
  }, [documentServerUrl]);

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
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
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
          {isCheckingOnlyoffice ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Checking ONLYOFFICE connection...
            </div>
          ) : isOnlyofficeReady ? (
            <OnlyOfficeEditor
              id={editorId}
              documentServerUrl={documentServerUrl}
              config={config}
              onLoadComponentError={(errorCode, errorDescription) => {
                setError(formatOnlyofficeError(errorCode, errorDescription, documentServerUrl));
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Start ONLYOFFICE, then refresh this page.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
