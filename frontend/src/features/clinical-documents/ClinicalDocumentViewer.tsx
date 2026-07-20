"use client";

import React, { useState } from "react";
import {
  useGetClinicalDocumentQuery,
  useSignClinicalDocumentMutation,
  useTransitionClinicalDocumentStatusMutation,
  type ClinicalDocumentRecord,
} from "@/redux/api/clinicalDocumentApi";
import { useGetDiagnosisGroupedFormQuery } from "@/redux/api/diagnosisFormApi";
import SignaturePad from "./components/SignaturePad";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { cn } from "@/lib/utils";

type ClinicalDocumentViewerProps = {
  documentId: string;
  onClose?: () => void;
  currentUser: { user_id: string; role?: string; full_name?: string; account_type?: string };
};

export default function ClinicalDocumentViewer({ documentId, onClose, currentUser }: ClinicalDocumentViewerProps) {
  const { data: docData, isLoading: isDocLoading, error: docError } = useGetClinicalDocumentQuery(documentId);
  const [signDoc, { isLoading: isSigning }] = useSignClinicalDocumentMutation();
  const [transitionDoc, { isLoading: isTransitioning }] = useTransitionClinicalDocumentStatusMutation();

  const [activeTab, setActiveTab] = useState<"content" | "signatures" | "history" | "actions">("content");
  const [signingRole, setSigningRole] = useState<"author" | "reviewer" | "approver" | null>(null);
  const [transitioningTo, setTransitioningTo] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState("");

  const currentDoc = docData?.current;
  const historyList = docData?.history || [];

  const { data: formConfig, isLoading: isConfigLoading } = useGetDiagnosisGroupedFormQuery(
    currentDoc?.form_config_id || "",
    { skip: !currentDoc?.form_config_id }
  );

  if (isDocLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
        <Loading01 />
        <span className="text-sm text-slate-500 mt-2">Loading clinical document...</span>
      </div>
    );
  }

  if (docError || !currentDoc) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg">
        <h4 className="font-bold">Failed to load document</h4>
        <p className="text-sm">Please verify document ID and user permissions.</p>
      </div>
    );
  }

  const handleApplySignature = async (value: string) => {
    if (!signingRole) return;
    try {
      await signDoc({
        documentId,
        body: {
          role: signingRole,
          signature_value: value,
        },
      }).unwrap();
      setSigningRole(null);
    } catch (e: any) {
      alert(e.data?.error || e.message || "Failed to submit signature");
    }
  };

  const handleTransition = async () => {
    if (!transitioningTo) return;
    try {
      await transitionDoc({
        documentId,
        body: {
          status: transitioningTo,
          assignee_id: assigneeId || undefined,
        },
      }).unwrap();
      setTransitioningTo(null);
      setAssigneeId("");
    } catch (e: any) {
      alert(e.data?.error || e.message || "Failed to transition status");
    }
  };

  const renderFieldValue = (val: any, fieldType: string) => {
    if (val === undefined || val === null || val === "") {
      return <span className="text-slate-400 italic">—</span>;
    }
    if (fieldType === "boolean") {
      return val ? (
        <span className="text-green-600 font-semibold text-xs bg-green-50 px-2 py-0.5 rounded-full">Yes</span>
      ) : (
        <span className="text-slate-500 font-semibold text-xs bg-slate-50 px-2 py-0.5 rounded-full">No</span>
      );
    }
    if (fieldType === "file" || fieldType === "canvas") {
      if (typeof val === "string" && (val.startsWith("http") || val.startsWith("data:") || val.includes("/attachments"))) {
        return (
          <div className="mt-1 border border-slate-200 dark:border-slate-800 rounded-lg p-2 max-w-md bg-slate-50 dark:bg-slate-950/40">
            <img src={val} className="max-h-[160px] object-contain rounded" alt="Visual Field Data" />
          </div>
        );
      }
    }
    if (Array.isArray(val)) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {val.map((item, idx) => (
            <li key={idx} className="text-slate-700 dark:text-slate-300">{String(item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof val === "object") {
      return (
        <pre className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded font-mono text-xs overflow-auto border border-slate-150 dark:border-slate-850">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">{String(val)}</span>;
  };

  const isFinalState = currentDoc.status === "final" || currentDoc.status === "finalized";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full min-h-[500px]">
      {/* Title Header */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{currentDoc.title}</h2>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize",
              currentDoc.status === "draft" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
              currentDoc.status === "in_progress" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              currentDoc.status === "submitted" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
              currentDoc.status === "reviewed" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
              currentDoc.status === "approved" && "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
              isFinalState && "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
            )}>
              {currentDoc.status}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Document ID: {currentDoc.document_id} · Version {currentDoc.version}
          </span>
        </div>

        <div className="flex gap-2">
          <a
            href={`/api/clinical-documents/${documentId}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all"
          >
            🖨️ Print
          </a>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20">
        <button
          onClick={() => setActiveTab("content")}
          className={cn(
            "px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === "content"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          📄 Form Content
        </button>
        <button
          onClick={() => setActiveTab("signatures")}
          className={cn(
            "px-6 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5",
            activeTab === "signatures"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          ✍️ Signatures
          {Object.keys(currentDoc.signatures).length > 0 && (
            <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
              {Object.keys(currentDoc.signatures).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === "history"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          🕒 History ({historyList.length})
        </button>
        {currentUser.account_type !== "PATIENT" && (
          <button
            onClick={() => setActiveTab("actions")}
            className={cn(
              "px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
              activeTab === "actions"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            ⚡ Actions
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 p-6 overflow-y-auto max-h-[500px]">
        {activeTab === "content" && (
          <div className="space-y-6">
            {formConfig && (formConfig.groups || formConfig.steps) ? (
              (formConfig.groups || formConfig.steps).map((section: any) => (
                <div key={section.group_id} className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                  <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-850">
                    <h3 className="font-bold text-slate-800 dark:text-slate-250 text-sm tracking-wide uppercase">
                      {section.title}
                    </h3>
                    {section.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-850 px-5">
                    {section.fields && section.fields.map((field: any) => {
                      const val = currentDoc.form_data[field.field_key];
                      return (
                        <div key={field.field_id} className="grid grid-cols-1 md:grid-cols-4 py-3.5 gap-2">
                          <span className="font-semibold text-slate-500 dark:text-slate-450 text-xs uppercase tracking-wider md:col-span-1 pt-0.5">
                            {field.label}
                          </span>
                          <div className="md:col-span-3 text-sm">
                            {renderFieldValue(val, field.field_type)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-5">
                <h4 className="font-bold text-slate-700 dark:text-slate-350 text-sm mb-3">
                  Raw Document Data
                </h4>
                <div className="divide-y divide-slate-150 dark:divide-slate-850">
                  {Object.entries(currentDoc.form_data).map(([key, val]) => (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-4 py-3 gap-2">
                      <span className="font-bold text-slate-500 text-xs uppercase tracking-wide md:col-span-1 pt-0.5">
                        {key}
                      </span>
                      <div className="md:col-span-3 text-sm">
                        {renderFieldValue(val, "text")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "signatures" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["author", "reviewer", "approver"] as const).map((role) => {
                const signature = currentDoc.signatures[role];
                return (
                  <div
                    key={role}
                    className={cn(
                      "border rounded-xl p-5 flex flex-col justify-between min-h-[180px] bg-slate-50/55 dark:bg-slate-950/20",
                      signature ? "border-slate-200 dark:border-slate-800" : "border-dashed border-slate-300 dark:border-slate-800"
                    )}
                  >
                    <div>
                      <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-850 pb-2.5 mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{role}</span>
                        {signature ? (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase">
                            Signed
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                            Pending
                          </span>
                        )}
                      </div>

                      {signature ? (
                        <div className="flex justify-center items-center h-16 mb-2">
                          {signature.signature_value.startsWith("data:") ? (
                            <img
                              src={signature.signature_value}
                              className="max-h-full max-w-full object-contain"
                              alt={`${role} signature`}
                            />
                          ) : (
                            <span className="font-serif italic text-2xl text-blue-700 dark:text-blue-400">
                              {signature.signature_value}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-16 text-xs text-slate-400 italic mb-2">
                          No signature recorded
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850">
                      {signature ? (
                        <div className="text-xs">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">{signature.full_name}</p>
                          <p className="text-slate-400 text-[10px]">
                            {new Date(signature.signed_at).toLocaleString("en-GB")}
                          </p>
                        </div>
                      ) : (
                        currentUser.account_type !== "PATIENT" && (
                          <button
                            onClick={() => setSigningRole(role)}
                            className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Sign as {role}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-slate-600 dark:text-slate-400">Document Version History</h4>
            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-6 py-2">
              {historyList.map((h, index) => (
                <div key={h.document_id} className="relative pl-6">
                  {/* Timeline dot */}
                  <span className={cn(
                    "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900",
                    h.document_id === currentDoc.document_id ? "bg-blue-600 scale-110" : "bg-slate-300"
                  )} />

                  <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-900 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          Version {h.version}
                        </h5>
                        <p className="text-xs text-slate-400">
                          Updated by {h.creator?.full_name} on {new Date(h.created_at).toLocaleString("en-GB")}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-800 text-[10px] font-bold rounded capitalize text-slate-600 dark:text-slate-400">
                        {h.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "actions" && (
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-100 dark:border-slate-900">
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4">Transition Lifecycle Status</h4>
              <div className="flex flex-wrap gap-2.5">
                {currentDoc.status === "draft" && (
                  <>
                    <button
                      onClick={() => setTransitioningTo("in_progress")}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
                    >
                      Move to In Progress
                    </button>
                    <button
                      onClick={() => setTransitioningTo("submitted")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Submit for Review
                    </button>
                  </>
                )}
                {currentDoc.status === "in_progress" && (
                  <>
                    <button
                      onClick={() => setTransitioningTo("draft")}
                      className="px-4 py-2 bg-slate-600 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
                    >
                      Revert to Draft
                    </button>
                    <button
                      onClick={() => setTransitioningTo("submitted")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Submit for Review
                    </button>
                  </>
                )}
                {currentDoc.status === "submitted" && (
                  <>
                    <button
                      onClick={() => setTransitioningTo("reviewed")}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors"
                    >
                      Mark as Reviewed
                    </button>
                    <button
                      onClick={() => setTransitioningTo("finalized")}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      Finalize Directly
                    </button>
                    <button
                      onClick={() => setTransitioningTo("draft")}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-705 transition-colors"
                    >
                      Reject to Draft
                    </button>
                  </>
                )}
                {currentDoc.status === "reviewed" && (
                  <>
                    <button
                      onClick={() => setTransitioningTo("approved")}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors"
                    >
                      Approve Document
                    </button>
                    <button
                      onClick={() => setTransitioningTo("finalized")}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      Approve & Finalize
                    </button>
                    <button
                      onClick={() => setTransitioningTo("draft")}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-705 transition-colors"
                    >
                      Reject to Draft
                    </button>
                  </>
                )}
                {currentDoc.status === "approved" && (
                  <>
                    <button
                      onClick={() => setTransitioningTo("finalized")}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      Finalize Document
                    </button>
                    <button
                      onClick={() => setTransitioningTo("draft")}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-705 transition-colors"
                    >
                      Reject to Draft
                    </button>
                  </>
                )}
                {isFinalState && (
                  <button
                    onClick={() => setTransitioningTo("archived")}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                  >
                    Archive Document
                  </button>
                )}
                {currentDoc.status === "archived" && (
                  <span className="text-xs text-slate-400 italic">This document is archived. No actions can be taken.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {signingRole && (
        <SignaturePad
          title={`Sign Clinical Document as ${signingRole.toUpperCase()}`}
          onSign={handleApplySignature}
          onCancel={() => setSigningRole(null)}
        />
      )}

      {/* Transition Modal */}
      {transitioningTo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Confirm status transition</h3>
            <p className="text-xs text-slate-500 mb-4">
              You are changing the document status from <strong className="text-slate-700 dark:text-slate-350">{currentDoc.status}</strong> to{" "}
              <strong className="text-blue-600">{transitioningTo}</strong>.
            </p>

            {(transitioningTo === "submitted" || transitioningTo === "reviewed") && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Assign to User ID (Optional Reviewer/Approver)
                </label>
                <input
                  type="text"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  placeholder="e.g. uuid of the assigned staff"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-transparent text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setTransitioningTo(null);
                  setAssigneeId("");
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleTransition}
                disabled={isTransitioning}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-55"
              >
                {isTransitioning ? "Transitioning..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
