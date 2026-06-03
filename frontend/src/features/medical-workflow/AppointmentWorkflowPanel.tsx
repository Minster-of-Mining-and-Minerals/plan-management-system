"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { usePermissions } from "@/hooks/usePermissions";
import { WORKFLOW_PERMISSIONS } from "./workflowPermissions";
import {
  formDataHasPendingCanvasPreviews,
  sanitizeFormDataCanvasFields,
} from "@/components/canvas-annotation/canvasAnnotationUtils";

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
  const { can } = usePermissions();

  const [entryTitle, setEntryTitle] = useState("");
  const [entryTitleError, setEntryTitleError] = useState("");
  const [values, setValues] = useState<DynamicFormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [globalPanel, setGlobalPanel] = useState<GlobalPanel>(null);

  const formOptions = useMemo(
    () => data?.formOptions ?? (data?.formConfig && data?.form ? [{ config: data.formConfig, form: data.form }] : []),
    [data]
  );

  const [selectedFormConfigId, setSelectedFormConfigId] = useState("");

  useEffect(() => {
    if (!formOptions.length) {
      setSelectedFormConfigId("");
      return;
    }
    const stillValid = formOptions.some(
      (o) => o.config.config_id === selectedFormConfigId
    );
    if (!stillValid) {
      setSelectedFormConfigId(formOptions[0].config.config_id);
    }
  }, [formOptions, selectedFormConfigId]);

  const selectedOption = useMemo(
    () =>
      formOptions.find((o) => o.config.config_id === selectedFormConfigId) ??
      formOptions[0],
    [formOptions, selectedFormConfigId]
  );

  const grouped = selectedOption?.form ?? null;
  const workflowDone = data?.appointment?.workflow_status === "completed";
  const panelOpen = Boolean(globalPanel);
  const patientName = data?.appointment?.patient?.full_name;

  const resetForm = (option = selectedOption) => {
    setEntryTitle("");
    setEntryTitleError("");
    setValues(buildDefaultValues(option?.form ?? null));
    setErrors({});
  };

  const handleFormConfigChange = (configId: string) => {
    setSelectedFormConfigId(configId);
    const opt = formOptions.find((o) => o.config.config_id === configId);
    setValues(buildDefaultValues(opt?.form ?? null));
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

  const handleChange = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validateDynamic = (partial: boolean, formGrouped = grouped) => {
    const fields = formGrouped
      ? flattenFormFields(formGrouped).filter((f) => f.is_visible)
      : [];
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

  const canRunAction = (actionType: WorkflowActionType) => {
    switch (actionType) {
      case "forward":
        return can(WORKFLOW_PERMISSIONS.FORWARD);
      case "return":
        return can(WORKFLOW_PERMISSIONS.RETURN);
      case "prescribe":
        return can(WORKFLOW_PERMISSIONS.PRESCRIBE);
      case "complete":
        return can(WORKFLOW_PERMISSIONS.COMPLETE);
      case "submit":
      default:
        return can(WORKFLOW_PERMISSIONS.SUBMIT);
    }
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
    if (!canRunAction(actionType)) {
      toast.error("You do not have permission for this workflow action");
      return;
    }

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

    const activeGrouped = useForm ? grouped : null;
    const activeConfig = useForm
      ? selectedOption?.config ?? data?.formConfig ?? null
      : data?.formConfig ?? null;

    let formValues = options?.formData ?? (useForm ? values : {});

    if (useForm && activeGrouped) {
      if (formDataHasPendingCanvasPreviews(formValues, activeGrouped)) {
        toast.error(
          "Canvas preview is still uploading. Wait a moment, then save again."
        );
        return;
      }
      formValues = sanitizeFormDataCanvasFields(formValues, activeGrouped);
    }
    const header_title =
      options?.headerTitle ??
      (useForm && entryTitle.trim() ? entryTitle.trim() : null) ??
      deriveHeaderTitle(formValues, activeConfig);
    const attachment_ids = extractAttachmentIds(formValues, activeGrouped);
    const baseNotes = deriveNotes(formValues);
    const notes = [baseNotes, options?.extraNotes?.trim()].filter(Boolean).join("\n\n");

    try {
      await submitEntry({
        appointment_id: appointmentId,
        header_title,
        action_type: actionType,
        receiver_staff_id: options?.receiver_staff_id,
        form_data: formValues,
        form_config_id: useForm
          ? selectedFormConfigId || activeConfig?.config_id
          : activeConfig?.config_id,
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
            canAddWorkflow={
              !workflowDone &&
              !showWorkflowForm &&
              can(WORKFLOW_PERMISSIONS.SUBMIT) &&
              formOptions.length > 0
            }
            onAddWorkflow={() => {
              resetForm();
              setShowWorkflowForm(true);
            }}
          />

          {showWorkflowForm && !workflowDone && can(WORKFLOW_PERMISSIONS.SUBMIT) && (
            <WorkflowFormCard
              formOptions={formOptions}
              selectedFormConfigId={selectedFormConfigId}
              onFormConfigChange={handleFormConfigChange}
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
