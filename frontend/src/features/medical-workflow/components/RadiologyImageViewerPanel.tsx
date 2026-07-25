"use client";

import { useState } from "react";
import { ExternalLink, Film, Layers, Monitor, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGetStudyImagesQuery,
  useGenerateViewerSessionMutation,
  type RadiologyImage,
} from "@/redux/api/radiologyApi";

type Props = {
  studyId: string;
  studyInstanceUid?: string;
};

export function RadiologyImageViewerPanel({ studyId, studyInstanceUid }: Props) {
  const { data: images = [], isLoading } = useGetStudyImagesQuery(studyId);
  const [generateViewerSession] = useGenerateViewerSessionMutation();
  const [activeSession, setActiveSession] = useState<any | null>(null);

  const handleLaunchViewerSession = async (imageId: string) => {
    try {
      const session = await generateViewerSession(imageId).unwrap();
      setActiveSession(session);
      toast.success(`Launched ${session.viewer_type} DICOM Viewer Session Token`);
      if (session.external_viewer_url) {
        window.open(session.external_viewer_url, "_blank");
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to generate DICOM viewer session");
    }
  };

  return (
    <Card className="my-3 border border-purple-200 dark:border-purple-900 bg-background">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm font-semibold">PACS DICOM Medical Image Viewer</CardTitle>
          <Badge variant="outline" className="ml-1 text-[11px]">
            {images.length} Objects
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs pt-0">
        {isLoading ? (
          <div className="text-muted-foreground py-2">Loading study imaging objects...</div>
        ) : images.length === 0 ? (
          <div className="text-muted-foreground py-4 text-center border rounded bg-slate-50 dark:bg-slate-900/50">
            No PACS DICOM imaging objects registered for this study yet.
          </div>
        ) : (
          <div className="space-y-3">
            {images.map((img) => (
              <div key={img.id} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-purple-800 dark:text-purple-300">
                    <Film className="h-3.5 w-3.5" /> Modality: {img.modality} ({img.image_count} frames)
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {img.viewer_type || "OHIF"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    Study UID: {img.study_instance_uid}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Storage: <strong>{img.storage_type}</strong> | Location: {img.storage_location}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="default"
                  className="bg-purple-600 hover:bg-purple-700 text-xs h-8"
                  onClick={() => handleLaunchViewerSession(img.id)}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Launch DICOM Viewer
                </Button>
              </div>
            ))}
          </div>
        )}

        {activeSession && (
          <div className="p-3 border border-emerald-200 dark:border-emerald-900 rounded bg-emerald-50/20 text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Active Authenticated Viewer Session Token
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                Token: {activeSession.session_id.slice(0, 8)}...
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Provider Integration: <strong>{activeSession.viewer_type} Web Viewer</strong>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
