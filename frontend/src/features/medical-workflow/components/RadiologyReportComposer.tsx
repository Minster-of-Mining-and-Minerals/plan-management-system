"use client";

import { useState } from "react";
import { FileText, LayoutTemplate, Send, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useGetTemplateForProcedureQuery,
  useApplyTemplateToReportMutation,
  useSubmitReportMutation,
  type ModalityType,
} from "@/redux/api/radiologyApi";

type Props = {
  studyId: string;
  modality?: ModalityType;
  procedureType?: string;
  existingReportId?: string;
  onSuccess?: () => void;
};

export function RadiologyReportComposer({
  studyId,
  modality = "XRAY",
  procedureType,
  existingReportId,
  onSuccess,
}: Props) {
  const { data: template } = useGetTemplateForProcedureQuery({ procedure_type: procedureType, modality });
  const [applyTemplate] = useApplyTemplateToReportMutation();
  const [submitReport] = useSubmitReportMutation();

  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [sections, setSections] = useState<Record<string, string>>({});

  const handleApplyTemplate = async () => {
    if (!template) {
      toast.error("No template available for this procedure type");
      return;
    }

    const defaultSectionContent: Record<string, string> = {};
    (template.sections || []).forEach((sec) => {
      defaultSectionContent[sec.section_name] = sec.default_text || "";
    });

    setSections(defaultSectionContent);

    if (existingReportId) {
      try {
        await applyTemplate({
          reportId: existingReportId,
          studyId,
          templateId: template.id,
          sectionData: defaultSectionContent,
        }).unwrap();
        toast.success(`Applied structured report template: ${template.name}`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Failed to apply template");
      }
    } else {
      toast.success(`Loaded sections from template: ${template.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalFindings = sections["Findings"] || findings;
    const finalImpression = sections["Impression"] || impression;

    if (!finalFindings.trim() || !finalImpression.trim()) {
      toast.error("Findings and Impression sections are required");
      return;
    }

    try {
      await submitReport({
        studyId,
        payload: {
          findings: finalFindings.trim(),
          impression: finalImpression.trim(),
          recommendations: recommendations.trim() || sections["Recommendations"] || undefined,
        },
      }).unwrap();

      toast.success("Radiology report submitted");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to submit report");
    }
  };

  return (
    <Card className="my-3 border border-purple-200 dark:border-purple-900 bg-background">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm font-semibold">Structured Radiology Report Composer</CardTitle>
        </div>
        {template && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleApplyTemplate}>
            <LayoutTemplate className="h-3.5 w-3.5 mr-1" /> Use Template: {template.name}
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {template && template.sections && template.sections.length > 0 ? (
            <div className="space-y-3">
              {template.sections.map((sec) => (
                <div key={sec.id} className="space-y-1">
                  <Label className="flex items-center gap-1">
                    {sec.section_name} {sec.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Textarea
                    rows={2}
                    value={sections[sec.section_name] ?? sec.default_text ?? ""}
                    onChange={(e) =>
                      setSections((prev) => ({ ...prev, [sec.section_name]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Findings (Objective Results)</Label>
                <Textarea
                  rows={3}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="Describe imaging findings..."
                />
              </div>
              <div className="space-y-1">
                <Label>Impression (Diagnostic Summary)</Label>
                <Textarea
                  rows={2}
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  placeholder="Primary diagnostic impression..."
                />
              </div>
              <div className="space-y-1">
                <Label>Recommendations (Optional)</Label>
                <Input
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Follow-up recommendations..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 h-8 text-xs">
              <Send className="h-3.5 w-3.5 mr-1" /> Submit Diagnostic Report
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
