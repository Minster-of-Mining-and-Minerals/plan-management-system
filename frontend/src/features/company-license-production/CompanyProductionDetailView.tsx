"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Factory,
  FileBadge,
  Calendar,
  Gem,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Users,
  AlertCircle,
  Send,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Building2,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  Lock,
  Unlock,
  Check,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetProductionDetailQuery,
  useSaveTargetProposalMutation,
  useSubmitTargetProposalMutation,
  useSubmitReportMutation,
  useManageReportingResponsibilitiesMutation,
  useGetProductionPerformanceQuery,
} from "@/redux/api/productionApi";
import { useGetCompanyStructuresQuery, useGetCompanyRolesQuery } from "@/redux/api/companyApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { actionFeedback } from "@/components/action-feedback";
import Loading01 from "@/features/template/component/Loading/Loading01";
import type { TargetPeriodNode, CompanyProductionTarget } from "@/redux/types/production";
import { CompanyTargetAmendmentModal } from "./CompanyTargetAmendmentModal";
import { CompanyTargetAmendmentComparisonModal } from "./CompanyTargetAmendmentComparisonModal";
import { CompanyProductionReportingHierarchyView } from "./CompanyProductionReportingHierarchyView";
import { Scale } from "lucide-react";

export function CompanyProductionDetailView({
  overrideCompanyId,
  overrideAssignmentId,
}: {
  overrideCompanyId?: string;
  overrideAssignmentId?: string;
}) {
  const params = useParams<{ id: string; assignmentId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const companyId = overrideCompanyId || params?.id;
  const assignmentId = overrideAssignmentId || params?.assignmentId;

  const defaultTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync tab with URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", tab);
    router.replace(`?${p.toString()}` as any);
  };

  // 1. Fetch Production Detail Bundle
  const {
    data: detailBundle,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useGetProductionDetailQuery(assignmentId || "", { skip: !assignmentId });

  // 2. Fetch Organizational Hierarchy (Company Structures / Departments)
  const { data: structures = [] } = useGetCompanyStructuresQuery(
    { company_id: companyId || "" },
    { skip: !companyId }
  );

  // 3. Fetch Company Users and Roles for Assignment
  const { data: usersData } = useGetUsersQuery(
    { company_id: companyId || "" },
    { skip: !companyId }
  );
  const companyUsers = Array.isArray(usersData) ? usersData : (usersData as any)?.users || [];

  const { data: companyRoles = [] } = useGetCompanyRolesQuery(
    companyId || "",
    { skip: !companyId }
  );

  // Mutations
  const [saveTargetProposal, { isLoading: isSavingTarget }] = useSaveTargetProposalMutation();
  const [submitTargetProposal, { isLoading: isSubmittingTarget }] = useSubmitTargetProposalMutation();
  const [submitReport, { isLoading: isSubmittingReport }] = useSubmitReportMutation();
  const [manageResponsibilities, { isLoading: isManagingResp }] = useManageReportingResponsibilitiesMutation();

  // -------------------------------------------------------------
  // TAB 2: TARGET PROPOSAL & PERIOD ALLOCATION STATE
  // -------------------------------------------------------------
  const [annualTargetInput, setAnnualTargetInput] = useState<string>("");
  const [periodAllocations, setPeriodAllocations] = useState<TargetPeriodNode[]>([]);
  const [submissionNotes, setSubmissionNotes] = useState<string>("");
  const [expandedDeptPeriods, setExpandedDeptPeriods] = useState<Record<string, boolean>>({});

  // -------------------------------------------------------------
  // TAB 3: REPORT SUBMISSION FORM STATE
  // -------------------------------------------------------------
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reportQuantity, setReportQuantity] = useState<string>("");
  const [reportNotes, setReportNotes] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedTargetPeriodId, setSelectedTargetPeriodId] = useState<string | null>(null);
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState<string | null>(null);

  // -------------------------------------------------------------
  // TAB 5: RESPONSIBILITY ASSIGNMENT STATE
  // -------------------------------------------------------------
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignType, setAssignType] = useState<"department" | "user" | "role">("department");
  const [assignTargetId, setAssignTargetId] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState<string>("");

  const assignment = detailBundle?.assignment;
  const license = assignment?.license;
  const approvedTarget = detailBundle?.approvedTarget;
  const latestTarget = detailBundle?.latestTarget;
  const targetProposal = detailBundle?.targetProposal;

  const targetDepth = assignment?.target_allocation_depth || "quarterly";
  const unitSymbol = assignment?.defaultReportingUnit?.symbol || "unit";
  const unitName = assignment?.defaultReportingUnit?.name || "Standard Unit";

  // Initialize Target Proposal state from server data or generate default periods
  const targetProposalId = targetProposal?.root?.target_id;
  const assignmentKey = assignment?.assignment_id;

  useEffect(() => {
    if (targetProposal && targetProposal.periods && targetProposal.periods.length > 0) {
      setAnnualTargetInput(String(targetProposal.annual_target || ""));
      setSubmissionNotes(targetProposal.submission_notes || "");
      setPeriodAllocations(
        targetProposal.periods.map((p) => ({
          target_period_type: p.target_period_type,
          period_label: p.period_label,
          period_start_date: p.period_start_date,
          period_end_date: p.period_end_date,
          target_quantity: p.target_quantity,
          department_allocations: (p.department_allocations || []).map((d) => ({
            company_structure_id: d.company_structure_id || "",
            target_quantity: d.target_quantity,
          })),
        }))
      );
    } else if (assignment && periodAllocations.length === 0) {
      // Generate initial blank period template according to target_allocation_depth
      generatePeriodTemplates(targetDepth, 0);
    }
  }, [targetProposalId, assignmentKey, targetDepth]);

  // Helper to generate period templates
  function generatePeriodTemplates(depth: string, totalAnnual: number) {
    const currentYear = new Date().getFullYear();
    const periods: TargetPeriodNode[] = [];

    if (depth === "monthly") {
      const perMonth = totalAnnual > 0 ? Number((totalAnnual / 12).toFixed(4)) : "";
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        const lastDay = new Date(currentYear, m, 0).getDate();
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ];
        periods.push({
          target_period_type: "month",
          period_label: `${monthNames[m - 1]} (${currentYear}-${mm})`,
          period_start_date: `${currentYear}-${mm}-01`,
          period_end_date: `${currentYear}-${mm}-${lastDay}`,
          target_quantity: perMonth,
          department_allocations: [],
        });
      }
    } else if (depth === "semi_annual") {
      const perHalf = totalAnnual > 0 ? Number((totalAnnual / 2).toFixed(4)) : "";
      periods.push(
        {
          target_period_type: "half_year",
          period_label: `H1 (${currentYear} Jan - Jun)`,
          period_start_date: `${currentYear}-01-01`,
          period_end_date: `${currentYear}-06-30`,
          target_quantity: perHalf,
          department_allocations: [],
        },
        {
          target_period_type: "half_year",
          period_label: `H2 (${currentYear} Jul - Dec)`,
          period_start_date: `${currentYear}-07-01`,
          period_end_date: `${currentYear}-12-31`,
          target_quantity: perHalf,
          department_allocations: [],
        }
      );
    } else if (depth === "annual") {
      periods.push({
        target_period_type: "year",
        period_label: `Full Year ${currentYear}`,
        period_start_date: `${currentYear}-01-01`,
        period_end_date: `${currentYear}-12-31`,
        target_quantity: totalAnnual > 0 ? totalAnnual : "",
        department_allocations: [],
      });
    } else {
      // Default: quarterly
      const perQ = totalAnnual > 0 ? Number((totalAnnual / 4).toFixed(4)) : "";
      periods.push(
        {
          target_period_type: "quarter",
          period_label: `Q1 (${currentYear} Jan - Mar)`,
          period_start_date: `${currentYear}-01-01`,
          period_end_date: `${currentYear}-03-31`,
          target_quantity: perQ,
          department_allocations: [],
        },
        {
          target_period_type: "quarter",
          period_label: `Q2 (${currentYear} Apr - Jun)`,
          period_start_date: `${currentYear}-04-01`,
          period_end_date: `${currentYear}-06-30`,
          target_quantity: perQ,
          department_allocations: [],
        },
        {
          target_period_type: "quarter",
          period_label: `Q3 (${currentYear} Jul - Sep)`,
          period_start_date: `${currentYear}-07-01`,
          period_end_date: `${currentYear}-09-30`,
          target_quantity: perQ,
          department_allocations: [],
        },
        {
          target_period_type: "quarter",
          period_label: `Q4 (${currentYear} Oct - Dec)`,
          period_start_date: `${currentYear}-10-01`,
          period_end_date: `${currentYear}-12-31`,
          target_quantity: perQ,
          department_allocations: [],
        }
      );
    }

    setPeriodAllocations(periods);
  }

  // Handle annual target change & auto-distribute
  const handleAnnualTargetChange = (val: string) => {
    setAnnualTargetInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      generatePeriodTemplates(targetDepth, num);
    }
  };

  // Handle individual period target edit
  const handlePeriodQuantityChange = (index: number, val: string) => {
    setPeriodAllocations((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        target_quantity: val === "" ? "" : parseFloat(val) || 0,
      };
      return copy;
    });
  };

  // Handle department allocation edit within a period
  const handleDeptAllocationChange = (
    periodIndex: number,
    deptStructureId: string,
    val: string
  ) => {
    setPeriodAllocations((prev) => {
      const copy = [...prev];
      const p = { ...copy[periodIndex] };
      const currentDepts = [...(p.department_allocations || [])];
      const existingIdx = currentDepts.findIndex(
        (d) => d.company_structure_id === deptStructureId
      );

      const numVal = val === "" ? 0 : parseFloat(val) || 0;

      if (existingIdx >= 0) {
        if (numVal === 0 && val === "") {
          currentDepts.splice(existingIdx, 1);
        } else {
          currentDepts[existingIdx] = {
            ...currentDepts[existingIdx],
            target_quantity: numVal,
          };
        }
      } else if (numVal > 0) {
        currentDepts.push({
          company_structure_id: deptStructureId,
          target_quantity: numVal,
        });
      }

      p.department_allocations = currentDepts;
      copy[periodIndex] = p;
      return copy;
    });
  };

  // Toggle department tree view for a period
  const toggleDeptPeriod = (periodLabel: string) => {
    setExpandedDeptPeriods((prev) => ({
      ...prev,
      [periodLabel]: !prev[periodLabel],
    }));
  };

  // Validation calculations
  const totalAllocatedPeriods = useMemo(() => {
    return periodAllocations.reduce((sum, p) => sum + (Number(p.target_quantity) || 0), 0);
  }, [periodAllocations]);

  const targetAnnualNum = parseFloat(annualTargetInput) || 0;
  const periodDifference = Number((targetAnnualNum - totalAllocatedPeriods).toFixed(4));
  const isPeriodSumValid = targetAnnualNum > 0 && Math.abs(periodDifference) < 0.0001;

  // Department reconciliation check
  const deptReconciliationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    for (const p of periodAllocations) {
      if (p.department_allocations && p.department_allocations.length > 0) {
        const deptSum = p.department_allocations.reduce(
          (sum, d) => sum + (Number(d.target_quantity) || 0),
          0
        );
        const pQty = Number(p.target_quantity) || 0;
        if (Math.abs(deptSum - pQty) > 0.0001) {
          errors[p.period_label] = `Dept allocations (${deptSum.toFixed(
            2
          )}) do not match period target (${pQty.toFixed(2)})`;
        }
      }
    }
    return errors;
  }, [periodAllocations]);

  const hasDeptErrors = Object.keys(deptReconciliationErrors).length > 0;
  const isTargetProposalValid = isPeriodSumValid && !hasDeptErrors;

  // -------------------------------------------------------------
  // SAVE & SUBMIT HANDLERS
  // -------------------------------------------------------------
  const handleSaveProposal = async (autoSubmit: boolean) => {
    if (!isTargetProposalValid) {
      actionFeedback.error(
        "Please ensure the sum of period allocations equals the annual target and all department allocations reconcile.",
        { title: "Validation Error" }
      );
      return;
    }

    try {
      await saveTargetProposal({
        id: assignmentId || "",
        annual_target: targetAnnualNum,
        period_type: targetDepth,
        period_allocations: periodAllocations,
        submission_notes: submissionNotes,
        auto_submit: autoSubmit,
      }).unwrap();

      actionFeedback.success(
        autoSubmit
          ? "Your annual production target proposal has been submitted to the Federal Ministry for review."
          : "Your target proposal draft has been saved successfully.",
        { title: autoSubmit ? "Target Proposal Submitted" : "Draft Saved" }
      );

      refetchDetail();
    } catch (err: any) {
      actionFeedback.error(
        err?.data?.message || err?.message || "Failed to save target proposal.",
        { title: "Save Failed" }
      );
    }
  };

  // Submit Report Handler
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(reportQuantity);
    if (isNaN(qty) || qty <= 0) {
      actionFeedback.error("Please enter a positive production actual quantity.", {
        title: "Invalid Quantity",
      });
      return;
    }

    try {
      await submitReport({
        assignment_id: assignmentId || "",
        report_date: reportDate,
        quantity_reported: qty,
        reported_unit_id: assignment?.default_reporting_unit_id || "",
        company_structure_id: selectedDeptId && selectedDeptId !== "none" ? selectedDeptId : null,
        target_period_id: selectedTargetPeriodId || undefined,
        period_label: selectedPeriodLabel || undefined,
        notes: reportNotes,
      }).unwrap();

      actionFeedback.success(
        `Production actual of ${qty} ${unitSymbol} successfully recorded.`,
        { title: "Report Submitted" }
      );

      setReportQuantity("");
      setReportNotes("");
      setIsReportModalOpen(false);
      refetchDetail();
    } catch (err: any) {
      actionFeedback.error(
        err?.data?.message || err?.message || "Failed to submit production report.",
        { title: "Report Submission Failed" }
      );
    }
  };

  // Responsibility Assignment Handler
  const handleSaveResponsibility = async () => {
    if (!assignTargetId) {
      actionFeedback.error("Please select an entity to assign responsibility to.", {
        title: "Selection Required",
      });
      return;
    }

    const currentResp = [...(detailBundle?.responsibilities || [])];
    const newEntry: any = {
      notes: assignNotes || null,
    };

    if (assignType === "department") newEntry.company_structure_id = assignTargetId;
    if (assignType === "user") newEntry.user_id = assignTargetId;
    if (assignType === "role") newEntry.role_id = assignTargetId;

    try {
      await manageResponsibilities({
        id: assignmentId || "",
        responsibilities: [...currentResp, newEntry],
      }).unwrap();

      actionFeedback.success(
        "Production reporting responsibility added successfully.",
        { title: "Responsibility Assigned" }
      );

      setIsAssignModalOpen(false);
      setAssignTargetId("");
      setAssignNotes("");
      refetchDetail();
    } catch (err: any) {
      actionFeedback.error(
        err?.data?.message || err?.message || "Failed to assign responsibility.",
        { title: "Assignment Failed" }
      );
    }
  };

  const handleRemoveResponsibility = async (respId: string) => {
    const filtered = (detailBundle?.responsibilities || []).filter(
      (r) => r.assignment_responsibility_id !== respId
    );

    try {
      await manageResponsibilities({
        id: assignmentId || "",
        responsibilities: filtered,
      }).unwrap();

      actionFeedback.success(
        "Assigned party has been removed from reporting responsibilities.",
        { title: "Responsibility Removed" }
      );

      refetchDetail();
    } catch (err: any) {
      actionFeedback.error(
        err?.data?.message || "Failed to remove responsibility.",
        { title: "Action Failed" }
      );
    }
  };

  if (isDetailLoading) {
    return <Loading01 />;
  }

  if (!assignment) {
    return (
      <div className="p-8 text-center border rounded-2xl bg-destructive/5 text-destructive space-y-4 max-w-xl mx-auto my-12">
        <AlertCircle className="h-10 w-10 mx-auto" />
        <h3 className="text-lg font-bold">Production Assignment Not Found</h3>
        <p className="text-sm text-muted-foreground">
          The requested production assignment could not be found or verified.
        </p>
        <Button asChild variant="outline">
          <Link href={`/companies/${companyId}/productions`}>Return to Productions</Link>
        </Button>
      </div>
    );
  }

  const hasApprovedTarget = Boolean(
    approvedTarget ||
    detailBundle?.approvedTarget ||
    detailBundle?.approvedTargetsTree
  );
  const proposalStatus =
    targetProposal?.status ||
    latestTarget?.status ||
    (hasApprovedTarget ? "approved" : "draft");
  const isProposalApproved =
    proposalStatus === "approved" || proposalStatus === "published" || hasApprovedTarget;
  const isProposalSubmitted = proposalStatus === "submitted" || proposalStatus === "under_review";
  const isProposalRejected = proposalStatus === "rejected";
  const isRevisionRequested = proposalStatus === "revision_requested";
  const isReportingUnlocked = Boolean(detailBundle?.isReportingUnlocked || hasApprovedTarget);

  const [isRevisingProposal, setIsRevisingProposal] = useState(false);
  const [isAmendmentModalOpen, setIsAmendmentModalOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  const pendingAmendment = detailBundle?.pendingAmendment;
  const latestAmendment = detailBundle?.latestAmendment;
  const amendmentComparison = detailBundle?.amendmentComparison;

  // Form inputs are locked if:
  // - Approved (permanently locked, must request amendment)
  // - Submitted / Under Review
  // - Rejected / Revision Requested AND user hasn't clicked "Revise Proposal"
  const isInputsLocked =
    isProposalApproved ||
    isProposalSubmitted ||
    ((isProposalRejected || isRevisionRequested) && !isRevisingProposal);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 gap-1 text-xs"
          >
            <Link href={`/companies/${companyId}/productions`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Productions
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground font-mono">
            {assignment.productionItem?.name} &bull; Concession: {license?.license_number || "Direct"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isReportingUnlocked ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 py-1 px-3">
              <Unlock className="h-3.5 w-3.5" />
              Reporting Enabled
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1 py-1 px-3">
              <Lock className="h-3.5 w-3.5" />
              Reporting Locked
            </Badge>
          )}
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-card to-muted/20 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Factory className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {assignment.company?.code || "COMP"} Concession Production
                </Badge>
                {license && (
                  <Link href={`/companies/${companyId}/licenses/${license.license_id}`}>
                    <Badge variant="secondary" className="hover:underline cursor-pointer gap-1">
                      <FileBadge className="h-3 w-3" />
                      {license.license_number}
                    </Badge>
                  </Link>
                )}
                <Badge
                  variant="outline"
                  className={
                    isProposalApproved
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : isProposalSubmitted
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  }
                >
                  Target: {proposalStatus.toUpperCase()}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                {assignment.productionItem?.name || "Mineral Production"}
              </h1>

              <p className="text-sm text-muted-foreground">
                Centrally configured reporting unit: <strong className="text-foreground">{unitName} ({unitSymbol})</strong> &bull; Frequency: <strong className="text-foreground">{assignment.reportingFrequency?.name}</strong> &bull; Allocation Depth: <strong className="text-foreground capitalize">{targetDepth}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
            <div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Approved Annual Target
              </div>
              <div className="text-xl font-bold text-foreground font-mono mt-0.5">
                {approvedTarget ? (
                  <span>
                    {Number(approvedTarget.target_quantity).toLocaleString()}{" "}
                    <span className="text-xs font-normal text-muted-foreground">{unitSymbol}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground font-sans font-normal italic">
                    Pending Approval
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Reporting Availability
              </div>
              <div className="text-base font-bold mt-0.5">
                {isReportingUnlocked ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Active
                  </span>
                ) : (
                  <span className="text-destructive flex items-center gap-1 text-xs">
                    <Lock className="h-3.5 w-3.5" /> Locked (Approval Required)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl h-11 p-1 bg-muted/60">
          <TabsTrigger value="overview" className="text-xs font-medium gap-1.5">
            Overview
          </TabsTrigger>
          <TabsTrigger value="target-allocation" className="text-xs font-medium gap-1.5">
            Target Allocation
          </TabsTrigger>
          <TabsTrigger value="reporting" className="text-xs font-medium gap-1.5">
            Reporting
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs font-medium gap-1.5">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="responsibilities" className="text-xs font-medium gap-1.5">
            Responsibilities
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: OVERVIEW
        ========================================================================= */}
        <TabsContent value="overview" className="space-y-6">
          {/* Reporting Locked Warning Banner */}
          {!isReportingUnlocked && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-4">
                <Lock className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm">
                    Periodic Production Reporting is Currently Locked
                  </h3>
                  <p className="text-xs leading-relaxed opacity-90">
                    Under Federal Ministry regulations, a company must first propose its annual production target, distribute it according to the centrally assigned target depth (<strong>{targetDepth}</strong>), and receive official Federal Approval.
                    {detailBundle?.licenseIneligibilityReason && (
                      <span className="block mt-1 font-semibold text-destructive">
                        {detailBundle.licenseIneligibilityReason}
                      </span>
                    )}
                  </p>
                  <div className="pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleTabChange("target-allocation")}
                      className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Configure Target Proposal
                      <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Assignment Specs */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Factory className="h-4 w-4 text-primary" />
                  Central Assignment Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Production Item:</span>
                  <span className="font-semibold text-foreground">{assignment.productionItem?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium text-foreground">{assignment.productionItem?.category || "Metals"}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Centrally Fixed Unit:</span>
                  <span className="font-mono font-medium text-foreground">{unitName} ({unitSymbol})</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Reporting Frequency:</span>
                  <span className="font-medium text-foreground capitalize">{assignment.reportingFrequency?.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Target Allocation Depth:</span>
                  <span className="font-mono font-semibold text-primary capitalize">{targetDepth}</span>
                </div>
              </CardContent>
            </Card>

            {/* License Concession Details */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileBadge className="h-4 w-4 text-primary" />
                  Concession License Binding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">License Number:</span>
                  <span className="font-mono font-bold text-foreground">
                    {license?.license_number || "Direct"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">License Type:</span>
                  <span className="font-medium text-foreground">{license?.licenseType?.name || "Mining"}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Effective Dates:</span>
                  <span className="font-mono text-foreground">
                    {license?.effective_start_date || "—"} to {license?.effective_end_date || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium text-foreground">
                    {[license?.region, license?.woreda].filter(Boolean).join(", ") || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">License Status:</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {license?.status || "ACTIVE"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Target & Approval Summary */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Target Proposal & Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Target Version:</span>
                  <span className="font-mono font-bold text-foreground">
                    Version {latestTarget?.version_number || 1}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Proposal Status:</span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {proposalStatus.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Proposed Annual:</span>
                  <span className="font-mono font-bold text-foreground">
                    {latestTarget ? `${Number(latestTarget.target_quantity).toLocaleString()} ${unitSymbol}` : "None"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Approved Annual:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {approvedTarget ? `${Number(approvedTarget.target_quantity).toLocaleString()} ${unitSymbol}` : "None"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Reporting Eligibility:</span>
                  <span className={isReportingUnlocked ? "text-emerald-600 font-bold" : "text-destructive font-bold"}>
                    {isReportingUnlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Latest Reports Snippet */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Recent Production Submissions</span>
                <Button size="sm" variant="ghost" onClick={() => handleTabChange("reporting")} className="h-7 text-xs">
                  View All &rarr;
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(detailBundle?.recentReports || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground italic">
                  No production reports submitted yet.
                </div>
              ) : (
                <div className="divide-y text-xs">
                  {(detailBundle?.recentReports || []).slice(0, 5).map((r) => (
                    <div key={r.report_id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-semibold text-foreground font-mono">{r.report_date}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {r.period_label || r.report_date} &bull; Submitted by {r.submittedByUser?.full_name || "Company"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-foreground">
                          {Number(r.quantity_reported).toLocaleString()} {r.reportedUnit?.symbol || unitSymbol}
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {r.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 2: TARGET ALLOCATION & APPROVAL WORKFLOW
        ========================================================================= */}
        <TabsContent value="target-allocation" className="space-y-6">
          {/* Top KPI Metrics Banner for Target Allocation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border shadow-xs bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-4 space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Factory className="h-3.5 w-3.5 text-primary" />
                  Proposed Annual Target
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-foreground">
                    {targetAnnualNum ? targetAnnualNum.toLocaleString() : "0"}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {unitSymbol}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Fixed unit: <span className="font-semibold">{unitName}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-4 space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Allocation Depth
                </span>
                <div className="text-xl font-bold font-mono text-foreground capitalize">
                  {targetDepth.replace("_", " ")}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Distributed over <span className="font-semibold text-foreground">{periodAllocations.length}</span> periods
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Reconciliation
                  </span>
                  {isPeriodSumValid ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] h-5 gap-1">
                      <Check className="h-2.5 w-2.5" /> 100% Balanced
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                      {periodDifference > 0 ? `+${periodDifference}` : periodDifference} {unitSymbol}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black font-mono text-foreground">
                    {totalAllocatedPeriods.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {targetAnnualNum ? targetAnnualNum.toLocaleString() : "0"} {unitSymbol}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isPeriodSumValid
                        ? "bg-emerald-500"
                        : totalAllocatedPeriods > (targetAnnualNum || 0)
                        ? "bg-destructive"
                        : "bg-amber-500"
                    }`}
                    style={{
                      width: `${
                        targetAnnualNum
                          ? Math.min(100, Math.round((totalAllocatedPeriods / targetAnnualNum) * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-4 space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Federal Approval Status
                </span>
                <div>
                  <Badge
                    variant="outline"
                    className={`capitalize text-xs font-semibold px-2.5 py-0.5 ${
                      proposalStatus === "approved"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : proposalStatus === "submitted"
                        ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                        : proposalStatus === "revision_requested"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        : "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
                    }`}
                  >
                    {proposalStatus.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  {proposalStatus === "approved"
                    ? "Target approved; periodic reporting unlocked."
                    : proposalStatus === "submitted"
                    ? "Awaiting Federal Ministry evaluation."
                    : proposalStatus === "revision_requested"
                    ? "Revision required before reporting."
                    : "Draft; submit proposal when ready."}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Target Proposal Configuration Card */}
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/15 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Factory className="h-5 w-5 text-primary" />
                    Annual Production Target & Periodic Distribution
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Propose your annual target and distribute it across the centrally required allocation depth (
                    <span className="font-semibold text-foreground uppercase">{targetDepth}</span>).
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    Depth: {targetDepth.toUpperCase()}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      proposalStatus === "approved"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : proposalStatus === "submitted"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    }
                  >
                    Status: {proposalStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {hasApprovedTarget ? (
                /* =======================================================
                   VIEW APPROVED TARGET ALLOCATION (ACTIVE STANDARD)
                ======================================================= */
                <div className="space-y-6">
                  {/* Top Pending Amendment Notification (if any) */}
                  {pendingAmendment && (
                    <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <Scale className="h-4 w-4" />
                            Target Amendment Request ({pendingAmendment.amendment_reference}) Under Federal Review
                          </div>
                          <p className="text-[11px] opacity-90 mt-0.5">
                            Proposed Annual Target: <strong>{Number(pendingAmendment.proposed_annual_target).toLocaleString()} {unitSymbol}</strong> &bull; Reason: &ldquo;{pendingAmendment.amendment_reason}&rdquo;
                          </p>
                        </div>
                      </div>
                      {detailBundle?.amendmentComparison && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsComparisonModalOpen(true)}
                          className="h-8 text-xs gap-1.5 shrink-0 bg-white dark:bg-card text-foreground"
                        >
                          <Scale className="h-3.5 w-3.5 text-blue-600" />
                          View Amendment Comparison
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Rejected Amendment Notice (if any) */}
                  {!pendingAmendment && latestAmendment?.status === "amendment_rejected" && (
                    <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">
                          Last Target Amendment Request ({latestAmendment.amendment_reference}) was Rejected
                        </div>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          Feedback: &ldquo;{latestAmendment.review_comments}&rdquo; &bull; The current approved target remains the active production standard.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Approved Target Details Banner with SINGLE prominent Request Amendment button */}
                  <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-foreground space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-foreground">
                              Approved Production Target Allocation (Version {approvedTarget?.version_number || targetProposal?.version_number || 1})
                            </h3>
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              Officially Active & Locked
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Approved by {targetProposal?.reviewed_by?.full_name || targetProposal?.reviewer?.full_name || "Federal Ministry"} &bull; Direct company edits are locked. Periodic reporting is enabled.
                          </p>
                        </div>
                      </div>

                      {/* Exactly ONE button for requesting amendment */}
                      <Button
                        type="button"
                        size="sm"
                        disabled={Boolean(pendingAmendment)}
                        onClick={() => setIsAmendmentModalOpen(true)}
                        className="h-9 text-xs gap-1.5 shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                      >
                        <Scale className="h-4 w-4" />
                        {pendingAmendment ? "Amendment Under Review" : "Request Target Amendment"}
                      </Button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-card border shadow-2xs">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Approved Annual Target</span>
                        <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                          {Number(approvedTarget?.target_quantity || targetProposal?.annual_target || annualTargetInput || 0).toLocaleString()} {unitSymbol}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-card border shadow-2xs">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Production Item</span>
                        <span className="text-xs font-semibold text-foreground mt-0.5 truncate block">
                          {assignment.productionItem?.name}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-card border shadow-2xs">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Target Allocation Depth</span>
                        <span className="text-xs font-mono font-bold uppercase text-foreground mt-0.5 block">
                          {targetDepth}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-card border shadow-2xs">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Reporting Unit</span>
                        <span className="text-xs font-semibold text-foreground mt-0.5 block">
                          {unitName} ({unitSymbol})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Period Classification Breakdown Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          Approved Period Target Distribution ({targetDepth.toUpperCase()})
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Official periodic allocations approved by Federal Ministry.
                        </p>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[11px] gap-1 font-mono">
                        <Check className="h-3 w-3" /> 100% Reconciled
                      </Badge>
                    </div>

                    <div className="border rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b">
                          <tr>
                            <th className="py-2.5 px-4">Period</th>
                            <th className="py-2.5 px-4">Classification</th>
                            <th className="py-2.5 px-4">Validity Date Range</th>
                            <th className="py-2.5 px-4 text-right">Approved Target ({unitSymbol})</th>
                            <th className="py-2.5 px-4 text-right">Department Allocations</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(detailBundle?.approvedTargetsTree?.periods || targetProposal?.periods || periodAllocations).map((p: any) => {
                            const isExpanded = !!expandedDeptPeriods[p.period_label];
                            const deptAllocations = p.department_allocations || [];

                            return (
                              <React.Fragment key={p.period_label}>
                                <tr className="hover:bg-muted/15 transition-colors">
                                  <td className="py-3 px-4 font-semibold text-foreground">
                                    {p.period_label}
                                  </td>
                                  <td className="py-3 px-4 capitalize font-mono text-muted-foreground">
                                    {p.target_period_type || targetDepth}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-muted-foreground">
                                    {p.period_start_date} &rarr; {p.period_end_date}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                                    {Number(p.target_quantity || 0).toLocaleString()} {unitSymbol}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {deptAllocations.length > 0 ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => toggleDeptPeriod(p.period_label)}
                                        className="h-7 text-xs gap-1 font-medium text-primary"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-3.5 w-3.5" />
                                        ) : (
                                          <ChevronRight className="h-3.5 w-3.5" />
                                        )}
                                        <span>{deptAllocations.length} Depts</span>
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground italic text-[11px]">Company Level</span>
                                    )}
                                  </td>
                                </tr>

                                {isExpanded && deptAllocations.length > 0 && (
                                  <tr className="bg-muted/20 border-b">
                                    <td colSpan={5} className="p-4 space-y-2">
                                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <Building2 className="h-4 w-4 text-primary" />
                                        <span>Department Allocations for {p.period_label}</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        {deptAllocations.map((d: any) => (
                                          <div
                                            key={d.target_id || d.company_structure_id}
                                            className="p-2 rounded-lg border bg-card flex items-center justify-between text-xs shadow-2xs"
                                          >
                                            <span className="font-medium text-foreground truncate">
                                              {d.department?.name || d.name || "Department"}
                                            </span>
                                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                              {Number(d.target_quantity).toLocaleString()} {unitSymbol}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* List of Other Requests: Target Amendment Requests & Review History */}
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Scale className="h-4 w-4 text-amber-600" />
                        Target Amendment Requests & Review History
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Formal target modification requests submitted to the Federal Ministry.
                      </p>
                    </div>

                    {(detailBundle?.allAmendments || []).length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground border rounded-xl bg-card italic">
                        No target amendment requests submitted yet. The active approved target remains the binding standard.
                      </div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b">
                            <tr>
                              <th className="py-2.5 px-4">Ref #</th>
                              <th className="py-2.5 px-4">Status</th>
                              <th className="py-2.5 px-4 text-right">Proposed Annual Target</th>
                              <th className="py-2.5 px-4">Reason</th>
                              <th className="py-2.5 px-4">Submitted Date</th>
                              <th className="py-2.5 px-4">Review Decision / Comments</th>
                              <th className="py-2.5 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {(detailBundle?.allAmendments || []).map((amendment) => {
                              const isApproved = amendment.status === "amendment_approved";
                              const isPending = amendment.status === "amendment_submitted" || amendment.status === "amendment_under_review";
                              const isRejected = amendment.status === "amendment_rejected";

                              return (
                                <tr key={amendment.amendment_id} className="hover:bg-muted/15 transition-colors">
                                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                                    {amendment.amendment_reference}
                                  </td>
                                  <td className="py-3 px-4">
                                    <Badge
                                      variant="outline"
                                      className={
                                        isApproved
                                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                          : isPending
                                          ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                          : isRejected
                                          ? "bg-destructive/10 text-destructive border-destructive/30"
                                          : "bg-muted text-muted-foreground"
                                      }
                                    >
                                      {amendment.status.replace(/_/g, " ").toUpperCase()}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                                    {Number(amendment.proposed_annual_target).toLocaleString()} {unitSymbol}
                                  </td>
                                  <td className="py-3 px-4 max-w-[200px] truncate text-muted-foreground" title={amendment.amendment_reason || ""}>
                                    {amendment.amendment_reason || "Target amendment request"}
                                  </td>
                                  <td className="py-3 px-4 text-muted-foreground">
                                    {amendment.submitted_at ? new Date(amendment.submitted_at).toLocaleDateString() : "—"}
                                  </td>
                                  <td className="py-3 px-4 max-w-[180px] truncate text-muted-foreground" title={amendment.review_comments || ""}>
                                    {amendment.review_comments || "—"}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {detailBundle?.amendmentComparison && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsComparisonModalOpen(true)}
                                        className="h-7 text-xs px-2 gap-1 text-primary"
                                      >
                                        <Layers className="h-3 w-3" />
                                        Compare
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* =======================================================
                   INITIAL PROPOSAL FORMULATION & SUBMISSION FORM
                ======================================================= */
                <div className="space-y-6">
                  {/* Initial Submitted Banner */}
                  {proposalStatus === "submitted" && (
                    <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-3">
                      <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-bold">Target Proposal Under Federal Review: </span>
                        This proposal is currently being reviewed by the Federal Ministry of Mines. You will be notified once a decision is made.
                      </div>
                    </div>
                  )}

                  {/* Rejected Proposal Banner with Revise Action */}
                  {proposalStatus === "rejected" && (
                    <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">Target Proposal Rejected by Federal Ministry</div>
                          <p className="text-[11px] opacity-90 mt-0.5">
                            Reviewer Feedback: &ldquo;{targetProposal?.review_comments || "Proposal does not meet standard resource allocation rules."}&rdquo;
                          </p>
                        </div>
                      </div>
                      {!isRevisingProposal && (
                        <Button
                          size="sm"
                          onClick={() => setIsRevisingProposal(true)}
                          className="h-8 text-xs gap-1.5 shrink-0 bg-destructive hover:bg-destructive/90 text-white font-semibold"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Revise and Resubmit Proposal
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Revision Requested Banner */}
                  {proposalStatus === "revision_requested" && (
                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <RotateCcw className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">Revision Requested by Federal Reviewer</div>
                          <p className="text-[11px] opacity-90 mt-0.5">
                            Instructions: &ldquo;{targetProposal?.review_comments || "Please review and adjust period target allocations."}&rdquo;
                          </p>
                        </div>
                      </div>
                      {!isRevisingProposal && (
                        <Button
                          size="sm"
                          onClick={() => setIsRevisingProposal(true)}
                          className="h-8 text-xs gap-1.5 shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Edit Revision & Resubmit
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Annual Target Input Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end p-4 rounded-xl border bg-card">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>Proposed Annual Production Target</span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          Unit is fixed by Federal Assignment: <strong>{unitName} ({unitSymbol})</strong>
                        </span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 1200"
                          value={annualTargetInput}
                          disabled={isInputsLocked}
                          onChange={(e) => handleAnnualTargetChange(e.target.value)}
                          className="pr-16 text-base font-bold font-mono"
                        />
                        <div className="absolute right-3 top-2.5 text-xs font-mono font-semibold text-muted-foreground">
                          {unitSymbol}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full text-xs h-9 gap-1.5"
                        disabled={isInputsLocked || !targetAnnualNum}
                        onClick={() => generatePeriodTemplates(targetDepth, targetAnnualNum)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Auto-Distribute Equally
                      </Button>
                    </div>
                  </div>

                  {/* Periodic Distribution Table */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          Period Target Distribution ({targetDepth.toUpperCase()})
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Adjust individual period targets to reflect seasonal extraction plans. Sum must equal the annual target.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Total Allocated:</span>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {totalAllocatedPeriods.toLocaleString()} {unitSymbol}
                        </span>
                        {isPeriodSumValid ? (
                          <Badge className="bg-emerald-600 text-white text-[11px] gap-1">
                            <Check className="h-3 w-3" /> Reconciled
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[11px] gap-1">
                            Difference: {periodDifference > 0 ? `+${periodDifference}` : periodDifference} {unitSymbol}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Table of periods */}
                    <div className="border rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b">
                          <tr>
                            <th className="py-2.5 px-4">Period</th>
                            <th className="py-2.5 px-4">Date Range</th>
                            <th className="py-2.5 px-4">Target Quantity ({unitSymbol})</th>
                            <th className="py-2.5 px-4 text-right">Department Tree Allocation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {periodAllocations.map((p, pIdx) => {
                            const isExpanded = !!expandedDeptPeriods[p.period_label];
                            const deptAllocations = p.department_allocations || [];
                            const deptAllocSum = deptAllocations.reduce(
                              (sum, d) => sum + (Number(d.target_quantity) || 0),
                              0
                            );
                            const hasDeptReconcileError =
                              deptAllocations.length > 0 &&
                              Math.abs(deptAllocSum - (Number(p.target_quantity) || 0)) > 0.0001;

                            return (
                              <React.Fragment key={p.period_label}>
                                <tr className="hover:bg-muted/15 transition-colors">
                                  <td className="py-3 px-4 font-semibold text-foreground">
                                    {p.period_label}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-muted-foreground">
                                    {p.period_start_date} &rarr; {p.period_end_date}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="relative max-w-[180px]">
                                      <Input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={p.target_quantity ?? ""}
                                        disabled={isInputsLocked}
                                        onChange={(e) => handlePeriodQuantityChange(pIdx, e.target.value)}
                                        className="h-8 font-mono text-xs pr-10 font-medium"
                                      />
                                      <span className="absolute right-2.5 top-2 text-[10px] font-mono text-muted-foreground">
                                        {unitSymbol}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => toggleDeptPeriod(p.period_label)}
                                      className="h-7 text-xs gap-1 font-medium text-primary"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      )}
                                      <span>
                                        {deptAllocations.length > 0
                                          ? `${deptAllocations.length} Depts Allocated`
                                          : "Allocate to Depts"}
                                      </span>
                                    </Button>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr className="bg-muted/20 border-b">
                                    <td colSpan={4} className="p-4 space-y-3">
                                      <div className="flex items-center justify-between border-b pb-2">
                                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                          <Building2 className="h-4 w-4 text-primary" />
                                          <span>Department Target Allocation for {p.period_label}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-muted-foreground">Total Assigned to Depts:</span>
                                          <span className="font-mono font-bold text-foreground">
                                            {deptAllocSum.toFixed(2)} / {Number(p.target_quantity || 0).toFixed(2)} {unitSymbol}
                                          </span>
                                          {hasDeptReconcileError && (
                                            <Badge variant="destructive" className="text-[10px]">
                                              Unallocated: {(Number(p.target_quantity || 0) - deptAllocSum).toFixed(2)}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

                                      {structures.length === 0 ? (
                                        <div className="text-xs text-muted-foreground italic py-2">
                                          No internal departments configured for this company. Targets will remain at the company level.
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                          {structures.map((s) => {
                                            const alloc = deptAllocations.find(
                                              (d) => d.company_structure_id === s.company_structure_id
                                            );
                                            const allocVal = alloc ? alloc.target_quantity : "";

                                            return (
                                              <div
                                                key={s.company_structure_id}
                                                className="p-2.5 rounded-lg border bg-card space-y-1.5 shadow-2xs"
                                              >
                                                <div className="flex items-center justify-between text-xs">
                                                  <span className="font-semibold text-foreground truncate">
                                                    {s.name}
                                                  </span>
                                                  <span className="text-[10px] text-muted-foreground font-mono">
                                                    L{s.level}
                                                  </span>
                                                </div>
                                                <div className="relative">
                                                  <Input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    placeholder="0"
                                                    disabled={isInputsLocked}
                                                    value={allocVal}
                                                    onChange={(e) =>
                                                      handleDeptAllocationChange(
                                                        pIdx,
                                                        s.company_structure_id,
                                                        e.target.value
                                                      )
                                                    }
                                                    className="h-7 text-xs font-mono pr-9"
                                                  />
                                                  <span className="absolute right-2 top-1.5 text-[10px] font-mono text-muted-foreground">
                                                    {unitSymbol}
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Submission Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Proposal Submission Notes / Justification</Label>
                    <Textarea
                      placeholder="Provide operational plan context, expected grade, seasonal constraints, or extraction methodology for Federal reviewers..."
                      value={submissionNotes}
                      disabled={isInputsLocked}
                      onChange={(e) => setSubmissionNotes(e.target.value)}
                      className="text-xs h-20"
                    />
                  </div>

                  {/* Action Buttons */}
                  {isProposalSubmitted ? (
                    <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                        <Clock className="h-4 w-4" />
                        Target proposal is currently under Federal evaluation. Direct edits are locked.
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        {!isTargetProposalValid ? (
                          <span className="text-destructive font-semibold">
                            &bull; Resolve target sum and department reconciliation errors before submitting.
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">
                            &bull; Target allocation perfectly reconciled and ready for Federal review.
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isSavingTarget}
                          onClick={() => handleSaveProposal(false)}
                          className="text-xs h-9 gap-1.5"
                        >
                          <Save className="h-4 w-4" />
                          Save Draft
                        </Button>

                        <Button
                          type="button"
                          disabled={!isTargetProposalValid || isSavingTarget}
                          onClick={() => handleSaveProposal(true)}
                          className="text-xs h-9 gap-1.5 bg-primary hover:bg-primary/90 text-white"
                        >
                          <Send className="h-4 w-4" />
                          {isRevisingProposal ? "Resubmit for Federal Review" : "Submit for Federal Review"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 7.3 Target Approval History Timeline */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/15">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Federal Review & Target Approval History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {(detailBundle?.approvalHistory || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  No approval history events recorded yet. When you submit your target proposal, review logs will appear here.
                </div>
              ) : (
                <div className="space-y-4">
                  {(detailBundle?.approvalHistory || []).map((h, i) => {
                    const action = h.action;
                    const isApproved = action === "approved";
                    const isRevision = action === "revision_requested";
                    const isRejected = action === "rejected";

                    return (
                      <div key={h.history_id} className="flex items-start gap-3 text-xs border-b pb-3 last:border-b-0 last:pb-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isApproved
                              ? "bg-emerald-500/20 text-emerald-600"
                              : isRevision
                              ? "bg-amber-500/20 text-amber-600"
                              : isRejected
                              ? "bg-destructive/20 text-destructive"
                              : "bg-blue-500/20 text-blue-600"
                          }`}
                        >
                          {isApproved ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground capitalize">
                              Version {h.version_number}: {action.replace("_", " ")}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {new Date(h.created_at).toLocaleString()}
                            </span>
                          </div>
                          {h.comments && (
                            <p className="text-muted-foreground bg-muted/30 p-2 rounded text-[11px]">
                              {h.comments}
                            </p>
                          )}
                          <div className="text-[10px] text-muted-foreground">
                            Action recorded by: <strong>{h.actor?.full_name || "Official"}</strong> ({h.actor?.email})
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 3: REPORTING (STRICTLY LOCKED BEFORE FEDERAL APPROVAL)
        ========================================================================= */}
        <TabsContent value="reporting" className="space-y-6">
          {!isReportingUnlocked ? (
            <Card className="border border-amber-500/30 bg-gradient-to-b from-amber-500/5 via-card to-card p-8 text-center space-y-6 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="h-8 w-8" />
              </div>

              <div className="space-y-2 max-w-xl mx-auto">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 px-3 py-1 text-xs">
                  Federal Compliance Gate
                </Badge>
                <h3 className="text-xl font-bold text-foreground">
                  Production Reporting Gate: Federal Approval Required
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To preserve statutory compliance and audit integrity, production actual reporting unlocks automatically once your annual production target has been reviewed and <strong>Approved</strong> by the Federal Ministry of Mines, and the underlying concession license is active.
                </p>
              </div>

              {/* 4-Step Visual Stepper */}
              <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  targetAnnualNum ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200" : "bg-muted/40 border-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Step 1</span>
                    {targetAnnualNum ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="font-semibold">Propose Target</div>
                  <div className="text-[10px] text-muted-foreground">Annual & period breakdown</div>
                </div>

                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  proposalStatus === "submitted" ? "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200" : proposalStatus === "approved" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/40 border-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Step 2</span>
                    {proposalStatus === "approved" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div className="font-semibold">Federal Review</div>
                  <div className="text-[10px] text-muted-foreground">Ministry evaluation</div>
                </div>

                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  proposalStatus === "approved" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200" : "bg-muted/40 border-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Step 3</span>
                    {proposalStatus === "approved" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="font-semibold">Target Approved</div>
                  <div className="text-[10px] text-muted-foreground">Versioned baseline</div>
                </div>

                <div className="p-3 rounded-xl border text-xs space-y-1.5 bg-muted/20 border-dashed border-border opacity-70">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Step 4</span>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="font-semibold">Reporting Open</div>
                  <div className="text-[10px] text-muted-foreground">Submit actuals</div>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <Button
                  size="sm"
                  onClick={() => handleTabChange("target-allocation")}
                  className="gap-2 text-xs font-semibold bg-primary text-white hover:bg-primary/90"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Configure & Submit Targets
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Target-Aligned Reporting Hierarchy & Daily Matrix Engine */}
              <CompanyProductionReportingHierarchyView
                assignmentId={assignmentId || ""}
                onOpenReportModal={({ reportDate: selDate, periodLabel: selLabel, targetPeriodId: selTargetId }) => {
                  setReportDate(selDate);
                  setSelectedPeriodLabel(selLabel || null);
                  setSelectedTargetPeriodId(selTargetId || null);
                  setIsReportModalOpen(true);
                }}
              />

              {/* Dedicated Report Submission Dialog Modal */}
              <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                      <Factory className="h-5 w-5 text-primary" />
                      Submit Production Actual ({assignment?.reportingFrequency?.name || "Periodic"} Schedule)
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Target Version v{approvedTarget?.version_number} Active | Selected Period: {selectedPeriodLabel || reportDate}
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleReportSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Report Date</Label>
                        <Input
                          type="date"
                          value={reportDate}
                          onChange={(e) => setReportDate(e.target.value)}
                          className="h-9 text-xs font-mono"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                          Actual Extracted Quantity ({unitSymbol})
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g. 85.5"
                            value={reportQuantity}
                            onChange={(e) => setReportQuantity(e.target.value)}
                            className="h-9 text-xs font-mono pr-14 font-semibold"
                            required
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-mono text-muted-foreground">
                            {unitSymbol}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Reporting Department (Optional)</Label>
                      <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Company HQ / Entire Concession" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Company HQ / Concession Root</SelectItem>
                          {structures.map((s) => (
                            <SelectItem key={s.company_structure_id} value={s.company_structure_id}>
                              {s.name} (Level {s.level})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Notes / Shift Details</Label>
                      <Textarea
                        placeholder="Log production batch, pit location, operational shift notes..."
                        value={reportNotes}
                        onChange={(e) => setReportNotes(e.target.value)}
                        className="text-xs h-20"
                      />
                    </div>

                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsReportModalOpen(false)}
                        className="text-xs h-8"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmittingReport || !reportQuantity}
                        className="text-xs h-8 gap-1.5 bg-primary text-white"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {isSubmittingReport ? "Submitting..." : "Submit Production Actual"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Submissions History Table */}
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/15 pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Submitted Production Reports History</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {(detailBundle?.recentReports || []).length} Records
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {(detailBundle?.recentReports || []).length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground italic">
                      No reports recorded yet under this production assignment.
                    </div>
                  ) : (
                    <div className="divide-y overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-4">Date</th>
                            <th className="py-2.5 px-4">Quantity</th>
                            <th className="py-2.5 px-4">Reporting Unit</th>
                            <th className="py-2.5 px-4">Department</th>
                            <th className="py-2.5 px-4">Submitted By</th>
                            <th className="py-2.5 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(detailBundle?.recentReports || []).map((r) => (
                            <tr key={r.report_id} className="hover:bg-muted/15 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium">{r.report_date}</td>
                              <td className="py-3 px-4 font-mono font-bold text-foreground">
                                {Number(r.quantity_reported).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 font-mono text-muted-foreground">
                                {r.reportedUnit?.name || unitName} ({r.reportedUnit?.symbol || unitSymbol})
                              </td>
                              <td className="py-3 px-4">{r.department?.name || "Company HQ"}</td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {r.submittedByUser?.full_name || "Company Officer"}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                  {r.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* =========================================================================
            TAB 4: ANALYTICS & TARGET COMPARISON
        ========================================================================= */}
        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsTabContent
            companyId={companyId || ""}
            productionItemId={assignment.production_item_id}
            targetDepth={targetDepth}
            unitSymbol={unitSymbol}
            approvedTarget={approvedTarget}
            reports={detailBundle?.recentReports || []}
          />
        </TabsContent>

        {/* =========================================================================
            TAB 5: ASSIGNMENTS / RESPONSIBILITIES
        ========================================================================= */}
        <TabsContent value="responsibilities" className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/15 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Reporting Responsibilities & Access Control
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Assign which company departments, staff members, or roles are authorized to submit production actuals for this concession.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="text-xs h-8 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Assign Responsible Party
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(detailBundle?.responsibilities || []).length === 0 ? (
                <div className="p-10 text-center text-muted-foreground space-y-2">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/40" />
                  <div className="text-sm font-semibold">No Specific Responsibilities Configured</div>
                  <p className="text-xs max-w-md mx-auto">
                    Currently, all authorized company administrators and officers can submit reports. You can restrict reporting to specific business units, users, or roles below.
                  </p>
                </div>
              ) : (
                <div className="divide-y overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4">Assigned Entity Type</th>
                        <th className="py-2.5 px-4">Designated Party</th>
                        <th className="py-2.5 px-4">Role / Department Info</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(detailBundle?.responsibilities || []).map((r) => {
                        const type = r.department ? "Department" : r.user ? "Specific User" : "Role";
                        const name = r.department?.name || r.user?.full_name || r.role?.name || "Assigned";
                        const details = r.department
                          ? `Hierarchy Level ${r.department.level}`
                          : r.user
                          ? r.user.email
                          : "Company Role Access";

                        return (
                          <tr key={r.assignment_responsibility_id} className="hover:bg-muted/15 transition-colors">
                            <td className="py-3 px-4 font-semibold text-foreground">{type}</td>
                            <td className="py-3 px-4 font-medium">{name}</td>
                            <td className="py-3 px-4 text-muted-foreground">{details}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                                ACTIVE
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveResponsibility(r.assignment_responsibility_id)}
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog to Add Responsibility */}
          <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Assign Reporting Responsibility
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Authorize a specific corporate department, staff user, or role to submit production actuals for this concession.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Responsibility Scope Type</Label>
                  <Select
                    value={assignType}
                    onValueChange={(val: any) => {
                      setAssignType(val);
                      setAssignTargetId("");
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="department">Internal Company Department</SelectItem>
                      <SelectItem value="user">Specific Corporate User</SelectItem>
                      <SelectItem value="role">Designated Role Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {assignType === "department" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Select Department</Label>
                    <Select value={assignTargetId} onValueChange={setAssignTargetId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select corporate department..." />
                      </SelectTrigger>
                      <SelectContent>
                        {structures.map((s) => (
                          <SelectItem key={s.company_structure_id} value={s.company_structure_id}>
                            {s.name} (Level {s.level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {assignType === "user" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Select User</Label>
                    <Select value={assignTargetId} onValueChange={setAssignTargetId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select user account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {companyUsers.map((u: any) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {assignType === "role" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Select Role</Label>
                    <Select value={assignTargetId} onValueChange={setAssignTargetId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select company role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {companyRoles.map((r: any) => (
                          <SelectItem key={r.role_id} value={r.role_id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Notes / Shift Instructions (Optional)</Label>
                  <Textarea
                    placeholder="Provide shift responsibilities, operational mine section..."
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    className="text-xs h-16"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!assignTargetId || isManagingResp}
                  onClick={handleSaveResponsibility}
                  className="text-xs"
                >
                  Save Responsibility
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Target Amendment Request Modal */}
      {isAmendmentModalOpen && assignment && detailBundle && (
        <CompanyTargetAmendmentModal
          isOpen={isAmendmentModalOpen}
          onClose={() => setIsAmendmentModalOpen(false)}
          assignmentId={assignmentId || ""}
          detailBundle={detailBundle}
          onSuccess={() => {
            setIsAmendmentModalOpen(false);
            refetchDetail();
          }}
        />
      )}

      {/* Target Amendment Comparison Modal */}
      {isComparisonModalOpen && detailBundle?.amendmentComparison && (
        <CompanyTargetAmendmentComparisonModal
          isOpen={isComparisonModalOpen}
          onClose={() => setIsComparisonModalOpen(false)}
          comparison={detailBundle.amendmentComparison}
        />
      )}
    </div>
  );
}

// Subcomponent for Analytics Tab
function AnalyticsTabContent({
  companyId,
  productionItemId,
  targetDepth,
  unitSymbol,
  approvedTarget,
  reports,
}: {
  companyId: string;
  productionItemId: string;
  targetDepth: string;
  unitSymbol: string;
  approvedTarget: CompanyProductionTarget | null | undefined;
  reports: any[];
}) {
  const [periodType, setPeriodType] = useState<string>("quarter");

  const { data: performance, isLoading } = useGetProductionPerformanceQuery(
    {
      company_id: companyId,
      production_item_id: productionItemId,
      period_type: periodType,
    },
    { skip: !companyId || !productionItemId }
  );

  if (isLoading) {
    return <Loading01 />;
  }

  const totalActual = performance?.actual_quantity ?? 0;
  const targetQty = performance?.target_quantity ?? (approvedTarget ? Number(approvedTarget.target_quantity) : 0);
  const achievementPct = performance?.achievement_percentage ?? (targetQty > 0 ? (totalActual / targetQty) * 100 : 0);
  const compliance = performance?.reporting_compliance;

  return (
    <div className="space-y-6">
      {/* Interval Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Production Performance & Achievement Analytics
          </h3>
          <p className="text-xs text-muted-foreground">
            Analysis is computed directly against the approved target version using the centrally configured allocation depth.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Aggregation Period:</span>
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly Interval</SelectItem>
              <SelectItem value="quarter">Quarterly Interval</SelectItem>
              <SelectItem value="half_year">Semi-Annual Interval</SelectItem>
              <SelectItem value="year">Full Annual Cycle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Approved Target
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-mono">
              {targetQty.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{unitSymbol}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Approved baseline</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-emerald-600 uppercase">
              Actual Extracted
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600 font-mono">
              {totalActual.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{unitSymbol}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Cumulative reports</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-indigo-600 uppercase">
              Target Achievement
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-indigo-600 font-mono">
              {achievementPct.toFixed(1)}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {achievementPct >= 100 ? "Goal Fulfilled" : `${(100 - achievementPct).toFixed(1)}% remaining`}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-blue-600 uppercase">
              Reporting Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-blue-600 font-mono">
              {compliance ? `${compliance.compliance_rate}%` : "100%"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {compliance ? `${compliance.submitted_reports} / ${compliance.expected_reports} expected` : "On schedule"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Progress Bar */}
      <Card className="border shadow-xs p-6 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span>Target Completion Progress</span>
          <span className="font-mono">{achievementPct.toFixed(2)}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              achievementPct >= 100 ? "bg-emerald-500" : "bg-primary"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, achievementPct))}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
