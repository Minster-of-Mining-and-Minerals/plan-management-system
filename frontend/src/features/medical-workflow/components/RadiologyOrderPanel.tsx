"use client";

import { useState } from "react";
import {
  FileText,
  Calendar,
  Play,
  CheckCircle2,
  Edit3,
  Plus,
  ShieldCheck,
  Clock,
  Activity,
  ExternalLink,
  Eye,
  EyeOff,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useListStudiesQuery,
  useScheduleStudyMutation,
  useStartStudyMutation,
  useCompleteAcquisitionMutation,
  useSubmitReportMutation,
  useVerifyReportMutation,
  useAmendReportMutation,
  useReleaseReportMutation,
  useWithholdReportMutation,
  useCreateBillingChargeMutation,
  type RadiologyWorkflowStatus,
  type RadiologyStudy,
} from "@/redux/api/radiologyApi";

type Props = {
  orderId: string;
  patientId?: string;
};

const WORKFLOW_BADGES: Record<RadiologyWorkflowStatus, { label: string; className: string }> = {
  ORDERED: { label: "ORDERED", className: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300" },
  SCHEDULED: { label: "SCHEDULED 📅", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  PATIENT_READY: { label: "PATIENT READY", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300" },
  IN_PROGRESS: { label: "IN PROGRESS ⚡", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse" },
  IMAGE_ACQUIRED: { label: "IMAGES ACQUIRED 📷", className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
  REPORT_PENDING: { label: "REPORT PENDING 📝", className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  VERIFICATION_PENDING: { label: "VERIFICATION PENDING", className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300" },
  COMPLETED: { label: "COMPLETED ✅", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  CANCELLED: { label: "CANCELLED", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

export function RadiologyOrderPanel({ orderId, patientId }: Props) {
  const { data: studies = [], isLoading } = useListStudiesQuery({ order_id: orderId });

  const [scheduleStudy] = useScheduleStudyMutation();
  const [startStudy] = useStartStudyMutation();
  const [completeAcquisition] = useCompleteAcquisitionMutation();
  const [submitReport] = useSubmitReportMutation();
  const [verifyReport] = useVerifyReportMutation();
  const [amendReport] = useAmendReportMutation();
  const [releaseReport] = useReleaseReportMutation();
  const [withholdReport] = useWithholdReportMutation();
  const [createBillingCharge] = useCreateBillingChargeMutation();

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<RadiologyStudy | null>(null);
  const [scheduledAtDate, setScheduledAtDate] = useState("");

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendations, setRecommendations] = useState("");

  const [amendDialogOpen, setAmendDialogOpen] = useState(false);
  const [amendFindings, setAmendFindings] = useState("");
  const [amendImpression, setAmendImpression] = useState("");
  const [amendRecommendations, setAmendRecommendations] = useState("");
  const [changeReason, setChangeReason] = useState("");

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudy || !scheduledAtDate) {
      toast.error("Scheduled date and time is required");
      return;
    }

    try {
      await scheduleStudy({ studyId: selectedStudy.study_id, scheduled_at: scheduledAtDate }).unwrap();
      toast.success("Radiology imaging study scheduled successfully");
      setScheduleDialogOpen(false);
      setSelectedStudy(null);
      setScheduledAtDate("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to schedule study");
    }
  };

  const handleStartStudy = async (studyId: string) => {
    try {
      await startStudy(studyId).unwrap();
      toast.success("Radiology imaging procedure started");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to start study");
    }
  };

  const handleCompleteAcquisition = async (studyId: string) => {
    try {
      await completeAcquisition(studyId).unwrap();
      toast.success("Image acquisition completed. Study moved to reporting queue.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to complete acquisition");
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudy || !findings.trim() || !impression.trim()) {
      toast.error("Findings and Impression are required");
      return;
    }

    try {
      await submitReport({
        studyId: selectedStudy.study_id,
        payload: { findings: findings.trim(), impression: impression.trim(), recommendations: recommendations.trim() || undefined },
      }).unwrap();

      toast.success("Radiology diagnostic report drafted and submitted");
      setReportDialogOpen(false);
      setSelectedStudy(null);
      setFindings("");
      setImpression("");
      setRecommendations("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to submit report");
    }
  };

  const handleVerify = async (reportId: string, studyId: string) => {
    try {
      await verifyReport({ reportId, studyId }).unwrap();
      toast.success("Radiology diagnostic report verified and signed off");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to verify report");
    }
  };

  const handleRelease = async (reportId: string, studyId: string) => {
    try {
      await releaseReport({ reportId, studyId }).unwrap();
      toast.success("Radiology report released to patient portal");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to release report");
    }
  };

  const handleWithhold = async (reportId: string, studyId: string) => {
    try {
      await withholdReport({ reportId, studyId, reason: "Clinician requested withhold" }).unwrap();
      toast.success("Radiology report withheld from patient portal");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to withhold report");
    }
  };

  const handleCharge = async (studyId: string) => {
    try {
      await createBillingCharge(studyId).unwrap();
      toast.success("Radiology charge entry created on visit account");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create radiology charge");
    }
  };

  const handleAmendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudy?.report || !changeReason.trim()) {
      toast.error("Amendment change reason is required");
      return;
    }

    try {
      await amendReport({
        reportId: selectedStudy.report.report_id,
        studyId: selectedStudy.study_id,
        payload: {
          findings: amendFindings.trim() || undefined,
          impression: amendImpression.trim() || undefined,
          recommendations: amendRecommendations.trim() || undefined,
          change_reason: changeReason.trim(),
        },
      }).unwrap();

      toast.success("Radiology diagnostic report amended");
      setAmendDialogOpen(false);
      setSelectedStudy(null);
      setChangeReason("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to amend report");
    }
  };

  return (
    <Card className="my-3 border border-purple-200 dark:border-purple-900 bg-purple-50/10">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm font-semibold">Radiology Imaging Studies & Diagnostic Reports</CardTitle>
          <Badge variant="outline" className="ml-1 text-[11px]">
            {studies.length} Studies
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0 text-xs">
        {isLoading ? (
          <div className="text-muted-foreground text-xs py-2">Loading radiology studies...</div>
        ) : studies.length === 0 ? (
          <div className="text-muted-foreground text-xs py-3 text-center border rounded bg-background">
            No radiology studies recorded for this order.
          </div>
        ) : (
          <div className="space-y-3">
            {studies.map((study) => {
              const statusInfo = WORKFLOW_BADGES[study.workflow_status] || WORKFLOW_BADGES.ORDERED;

              return (
                <div key={study.study_id} className="p-3 border rounded-lg bg-background space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-700 dark:text-purple-400">
                        {study.procedureCatalog?.name || `${study.modality} Examination`}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {study.accession_number}
                      </Badge>
                      <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {study.workflow_status === "ORDERED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedStudy(study);
                            setScheduleDialogOpen(true);
                          }}
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule Study
                        </Button>
                      )}

                      {study.workflow_status === "SCHEDULED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleStartStudy(study.study_id)}
                        >
                          <Play className="h-3.5 w-3.5 mr-1 text-amber-600" /> Start Imaging
                        </Button>
                      )}

                      {study.workflow_status === "IN_PROGRESS" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleCompleteAcquisition(study.study_id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-purple-600" /> Complete Acquisition
                        </Button>
                      )}

                      {study.workflow_status === "IMAGE_ACQUIRED" && !study.report && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            setSelectedStudy(study);
                            setReportDialogOpen(true);
                          }}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" /> Draft Diagnostic Report
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-700 dark:text-green-400"
                        onClick={() => handleCharge(study.study_id)}
                      >
                        <DollarSign className="h-3.5 w-3.5 mr-1" /> Charge Entry
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t pt-1.5">
                    <span>Modality: <strong>{study.modality}</strong></span>
                    {study.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Scheduled: {new Date(study.scheduled_at).toLocaleString()}
                      </span>
                    )}
                    {study.assignedRadiographer && <span>Tech: {study.assignedRadiographer.full_name}</span>}
                    {study.assignedRadiologist && <span>Radiologist: {study.assignedRadiologist.full_name}</span>}
                  </div>

                  {/* DICOM Web Viewer Links */}
                  {study.images && study.images.length > 0 && (
                    <div className="p-2 border rounded bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <ExternalLink className="h-3.5 w-3.5" /> PACS DICOM Images ({study.images.length})
                      </span>
                      <div className="flex items-center gap-2">
                        {study.images.map((img) => (
                          <a
                            key={img.id}
                            href={img.viewer_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-purple-600 hover:underline font-mono"
                          >
                            Launch Viewer <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagnostic Report View */}
                  {study.report && (
                    <div className="mt-2 p-2.5 rounded border border-purple-100 dark:border-purple-900 bg-purple-50/20 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                          <FileText className="h-3.5 w-3.5" /> Diagnostic Report Findings & Impression
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {study.report.verification_status}
                          </Badge>

                          {study.report.patient_release_status === "RELEASED" ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              <Eye className="h-3 w-3 mr-1" /> Patient Portal Released
                            </Badge>
                          ) : study.report.patient_release_status === "WITHHELD" ? (
                            <Badge variant="destructive" className="text-[10px]">
                              <EyeOff className="h-3 w-3 mr-1" /> Withheld from Patient
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] text-blue-600"
                                onClick={() => handleRelease(study.report!.report_id, study.study_id)}
                              >
                                <Eye className="h-3 w-3 mr-1" /> Release to Patient
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px] text-red-600"
                                onClick={() => handleWithhold(study.report!.report_id, study.study_id)}
                              >
                                <EyeOff className="h-3 w-3 mr-1" /> Withhold
                              </Button>
                            </div>
                          )}

                          {study.report.verification_status !== "FINAL" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px] text-emerald-600"
                              onClick={() => handleVerify(study.report!.report_id, study.study_id)}
                            >
                              <ShieldCheck className="h-3 w-3 mr-1" /> Sign Off & Verify
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px]"
                            onClick={() => {
                              setSelectedStudy(study);
                              setAmendFindings(study.report!.findings);
                              setAmendImpression(study.report!.impression);
                              setAmendRecommendations(study.report!.recommendations || "");
                              setAmendDialogOpen(true);
                            }}
                          >
                            <Edit3 className="h-3 w-3 mr-1" /> Amend
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1 text-slate-700 dark:text-slate-300">
                        <div><strong>Findings:</strong> {study.report.findings}</div>
                        <div><strong>Impression:</strong> {study.report.impression}</div>
                        {study.report.recommendations && <div><strong>Recommendations:</strong> {study.report.recommendations}</div>}
                      </div>

                      {study.report.verifiedByUser && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1 border-t">
                          <ShieldCheck className="h-3 w-3" /> Signed off by {study.report.verifiedByUser.full_name} on {new Date(study.report.signed_at || "").toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <form onSubmit={handleScheduleSubmit}>
            <DialogHeader>
              <DialogTitle>Schedule Radiology Imaging Procedure</DialogTitle>
            </DialogHeader>
            <div className="py-3 space-y-3 text-xs">
              <div className="space-y-1">
                <Label>Scheduled Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAtDate}
                  onChange={(e) => setScheduledAtDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Save Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Draft Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleReportSubmit}>
            <DialogHeader>
              <DialogTitle>Draft Radiology Diagnostic Report</DialogTitle>
            </DialogHeader>
            <div className="py-3 space-y-3 text-xs">
              <div className="space-y-1">
                <Label>Findings (Objective Imaging Results)</Label>
                <Textarea
                  rows={3}
                  placeholder="e.g., Lungs are clear. Heart size is normal. No focal consolidation."
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Impression (Diagnostic Summary)</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g., Normal acute chest radiograph."
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Recommendations (Optional)</Label>
                <Input
                  placeholder="e.g., Follow up CT in 3 months if clinically indicated."
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Submit Report</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Amend Dialog */}
      <Dialog open={amendDialogOpen} onOpenChange={setAmendDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleAmendSubmit}>
            <DialogHeader>
              <DialogTitle>Amend Radiology Diagnostic Report</DialogTitle>
            </DialogHeader>
            <div className="py-3 space-y-3 text-xs">
              <div className="space-y-1">
                <Label>Amended Findings</Label>
                <Textarea rows={3} value={amendFindings} onChange={(e) => setAmendFindings(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Amended Impression</Label>
                <Textarea rows={2} value={amendImpression} onChange={(e) => setAmendImpression(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Mandatory Change Reason</Label>
                <Input
                  placeholder="e.g., Secondary review identified subtle nodule"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAmendDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">Save Amendment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
