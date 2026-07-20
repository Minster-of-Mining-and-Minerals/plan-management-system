"use client";

import React, { useState } from "react";
import { useListClinicalDocumentsQuery } from "@/redux/api/clinicalDocumentApi";
import ClinicalDocumentViewer from "./ClinicalDocumentViewer";
import { cn } from "@/lib/utils";
import Loading01 from "@/features/template/component/Loading/Loading01";

type ClinicalDocumentWorkspaceProps = {
  patientId: string;
  appointmentId?: string;
  currentUser: { user_id: string; role?: string; full_name?: string; account_type?: string };
  onCreateNew?: () => void;
};

export default function ClinicalDocumentWorkspace({
  patientId,
  appointmentId,
  currentUser,
  onCreateNew,
}: ClinicalDocumentWorkspaceProps) {
  const [filters, setFilters] = useState({
    status: "",
    keyword: "",
  });
  
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Debounce the keyword filter slightly
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(filters.keyword), 300);
    return () => clearTimeout(timer);
  }, [filters.keyword]);

  const { data: documents, isLoading, isError } = useListClinicalDocumentsQuery({
    patient_id: patientId,
    appointment_id: appointmentId || undefined,
    status: filters.status || undefined,
    keyword: debouncedKeyword || undefined,
  });

  if (selectedDocumentId) {
    return (
      <div className="h-full">
        <ClinicalDocumentViewer
          documentId={selectedDocumentId}
          currentUser={currentUser}
          onClose={() => setSelectedDocumentId(null)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-full min-h-[500px]">
      {/* Header & Filters */}
      <div className="p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Clinical Documents</h2>
            <p className="text-xs text-slate-500">Manage SOAP notes, progress notes, and other clinical records.</p>
          </div>
          {onCreateNew && currentUser.account_type !== "PATIENT" && (
            <button
              onClick={onCreateNew}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              + New Document
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search documents..."
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            className="flex-1 min-w-[200px] px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-200"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="finalized">Finalized</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading01 />
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
            <p className="font-semibold text-sm">Failed to load documents.</p>
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.document_id}
                onClick={() => setSelectedDocumentId(doc.document_id)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {doc.title}
                  </h3>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                      doc.status === "draft" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                      doc.status === "in_progress" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      doc.status === "submitted" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      doc.status === "reviewed" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                      doc.status === "approved" && "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
                      (doc.status === "final" || doc.status === "finalized") && "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
                      doc.status === "archived" && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    )}
                  >
                    {doc.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Author</span>
                    <span className="text-slate-700 dark:text-slate-300 truncate block">
                      {doc.creator?.full_name || "Unknown"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Type</span>
                    <span className="text-slate-700 dark:text-slate-300 truncate block">
                      {doc.document_type}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Version</span>
                    <span className="text-slate-700 dark:text-slate-300 truncate block">
                      v{doc.version}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Date</span>
                    <span className="text-slate-700 dark:text-slate-300 truncate block">
                      {new Date(doc.created_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-4xl mb-3">📄</div>
            <h4 className="text-slate-700 dark:text-slate-200 font-bold mb-1">No clinical documents found</h4>
            <p className="text-xs text-slate-500">
              {filters.keyword || filters.status ? "Try adjusting your search filters." : "Create a new document to get started."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
