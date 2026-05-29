"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGetWorkflowContextQuery,
  useSubmitWorkflowEntryMutation,
  useGetWorkflowReceiversQuery,
  type WorkflowActionType,
} from "@/redux/api/medicalWorkflowApi";
import type {
  DynamicFormValues,
  UserFormConfigGrouped,
} from "@/redux/types/formField";
import { validateDynamicForm } from "@/lib/dynamicFormValidation";
import { flattenFormFields } from "@/redux/types/formField";
import { GlobalWorkflowActions } from "./components/GlobalWorkflowActions";
import { DiagnosisReportsCard } from "./components/DiagnosisReportsCard";
import { WorkflowFormCard } from "./components/WorkflowFormCard";
import { ForwardPreview } from "./panels/ForwardPreview";
import { PrescriptionPreview } from "./panels/PrescriptionPreview";
import { WorkflowHistoryLogPanel } from "./panels/WorkflowHistoryLogPanel";
import {
  deriveHeaderTitle,
  deriveNotes,
  extractAttachmentIds,
} from "./workflowFormUtils";
import { filterDiagnosisReportEntries } from "./workflowTimelineUtils";
import { useGetProfileQuery } from "@/redux/api/userApi";
import type { PrescriptionRecord } from "@/redux/types/prescription";
import { toast } from "sonner";

type GlobalPanel = "forward" | "prescribe" | "history" | null;

type Props = {
  appointmentId: string;
};

function buildDefaultValues(
  grouped?: UserFormConfigGrouped | null
): DynamicFormValues {
  const defaults: DynamicFormValues = {};
  if (!grouped) return defaults;
  for (const field of flattenFormFields(grouped)) {
    if (field.config?.default_value !== undefined) {
      defaults[field.field_key] = field.config.default_value;
    }
  }
  return defaults;
}

export function AppointmentWorkflowPanel({ appointmentId }: Props) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } =
    useGetWorkflowContextQuery(appointmentId);
  const { data: profile } = useGetProfileQuery();
  const { data: receivers = [] } = useGetWorkflowReceiversQuery();
  const [submitEntry, { isLoading: submitting }] =
    useSubmitWorkflowEntryMutation();

  const [entryTitle, setEntryTitle] = useState("");
  const [entryTitleError, setEntryTitleError] = useState("");
  const [values, setValues] = useState<DynamicFormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [globalPanel, setGlobalPanel] = useState<GlobalPanel>(null);

  const grouped = data?.form;
  const workflowDone = data?.appointment?.workflow_status === "completed";
  const panelOpen = Boolean(globalPanel);
  const patientName = data?.appointment?.patient?.full_name;

  const resetForm = () => {
    setEntryTitle("");
    setEntryTitleError("");
    setValues(buildDefaultValues(grouped));
    setErrors({});
  };

  const validateEntryTitle = () => {
    if (!entryTitle.trim()) {
      setEntryTitleError("Report title is required");
      toast.error(
        "Enter a title for this report (e.g. Lab Report, Dr. Sadin Diagnosis)"
      );
      return false;
    }
    setEntryTitleError("");
    return true;
  };

  const closePanels = () => setGlobalPanel(null);

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateDynamic = (partial: boolean) => {
    const fields = grouped ? flattenFormFields(grouped).filter((f) => f.is_visible) : [];
    if (!partial && fields.length) {
      const fieldErrors = validateDynamicForm(
        fields.filter((f) => f.is_required),
        values
      );
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        toast.error("Please complete required form fields");
        return false;
      }
    }
    return true;
  };

  const runAction = async (
    actionType: WorkflowActionType,
    options?: {
      receiver_staff_id?: string;
      partial?: boolean;
      extraNotes?: string;
      headerTitle?: string;
      useFormValues?: boolean;
      formData?: Record<string, unknown>;
    }
  ) => {
    const partial = options?.partial ?? actionType === "complete";
    const useForm = options?.useFormValues ?? showWorkflowForm;

    if (useForm && !validateDynamic(partial)) return;

    if (
      (actionType === "forward" || actionType === "return") &&
      !options?.receiver_staff_id
    ) {
      toast.error("Select a receiving staff member");
      return;
    }

    if (
      actionType === "forward" &&
      profile?.user_id &&
      options?.receiver_staff_id === profile.user_id
    ) {
      toast.error("You cannot forward a patient to yourself");
      return;
    }

    const formValues = options?.formData ?? (useForm ? values : {});
    const header_title =
      options?.headerTitle ??
      (useForm && entryTitle.trim() ? entryTitle.trim() : null) ??
      deriveHeaderTitle(formValues, data?.formConfig ?? null);
    const attachment_ids = extractAttachmentIds(formValues, grouped);
    const baseNotes = deriveNotes(formValues);
    const notes = [baseNotes, options?.extraNotes?.trim()].filter(Boolean).join("\n\n");

    try {
      await submitEntry({
        appointment_id: appointmentId,
        header_title,
        action_type: actionType,
        receiver_staff_id: options?.receiver_staff_id,
        form_data: formValues,
        form_config_id: data?.formConfig?.config_id,
        attachment_ids,
        notes: notes || undefined,
        partial,
      }).unwrap();

      const messages: Record<WorkflowActionType, string> = {
        submit: "Report saved",
        forward: "Patient forwarded successfully",
        return: "Patient forwarded successfully",
        prescribe: "Prescription recorded",
        complete: "Workflow marked complete",
      };
      toast.success(messages[actionType]);
      resetForm();
      setShowWorkflowForm(false);
      closePanels();
      refetch();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Action failed";
      toast.error(message);
    }
  };

  const handleSaveWorkflow = () => {
    if (!validateEntryTitle()) return;
    if (!validateDynamic(false)) return;
    runAction("submit", {
      partial: true,
      useFormValues: true,
      headerTitle: entryTitle.trim(),
    });
  };

  const handleGlobalComplete = () => {
    if (
      !window.confirm(
        "Mark this appointment workflow as complete? This cannot be undone from the UI."
      )
    ) {
      return;
    }
    runAction("complete", {
      partial: true,
      headerTitle: "Workflow completed",
      useFormValues: false,
    });
  };

  if (isLoading) return <Loading01 />;

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load workflow.
        </CardContent>
      </Card>
    );
  }

  const diagnosisEntries = filterDiagnosisReportEntries(data.timeline);

  return (
    <div className="space-y-6">
      <GlobalWorkflowActions
        disabled={workflowDone || submitting}
        historyOpen={globalPanel === "history"}
        onBack={() => router.push("/appointments")}
        onForward={() => setGlobalPanel("forward")}
        onPrescribe={() => setGlobalPanel("prescribe")}
        onComplete={handleGlobalComplete}
        onOpenHistory={() => setGlobalPanel("history")}
      />

      <div
        className={cn(
          "relative flex flex-col gap-4 lg:block",
          panelOpen && "lg:min-h-[50dvh]"
        )}
      >
        <div
          className={cn(
            "space-y-6 transition-all duration-500 ease-in-out",
            panelOpen && "lg:pr-[376px]"
          )}
        >
          <DiagnosisReportsCard
            entries={diagnosisEntries}
            pendingTask={Boolean(data.pendingTask)}
            workflowDone={workflowDone}
            canAddWorkflow={!workflowDone && !showWorkflowForm}
            onAddWorkflow={() => {
              resetForm();
              setShowWorkflowForm(true);
            }}
          />

          {showWorkflowForm && !workflowDone && (
            <WorkflowFormCard
              formConfig={data.formConfig}
              grouped={grouped}
              entryTitle={entryTitle}
              entryTitleError={entryTitleError}
              values={values}
              errors={errors}
              disabled={submitting}
              saving={submitting}
              onEntryTitleChange={(v) => {
                setEntryTitle(v);
                if (entryTitleError) setEntryTitleError("");
              }}
              onChange={handleChange}
              onSave={handleSaveWorkflow}
              onCancel={() => {
                setShowWorkflowForm(false);
                resetForm();
              }}
            />
          )}
        </div>

        <AnimatePresence>
          {globalPanel === "forward" && (
            <ForwardPreview
              receivers={receivers}
              currentUserId={profile?.user_id}
              fromStaffName={profile?.full_name || data.appointment.staff?.full_name}
              onClose={closePanels}
              isSubmitting={submitting}
              onConfirm={(receiverId, forwardNote) =>
                runAction("forward", {
                  receiver_staff_id: receiverId,
                  extraNotes: forwardNote,
                  headerTitle: "Forwarded",
                  partial: true,
                  useFormValues: false,
                })
              }
            />
          )}
          {globalPanel === "prescribe" && data.appointment?.patient_id && (
            <PrescriptionPreview
              appointmentId={appointmentId}
              patientId={data.appointment.patient_id}
              patientName={patientName}
              onClose={closePanels}
              isSubmitting={submitting}
              onConfirm={(prescription: PrescriptionRecord) =>
                runAction("prescribe", {
                  partial: true,
                  headerTitle: prescription.header_title || "Prescription",
                  useFormValues: false,
                  extraNotes: prescription.notes || undefined,
                  formData: {
                    prescription_id: prescription.prescription_id,
                    template_name: prescription.template?.name,
                    category_name: prescription.category?.name,
                    items_summary: prescription.items
                      ?.map((i) => i.item_name)
                      .filter(Boolean)
                      .join(", "),
                  },
                })
              }
            />
          )}
          {globalPanel === "history" && (
            <WorkflowHistoryLogPanel
              entries={data.timeline}
              onClose={closePanels}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
