"use client";

import React, { useState } from "react";
import {
  useGetRegionalAssignedRequirementsQuery,
  useGetRegionNationalReportingConfigQuery,
} from "@/redux/api/nationalReportingApi";
import { NationalReportingAssignment } from "@/redux/types/nationalReporting";
import { RegionalMappingModal } from "./RegionalMappingModal";
import { RegionalConfirmationModal } from "./RegionalConfirmationModal";
import { RegionalPublicationModal } from "./RegionalPublicationModal";
import { RegionalDirectFormModal } from "./RegionalDirectFormModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Send,
  FileCheck,
  FolderTree,
  Scale,
  Sparkles,
  FileText,
  Clock,
  Info,
} from "lucide-react";

interface Props {
  regionId: string;
}

export function RegionalAssignedRequirementsTab({ regionId }: Props) {
  const { data: assignments = [], isLoading } =
    useGetRegionalAssignedRequirementsQuery({ regionId });

  const { data: regionConfig } = useGetRegionNationalReportingConfigQuery(
    regionId,
    { skip: !regionId }
  );

  const isFormReportingActive = Boolean(regionConfig?.is_form_reporting_effective);

  const [mappingAssignment, setMappingAssignment] =
    useState<NationalReportingAssignment | null>(null);
  const [confirmingAssignment, setConfirmingAssignment] =
    useState<NationalReportingAssignment | null>(null);
  const [publishingAssignment, setPublishingAssignment] =
    useState<NationalReportingAssignment | null>(null);
  const [directFormAssignment, setDirectFormAssignment] =
    useState<NationalReportingAssignment | null>(null);

  return (
    <div className="space-y-6">
      {/* Option B Active Indicator Banner */}
      {isFormReportingActive && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm mt-0.5">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Form-Based National Reporting (Option B) is Active
                </h3>
                <Badge className="bg-emerald-600 text-white text-[10px]">Active</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                National administrators have activated direct form reporting for this region. You can submit KPI targets and achievements directly via form, or use the standard regional plan-node mapping workflow.
              </p>
              {regionConfig?.form_reporting_end_date && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Effective until {regionConfig.form_reporting_end_date}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">National Requirement</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Required Unit</th>
                <th className="px-5 py-3.5">Mapped Regional Node</th>
                <th className="px-5 py-3.5">Workflow Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Loading assigned national reporting requirements...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    No national reporting requirements assigned to this regional state yet.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => {
                  const req = assignment.requirement;
                  const mapping = assignment.activeMapping;
                  const node = mapping?.planNode;
                  const status = assignment.workflowStatus || "unmapped";

                  return (
                    <tr
                      key={assignment.assignment_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {req?.title}
                        </div>
                        <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {req?.code} • {req?.frequency}
                        </div>
                        {assignment.is_mandatory && (
                          <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Mandatory Federal Indicator
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant="outline" className="text-xs capitalize">
                          {req?.category?.replace(/_/g, " ")}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {req?.expected_unit}{" "}
                        <span className="text-xs text-slate-400 font-sans">
                          ({req?.unit_category})
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {node ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                              {node.title}
                            </div>
                            <div className="text-xs font-mono text-slate-400">
                              Unit: {node.target_unit || mapping?.local_unit} • Status:{" "}
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                {node.period_actual_status || "empty"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Not mapped to any regional node
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {status === "published" ? (
                          <Badge className="bg-emerald-600 text-white flex items-center gap-1 w-fit text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Published
                          </Badge>
                        ) : status === "ready_to_publish" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5 w-fit text-xs animate-pulse">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                            Ready to Publish (Validated)
                          </Badge>
                        ) : status === "confirmed" ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-xs">
                            Confirmed (Stage B)
                          </Badge>
                        ) : status === "potential" ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 text-xs">
                            Potential (Stage A)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-dashed text-xs">
                            Unmapped
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Option B: Direct Form Submission Action (when activated) */}
                          {isFormReportingActive && (
                            <Button
                              size="sm"
                              onClick={() => setDirectFormAssignment(assignment)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 flex items-center gap-1 font-semibold shadow-sm"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {status === "published" ? "Update Form Report" : "Submit Form Report"}
                            </Button>
                          )}

                          {/* Option A: Regional Plan-Node Mapping Actions */}
                          {status === "unmapped" && !isFormReportingActive && (
                            <Button
                              size="sm"
                              onClick={() => setMappingAssignment(assignment)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                            >
                              <FolderTree className="h-3.5 w-3.5 mr-1" />
                              Map Node (Stage A)
                            </Button>
                          )}

                          {status === "unmapped" && isFormReportingActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMappingAssignment(assignment)}
                              className="text-xs h-8 text-slate-600"
                              title="Optionally map to a regional plan node"
                            >
                              <FolderTree className="h-3.5 w-3.5 mr-1" />
                              Map Node
                            </Button>
                          )}

                          {status === "potential" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMappingAssignment(assignment)}
                                className="text-xs h-8"
                              >
                                Edit Mapping
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setConfirmingAssignment(assignment)}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                              >
                                <CalendarCheck className="h-3.5 w-3.5 mr-1" />
                                Confirm Period (Stage B)
                              </Button>
                            </>
                          )}

                          {status === "confirmed" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMappingAssignment(assignment)}
                                className="text-xs h-8"
                              >
                                Change Node
                              </Button>
                              <span className="text-xs text-slate-400 italic mr-1">
                                Awaiting Regional Validation
                              </span>
                            </>
                          )}

                          {status === "ready_to_publish" && (
                            <Button
                              size="sm"
                              onClick={() => setPublishingAssignment(assignment)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs h-8 flex items-center gap-1 font-semibold"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Publish Validated Report
                            </Button>
                          )}

                          {status === "published" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPublishingAssignment(assignment)}
                              className="text-xs h-8 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                            >
                              <FileCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                              View Proof / Receipt
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {mappingAssignment && (
        <RegionalMappingModal
          isOpen={!!mappingAssignment}
          onClose={() => setMappingAssignment(null)}
          assignment={mappingAssignment}
          regionId={regionId}
        />
      )}

      {confirmingAssignment && (
        <RegionalConfirmationModal
          isOpen={!!confirmingAssignment}
          onClose={() => setConfirmingAssignment(null)}
          assignment={confirmingAssignment}
          regionId={regionId}
        />
      )}

      {publishingAssignment && (
        <RegionalPublicationModal
          isOpen={!!publishingAssignment}
          onClose={() => setPublishingAssignment(null)}
          assignment={publishingAssignment}
          regionId={regionId}
        />
      )}

      {directFormAssignment && (
        <RegionalDirectFormModal
          isOpen={!!directFormAssignment}
          onClose={() => setDirectFormAssignment(null)}
          assignment={directFormAssignment}
          regionId={regionId}
        />
      )}
    </div>
  );
}

