import { baseApi } from "../baseApi";

export type CarePlan = {
  plan_id: string;
  patient_id: string;
  problem_id?: string | null;
  title: string;
  status: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  start_date?: string | null;
  target_end_date?: string | null;
  actual_end_date?: string | null;
  notes?: string | null;
  goals?: ClinicalGoal[];
  careTeam?: CareTeamMember[];
  created_at: string;
};

export type ClinicalGoal = {
  goal_id: string;
  plan_id: string;
  patient_id: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "ACHIEVED" | "NOT_ACHIEVED";
  target_value?: number | null;
  baseline_value?: number | null;
  current_value?: number | null;
  unit?: string | null;
  target_date?: string | null;
  created_at: string;
};

export type ClinicalIntervention = {
  intervention_id: string;
  plan_id: string;
  goal_id?: string | null;
  patient_id: string;
  intervention_type: "MEDICATION" | "INVESTIGATION" | "COUNSELING" | "DIET" | "FOLLOW_UP" | "OTHER";
  description: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  scheduled_date?: string | null;
  created_at: string;
};

export type CareTeamMember = {
  team_member_id: string;
  plan_id: string;
  clinician_id: string;
  role: string;
  responsibilities?: string | null;
  clinician?: { user_id: string; full_name: string };
  created_at: string;
};

export type ClinicalTask = {
  task_id: string;
  patient_id: string;
  plan_id?: string | null;
  alert_id?: string | null;
  title: string;
  description?: string | null;
  assigned_to: string;
  assigned_by: string;
  status: "OPEN" | "ACCEPTED" | "COMPLETED" | "OVERDUE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  due_date?: string | null;
  completed_at?: string | null;
  assignee?: { user_id: string; full_name: string };
  created_at: string;
};

export type PatientOutcome = {
  outcome_id: string;
  plan_id: string;
  goal_id?: string | null;
  patient_id: string;
  outcome_name: string;
  baseline_value?: number | null;
  target_value?: number | null;
  current_value?: number | null;
  unit?: string | null;
  progress_percentage?: number | null;
  status: "IMPROVING" | "STABLE" | "WORSENING" | "ACHIEVED";
  measured_at: string;
  notes?: string | null;
};

export const careManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Plans
    createCarePlan: builder.mutation<CarePlan, Partial<CarePlan> & { patient_id: string; title: string }>({
      query: (body) => ({ url: "/care-management/plans", method: "POST", body }),
      transformResponse: (r: { data: CarePlan }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),
    updateCarePlanStatus: builder.mutation<CarePlan, { planId: string; status: CarePlan["status"] }>({
      query: ({ planId, status }) => ({ url: `/care-management/plans/${planId}/status`, method: "PATCH", body: { status } }),
      transformResponse: (r: { data: CarePlan }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),
    getPatientPlans: builder.query<CarePlan[], string>({
      query: (patientId) => `/care-management/patients/${patientId}/plans`,
      transformResponse: (r: { data: CarePlan[] }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),
    getFullPlan: builder.query<CarePlan, string>({
      query: (planId) => `/care-management/plans/${planId}`,
      transformResponse: (r: { data: CarePlan }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),

    // Goals
    addGoal: builder.mutation<ClinicalGoal, Partial<ClinicalGoal> & { plan_id: string; patient_id: string; description: string }>({
      query: (body) => ({ url: "/care-management/goals", method: "POST", body }),
      transformResponse: (r: { data: ClinicalGoal }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),
    updateGoalProgress: builder.mutation<ClinicalGoal, { goalId: string; current_value: number }>({
      query: ({ goalId, current_value }) => ({ url: `/care-management/goals/${goalId}/progress`, method: "PATCH", body: { current_value } }),
      transformResponse: (r: { data: ClinicalGoal }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),
    listGoals: builder.query<ClinicalGoal[], string>({
      query: (planId) => `/care-management/plans/${planId}/goals`,
      transformResponse: (r: { data: ClinicalGoal[] }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),

    // Tasks
    createTask: builder.mutation<ClinicalTask, Partial<ClinicalTask> & { patient_id: string; title: string; assigned_to: string }>({
      query: (body) => ({ url: "/care-management/tasks", method: "POST", body }),
      transformResponse: (r: { data: ClinicalTask }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),
    acceptTask: builder.mutation<ClinicalTask, string>({
      query: (taskId) => ({ url: `/care-management/tasks/${taskId}/accept`, method: "POST" }),
      transformResponse: (r: { data: ClinicalTask }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),
    completeTask: builder.mutation<ClinicalTask, string>({
      query: (taskId) => ({ url: `/care-management/tasks/${taskId}/complete`, method: "POST" }),
      transformResponse: (r: { data: ClinicalTask }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),
    getPatientTasks: builder.query<ClinicalTask[], { patientId: string; status?: string }>({
      query: ({ patientId, status }) => `/care-management/patients/${patientId}/tasks${status ? `?status=${status}` : ""}`,
      transformResponse: (r: { data: ClinicalTask[] }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),

    // Outcomes
    recordOutcome: builder.mutation<PatientOutcome, Partial<PatientOutcome> & { plan_id: string; patient_id: string; outcome_name: string }>({
      query: (body) => ({ url: "/care-management/outcomes", method: "POST", body }),
      transformResponse: (r: { data: PatientOutcome }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),
    getPlanOutcomes: builder.query<PatientOutcome[], string>({
      query: (planId) => `/care-management/plans/${planId}/outcomes`,
      transformResponse: (r: { data: PatientOutcome[] }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),
  }),
});

export const {
  useCreateCarePlanMutation,
  useUpdateCarePlanStatusMutation,
  useGetPatientPlansQuery,
  useGetFullPlanQuery,
  useAddGoalMutation,
  useUpdateGoalProgressMutation,
  useListGoalsQuery,
  useCreateTaskMutation,
  useAcceptTaskMutation,
  useCompleteTaskMutation,
  useGetPatientTasksQuery,
  useRecordOutcomeMutation,
  useGetPlanOutcomesQuery,
} = careManagementApi;
