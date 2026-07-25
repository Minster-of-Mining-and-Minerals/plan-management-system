import { baseApi } from "../baseApi";

export type ModalityType =
  | "XRAY"
  | "CT"
  | "MRI"
  | "ULTRASOUND"
  | "FLUOROSCOPY"
  | "MAMMOGRAPHY"
  | "ECG";

export type RadiologyWorkflowStatus =
  | "ORDERED"
  | "SCHEDULED"
  | "PATIENT_READY"
  | "IN_PROGRESS"
  | "IMAGE_ACQUIRED"
  | "REPORT_PENDING"
  | "VERIFICATION_PENDING"
  | "COMPLETED"
  | "CANCELLED";

export type ReportVerificationStatus = "PRELIMINARY" | "FINAL" | "AMENDED";
export type PatientReleaseStatus = "NOT_RELEASED" | "RELEASED" | "WITHHELD";
export type ReviewStatus = "PENDING" | "REVIEWED" | "ACKNOWLEDGED";
export type AlertSeverity = "CRITICAL" | "URGENT" | "SEVERE";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "CLOSED";

export type QueueType = "SCHEDULING" | "WAITING" | "IMAGING" | "REPORTING" | "VERIFICATION";
export type QueueStatus = "WAITING" | "CLAIMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type QueuePriority = "STAT" | "URGENT" | "ROUTINE";

export type RadiologyReportHistoryRecord = {
  id: string;
  report_id: string;
  previous_findings: string;
  previous_impression: string;
  previous_recommendations?: string | null;
  previous_status: ReportVerificationStatus;
  changed_by: string;
  change_reason: string;
  created_at: string;
  changedByUser?: { user_id: string; full_name: string };
};

export type RadiologyReport = {
  report_id: string;
  study_id: string;
  order_id: string;
  result_id?: string | null;
  template_id?: string | null;
  structured_sections?: any[] | null;
  findings: string;
  impression: string;
  recommendations?: string | null;
  verification_status: ReportVerificationStatus;
  patient_release_status?: PatientReleaseStatus;
  reported_by: string;
  verified_by?: string | null;
  signed_at?: string | null;
  created_at: string;
  reportedByUser?: { user_id: string; full_name: string };
  verifiedByUser?: { user_id: string; full_name: string };
  amendments?: RadiologyReportHistoryRecord[];
};

export type RadiologyImage = {
  id: string;
  study_id: string;
  patient_id: string;
  study_instance_uid: string;
  series_instance_uid?: string | null;
  sop_instance_uid?: string | null;
  modality: ModalityType;
  image_count: number;
  storage_type: string;
  storage_location: string;
  viewer_url?: string | null;
  viewer_type?: string;
  viewer_configuration?: any;
  external_viewer_url?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  uploader?: { user_id: string; full_name: string };
};

export type ViewerSession = {
  session_id: string;
  image_id: string;
  study_instance_uid: string;
  series_instance_uid?: string | null;
  viewer_type: string;
  external_viewer_url: string;
  viewer_configuration: any;
};

export type ReportTemplateSection = {
  id: string;
  template_id: string;
  section_name: string;
  display_order: number;
  required: boolean;
  default_text?: string | null;
};

export type ReportTemplate = {
  id: string;
  name: string;
  procedure_type?: string | null;
  modality: ModalityType;
  active: boolean;
  sections?: ReportTemplateSection[];
};

export type CriticalAlert = {
  id: string;
  study_id: string;
  created_by: string;
  severity: AlertSeverity;
  finding: string;
  recipient_doctor_id: string;
  status: AlertStatus;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  created_at: string;
  creator?: { user_id: string; full_name: string };
  recipientDoctor?: { user_id: string; full_name: string };
  acknowledgedByUser?: { user_id: string; full_name: string };
};

export type RadiologyResource = {
  id: string;
  name: string;
  resource_type: string;
  location?: string | null;
  active: boolean;
};

export type ResourceAvailability = {
  id: string;
  resource_id: string;
  available_from: string;
  available_to: string;
  maintenance_block: boolean;
  study_id?: string | null;
};

export type ExternalStudy = {
  id: string;
  patient_id: string;
  source_facility: string;
  study_date: string;
  modality: ModalityType;
  description: string;
  report_attachment?: string | null;
  image_reference?: string | null;
  uploaded_by: string;
  created_at: string;
  uploader?: { user_id: string; full_name: string };
};

export type RadiologyClinicalReview = {
  id: string;
  study_id: string;
  doctor_id: string;
  review_status: ReviewStatus;
  review_notes?: string | null;
  clinical_decision?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  doctor?: { user_id: string; full_name: string };
};

export type RadiologyProcedureCatalog = {
  procedure_catalog_id: string;
  code: string;
  name: string;
  description?: string | null;
  modality: ModalityType;
  body_region: string;
  contrast_required: boolean;
  estimated_duration_minutes: number;
  billing_service_id?: string | null;
  is_active: boolean;
  billingService?: { service_id: string; name: string; price: number };
};

export type RadiologyStudy = {
  study_id: string;
  order_id: string;
  appointment_id?: string | null;
  patient_id: string;
  procedure_catalog_id?: string | null;
  accession_number: string;
  modality: ModalityType;
  workflow_status: RadiologyWorkflowStatus;
  scheduled_at?: string | null;
  performed_at?: string | null;
  assigned_radiographer_id?: string | null;
  assigned_radiologist_id?: string | null;
  notes?: string | null;
  created_at: string;
  procedureCatalog?: RadiologyProcedureCatalog;
  patient?: { user_id: string; full_name: string };
  assignedRadiographer?: { user_id: string; full_name: string };
  assignedRadiologist?: { user_id: string; full_name: string };
  report?: RadiologyReport;
  images?: RadiologyImage[];
  reviews?: RadiologyClinicalReview[];
};

export type RadiologyWorkQueueItem = {
  id: string;
  study_id?: string | null;
  order_id: string;
  queue_type: QueueType;
  status: QueueStatus;
  priority: QueuePriority;
  assigned_staff_id?: string | null;
  department_id?: string | null;
  entered_at: string;
  claimed_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  order?: {
    order_id: string;
    title: string;
    priority: QueuePriority;
    patient?: { user_id: string; full_name: string };
    orderedByUser?: { user_id: string; full_name: string };
  };
  study?: RadiologyStudy;
  assignedStaff?: {
    user_id: string;
    full_name: string;
  };
};

export type RadiologyOverviewMetrics = {
  total_studies: number;
  completed_studies: number;
  pending_reports: number;
  avg_turnaround_hours: number;
  avg_waiting_minutes: number;
};

export type RadiologyModalityStats = Record<string, number>;

export type RadiologistPerformance = {
  user_id: string;
  full_name: string;
  reports_completed: number;
  verified_count: number;
  pending_count: number;
};

export type CreateProcedureCatalogPayload = {
  code: string;
  name: string;
  description?: string;
  modality: ModalityType;
  body_region: string;
  contrast_required?: boolean;
  estimated_duration_minutes?: number;
  billing_service_id?: string;
  is_active?: boolean;
};

export type CreateStudyPayload = {
  procedure_catalog_id?: string;
  modality?: ModalityType;
  notes?: string;
  scheduled_at?: string;
};

export type SubmitReportPayload = {
  findings: string;
  impression: string;
  recommendations?: string;
};

export type AmendReportPayload = {
  findings?: string;
  impression?: string;
  recommendations?: string;
  change_reason: string;
};

export type RegisterImagePayload = {
  study_id: string;
  study_instance_uid: string;
  series_instance_uid?: string;
  sop_instance_uid?: string;
  modality?: ModalityType;
  image_count?: number;
  storage_type?: string;
  storage_location: string;
  viewer_url?: string;
};

export const radiologyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listProcedures: builder.query<RadiologyProcedureCatalog[], string | void>({
      query: (modality) => ({
        url: "/radiology/procedures",
        params: modality ? { modality } : undefined,
      }),
      transformResponse: (r: { data: RadiologyProcedureCatalog[] }) => r.data,
      providesTags: [{ type: "Radiology", id: "PROCEDURES" }],
    }),

    createProcedure: builder.mutation<RadiologyProcedureCatalog, CreateProcedureCatalogPayload>({
      query: (payload) => ({
        url: "/radiology/procedures",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: RadiologyProcedureCatalog }) => r.data,
      invalidatesTags: [{ type: "Radiology", id: "PROCEDURES" }],
    }),

    listStudies: builder.query<RadiologyStudy[], { order_id?: string; patient_id?: string; workflow_status?: string } | void>({
      query: (params) => ({
        url: "/radiology/studies",
        params: params || undefined,
      }),
      transformResponse: (r: { data: RadiologyStudy[] }) => r.data,
      providesTags: [{ type: "Radiology", id: "STUDIES" }],
    }),

    getStudy: builder.query<RadiologyStudy, string>({
      query: (studyId) => `/radiology/studies/${studyId}`,
      transformResponse: (r: { data: RadiologyStudy }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "Radiology", id: `study-${id}` }],
    }),

    createStudy: builder.mutation<RadiologyStudy, { orderId: string; payload: CreateStudyPayload }>({
      query: ({ orderId, payload }) => ({
        url: `/radiology/orders/${orderId}/study`,
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: RadiologyStudy }) => r.data,
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "Radiology", id: "STUDIES" },
        { type: "Radiology", id: "WORKQUEUE" },
        { type: "ClinicalOrder", id: orderId },
      ],
    }),

    scheduleStudy: builder.mutation<RadiologyStudy, { studyId: string; scheduled_at: string }>({
      query: ({ studyId, scheduled_at }) => ({
        url: `/radiology/studies/${studyId}/schedule`,
        method: "PATCH",
        body: { scheduled_at },
      }),
      transformResponse: (r: { data: RadiologyStudy }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [
        { type: "Radiology", id: `study-${studyId}` },
        { type: "Radiology", id: "STUDIES" },
        { type: "Radiology", id: "WORKQUEUE" },
      ],
    }),

    startStudy: builder.mutation<RadiologyStudy, string>({
      query: (studyId) => ({
        url: `/radiology/studies/${studyId}/start`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: RadiologyStudy }) => r.data,
      invalidatesTags: (_r, _e, id) => [
        { type: "Radiology", id: `study-${id}` },
        { type: "Radiology", id: "STUDIES" },
        { type: "Radiology", id: "WORKQUEUE" },
      ],
    }),

    completeAcquisition: builder.mutation<RadiologyStudy, string>({
      query: (studyId) => ({
        url: `/radiology/studies/${studyId}/complete`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: RadiologyStudy }) => r.data,
      invalidatesTags: (_r, _e, id) => [
        { type: "Radiology", id: `study-${id}` },
        { type: "Radiology", id: "STUDIES" },
        { type: "Radiology", id: "WORKQUEUE" },
      ],
    }),

    submitReport: builder.mutation<RadiologyReport, { studyId: string; payload: SubmitReportPayload }>({
      query: ({ studyId, payload }) => ({
        url: `/radiology/studies/${studyId}/report`,
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: RadiologyReport }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [
        { type: "Radiology", id: `study-${studyId}` },
        { type: "Radiology", id: "STUDIES" },
        { type: "Radiology", id: "WORKQUEUE" },
      ],
    }),

    verifyReport: builder.mutation<RadiologyReport, { reportId: string; studyId: string }>({
      query: ({ reportId }) => ({
        url: `/radiology/reports/${reportId}/verify`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: RadiologyReport }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [
        { type: "Radiology", id: `study-${studyId}` },
        { type: "Radiology", id: "STUDIES" },
        { type: "Radiology", id: "WORKQUEUE" },
      ],
    }),

    amendReport: builder.mutation<RadiologyReport, { reportId: string; studyId: string; payload: AmendReportPayload }>({
      query: ({ reportId, payload }) => ({
        url: `/radiology/reports/${reportId}/amend`,
        method: "PATCH",
        body: payload,
      }),
      transformResponse: (r: { data: RadiologyReport }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [
        { type: "Radiology", id: `study-${studyId}` },
        { type: "Radiology", id: "STUDIES" },
      ],
    }),

    releaseReport: builder.mutation<RadiologyReport, { reportId: string; studyId: string }>({
      query: ({ reportId }) => ({
        url: `/radiology/reports/${reportId}/release`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: RadiologyReport }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [
        { type: "Radiology", id: `study-${studyId}` },
        { type: "Radiology", id: "STUDIES" },
      ],
    }),

    withholdReport: builder.mutation<RadiologyReport, { reportId: string; studyId: string; reason?: string }>({
      query: ({ reportId, reason }) => ({
        url: `/radiology/reports/${reportId}/withhold`,
        method: "PATCH",
        body: { reason },
      }),
      transformResponse: (r: { data: RadiologyReport }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [
        { type: "Radiology", id: `study-${studyId}` },
        { type: "Radiology", id: "STUDIES" },
      ],
    }),

    getStudyImages: builder.query<RadiologyImage[], string>({
      query: (studyId) => `/radiology/studies/${studyId}/images`,
      transformResponse: (r: { data: RadiologyImage[] }) => r.data,
      providesTags: (_r, _e, studyId) => [{ type: "Radiology", id: `images-${studyId}` }],
    }),

    registerImage: builder.mutation<RadiologyImage, RegisterImagePayload>({
      query: (payload) => ({
        url: "/radiology/images",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: RadiologyImage }) => r.data,
      invalidatesTags: (_r, _e, { study_id }) => [{ type: "Radiology", id: `images-${study_id}` }],
    }),

    generateViewerSession: builder.mutation<ViewerSession, string>({
      query: (imageId) => ({
        url: `/radiology/images/${imageId}/viewer-session`,
        method: "POST",
      }),
      transformResponse: (r: { data: ViewerSession }) => r.data,
    }),

    getTemplateForProcedure: builder.query<ReportTemplate | null, { procedure_type?: string; modality?: string } | void>({
      query: (params) => ({
        url: "/radiology/templates/match",
        params: params || undefined,
      }),
      transformResponse: (r: { data: ReportTemplate | null }) => r.data,
      providesTags: [{ type: "Radiology", id: "TEMPLATES" }],
    }),

    createTemplate: builder.mutation<ReportTemplate, any>({
      query: (payload) => ({
        url: "/radiology/templates",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: ReportTemplate }) => r.data,
      invalidatesTags: [{ type: "Radiology", id: "TEMPLATES" }],
    }),

    applyTemplateToReport: builder.mutation<RadiologyReport, { reportId: string; studyId: string; templateId: string; sectionData?: Record<string, string> }>({
      query: ({ reportId, templateId, sectionData }) => ({
        url: `/radiology/reports/${reportId}/template`,
        method: "PATCH",
        body: { templateId, sectionData },
      }),
      transformResponse: (r: { data: RadiologyReport }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [{ type: "Radiology", id: `study-${studyId}` }],
    }),

    createCriticalAlert: builder.mutation<CriticalAlert, { study_id: string; severity?: AlertSeverity; finding: string; recipient_doctor_id: string }>({
      query: (payload) => ({
        url: "/radiology/critical-alerts",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: CriticalAlert }) => r.data,
      invalidatesTags: (_r, _e, { study_id }) => [{ type: "Radiology", id: `alerts-${study_id}` }],
    }),

    acknowledgeCriticalAlert: builder.mutation<CriticalAlert, { alertId: string; studyId: string }>({
      query: ({ alertId }) => ({
        url: `/radiology/critical-alerts/${alertId}/acknowledge`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: CriticalAlert }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [{ type: "Radiology", id: `alerts-${studyId}` }],
    }),

    closeCriticalAlert: builder.mutation<CriticalAlert, { alertId: string; studyId: string }>({
      query: ({ alertId }) => ({
        url: `/radiology/critical-alerts/${alertId}/close`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: CriticalAlert }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [{ type: "Radiology", id: `alerts-${studyId}` }],
    }),

    getStudyAlerts: builder.query<CriticalAlert[], string>({
      query: (studyId) => `/radiology/studies/${studyId}/critical-alerts`,
      transformResponse: (r: { data: CriticalAlert[] }) => r.data,
      providesTags: (_r, _e, studyId) => [{ type: "Radiology", id: `alerts-${studyId}` }],
    }),

    listResources: builder.query<RadiologyResource[], void>({
      query: () => "/radiology/resources",
      transformResponse: (r: { data: RadiologyResource[] }) => r.data,
      providesTags: [{ type: "Radiology", id: "RESOURCES" }],
    }),

    reserveResource: builder.mutation<ResourceAvailability, { resourceId: string; study_id?: string; available_from: string; available_to: string }>({
      query: ({ resourceId, ...body }) => ({
        url: `/radiology/resources/${resourceId}/reserve`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: ResourceAvailability }) => r.data,
      invalidatesTags: [{ type: "Radiology", id: "RESOURCES" }],
    }),

    importExternalStudy: builder.mutation<ExternalStudy, { patient_id: string; source_facility: string; study_date: string; modality: ModalityType; description: string; report_attachment?: string; image_reference?: string }>({
      query: (payload) => ({
        url: "/radiology/external-studies",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: ExternalStudy }) => r.data,
      invalidatesTags: (_r, _e, { patient_id }) => [{ type: "Radiology", id: `ext-${patient_id}` }],
    }),

    listPatientExternalStudies: builder.query<ExternalStudy[], string>({
      query: (patientId) => `/radiology/patients/${patientId}/external-studies`,
      transformResponse: (r: { data: ExternalStudy[] }) => r.data,
      providesTags: (_r, _e, patientId) => [{ type: "Radiology", id: `ext-${patientId}` }],
    }),

    getStudyReviews: builder.query<RadiologyClinicalReview[], string>({
      query: (studyId) => `/radiology/studies/${studyId}/reviews`,
      transformResponse: (r: { data: RadiologyClinicalReview[] }) => r.data,
      providesTags: (_r, _e, studyId) => [{ type: "Radiology", id: `reviews-${studyId}` }],
    }),

    assignReview: builder.mutation<RadiologyClinicalReview, { studyId: string; doctor_id?: string }>({
      query: ({ studyId, doctor_id }) => ({
        url: `/radiology/studies/${studyId}/review/assign`,
        method: "POST",
        body: { doctor_id },
      }),
      transformResponse: (r: { data: RadiologyClinicalReview }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [{ type: "Radiology", id: `reviews-${studyId}` }],
    }),

    recordDecision: builder.mutation<RadiologyClinicalReview, { reviewId: string; studyId: string; clinical_decision: string; review_notes?: string }>({
      query: ({ reviewId, clinical_decision, review_notes }) => ({
        url: `/radiology/reviews/${reviewId}/decision`,
        method: "PATCH",
        body: { clinical_decision, review_notes },
      }),
      transformResponse: (r: { data: RadiologyClinicalReview }) => r.data,
      invalidatesTags: (_r, _e, { studyId }) => [{ type: "Radiology", id: `reviews-${studyId}` }],
    }),

    createBillingCharge: builder.mutation<{ success: boolean; entry: any }, string>({
      query: (studyId) => ({
        url: `/radiology/studies/${studyId}/billing/charge`,
        method: "POST",
      }),
      transformResponse: (r: { data: any }) => r.data,
      invalidatesTags: (_r, _e, studyId) => [{ type: "Radiology", id: `study-${studyId}` }],
    }),

    getOverviewAnalytics: builder.query<RadiologyOverviewMetrics, void>({
      query: () => "/radiology/analytics/overview",
      transformResponse: (r: { data: RadiologyOverviewMetrics }) => r.data,
      providesTags: [{ type: "Radiology", id: "ANALYTICS" }],
    }),

    getModalityAnalytics: builder.query<RadiologyModalityStats, void>({
      query: () => "/radiology/analytics/modality",
      transformResponse: (r: { data: RadiologyModalityStats }) => r.data,
      providesTags: [{ type: "Radiology", id: "ANALYTICS" }],
    }),

    getPerformanceAnalytics: builder.query<RadiologistPerformance[], void>({
      query: () => "/radiology/analytics/performance",
      transformResponse: (r: { data: RadiologistPerformance[] }) => r.data,
      providesTags: [{ type: "Radiology", id: "ANALYTICS" }],
    }),

    getWorkQueue: builder.query<RadiologyWorkQueueItem[], { queue_type?: QueueType; status?: QueueStatus } | void>({
      query: (params) => ({
        url: "/radiology/workqueue",
        params: params || undefined,
      }),
      transformResponse: (r: { data: RadiologyWorkQueueItem[] }) => r.data,
      providesTags: [{ type: "Radiology", id: "WORKQUEUE" }],
    }),

    getMyWorklist: builder.query<RadiologyWorkQueueItem[], void>({
      query: () => "/radiology/workqueue/my",
      transformResponse: (r: { data: RadiologyWorkQueueItem[] }) => r.data,
      providesTags: [{ type: "Radiology", id: "MY_WORKLIST" }],
    }),

    claimQueueItem: builder.mutation<RadiologyWorkQueueItem, string>({
      query: (id) => ({
        url: `/radiology/workqueue/${id}/claim`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: RadiologyWorkQueueItem }) => r.data,
      invalidatesTags: [
        { type: "Radiology", id: "WORKQUEUE" },
        { type: "Radiology", id: "MY_WORKLIST" },
      ],
    }),

    startQueueItem: builder.mutation<RadiologyWorkQueueItem, string>({
      query: (id) => ({
        url: `/radiology/workqueue/${id}/start`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: RadiologyWorkQueueItem }) => r.data,
      invalidatesTags: [
        { type: "Radiology", id: "WORKQUEUE" },
        { type: "Radiology", id: "MY_WORKLIST" },
      ],
    }),

    completeQueueItem: builder.mutation<RadiologyWorkQueueItem, string>({
      query: (id) => ({
        url: `/radiology/workqueue/${id}/complete`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: RadiologyWorkQueueItem }) => r.data,
      invalidatesTags: [
        { type: "Radiology", id: "WORKQUEUE" },
        { type: "Radiology", id: "MY_WORKLIST" },
      ],
    }),
  }),
});

export const {
  useListProceduresQuery,
  useCreateProcedureMutation,
  useListStudiesQuery,
  useGetStudyQuery,
  useCreateStudyMutation,
  useScheduleStudyMutation,
  useStartStudyMutation,
  useCompleteAcquisitionMutation,
  useSubmitReportMutation,
  useVerifyReportMutation,
  useAmendReportMutation,
  useReleaseReportMutation,
  useWithholdReportMutation,
  useGetStudyImagesQuery,
  useRegisterImageMutation,
  useGenerateViewerSessionMutation,
  useGetTemplateForProcedureQuery,
  useCreateTemplateMutation,
  useApplyTemplateToReportMutation,
  useCreateCriticalAlertMutation,
  useAcknowledgeCriticalAlertMutation,
  useCloseCriticalAlertMutation,
  useGetStudyAlertsQuery,
  useListResourcesQuery,
  useReserveResourceMutation,
  useImportExternalStudyMutation,
  useListPatientExternalStudiesQuery,
  useGetStudyReviewsQuery,
  useAssignReviewMutation,
  useRecordDecisionMutation,
  useCreateBillingChargeMutation,
  useGetOverviewAnalyticsQuery,
  useGetModalityAnalyticsQuery,
  useGetPerformanceAnalyticsQuery,
  useGetWorkQueueQuery,
  useGetMyWorklistQuery,
  useClaimQueueItemMutation,
  useStartQueueItemMutation,
  useCompleteQueueItemMutation,
} = radiologyApi;
