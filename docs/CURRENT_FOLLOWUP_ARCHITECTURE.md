# Current Follow-up Architecture Analysis

**Date**: 2026-07-22  
**Author**: Lead Clinical Architect  
**Scope**: Complete trace of Follow-up in the NovaCure EMR system as it exists today  
**Methodology**: Full codebase inspection (backend + frontend + docs + models + services + controllers + routes + migrations + seeders)

---

## 1. Current Follow-up Architecture

### 1.1 Does Follow-up exist as a feature?

**NO.** Follow-up does **not** exist as an operational feature in NovaCure EMR.  

Follow-up exists **only as form fields** inside the Ophthalmology clinical examination template (`ophthalmologyDiagnosisPreset.js`). These fields capture follow-up intent as **static clinical data**, but no system logic reads, processes, schedules, or acts upon this data.

### 1.2 Where Follow-up appears

| Location | Type | Purpose |
|----------|------|---------|
| `backend/config/ophthalmologyDiagnosisPreset.js` | Form field config | Defines follow-up input fields in the Treatment Plan section |
| `backend/config/ophthalmologyDiagnosisPreset.js` | Form field config | Defines `follow_up_required` toggle in the Intake section |
| `backend/config/ophthalmologyDiagnosisPreset.js` | Form field config | Defines "Follow-up" as a `visit_type` option |
| `backend/seeders/20260706000002-seed-ophthalmology-demo-appointment.js` | Demo seed data | Seeds an appointment with `appointment_type: "Ophthalmology follow-up"` |
| `backend/seeders/20260602000003-seed-sample-patients.js` | Demo seed data | Mentions "Routine follow-up every 6 months" in medical_history_notes |
| `frontend/src/features/public/config/pagesContent.ts` | Marketing copy | Mentions "automated follow-ups" as a feature description |
| `frontend/src/features/public/config/modules.ts` | Marketing copy | Mentions "follow-up" in EMR module description |
| `frontend/src/features/medical-certificate/certificateDocumentUtils.ts` | Certificate template | Hardcoded text "Rest and follow-up" in a medical certificate |

### 1.3 Where Follow-up does NOT exist

| Required Component | Exists? | Details |
|-------------------|---------|---------|
| Dedicated Follow-up database table | **NO** | No `FollowUp` model or table |
| Follow-up service (`followUpService.js`) | **NO** | No service to process follow-up data |
| Follow-up controller | **NO** | No API endpoints for follow-up operations |
| Follow-up routes | **NO** | No routes registered for follow-up |
| Follow-up frontend page | **NO** | No follow-up UI anywhere |
| Follow-up Redux/api slice | **NO** | No API queries/mutations for follow-up |
| Follow-up scheduling engine | **NO** | No automatic appointment creation from follow-up data |
| Follow-up reminders/notifications | **NO** | No notification triggers for due follow-ups |
| Follow-up status tracking | **NO** | No way to track pending/completed/missed/cancelled follow-ups |

---

## 2. Current User Journey

### 2.1 When a clinician decides the patient needs follow-up (TODAY)

**The clinician has no dedicated "Schedule Follow-up" action.**

The current workflow is:

```
1. Doctor completes clinical examination
   ↓
2. Doctor fills form fields (including follow_up_plan, follow_up_days if using Ophthalmology template)
   ↓
3. Doctor clicks either:
   a. Save (submit clinical report) → data stored in MedicalHistoryLog.form_data JSONB
   b. Forward to another clinician → creates WorkflowTask
   c. Prescribe → logs prescription
   d. Complete workflow → encounter ends
   ↓
4. If the patient needs to return:
   → Doctor tells patient verbally or gives paper note
   → Patient must call reception or use patient portal to book a NEW appointment
   → NO system link exists between the current encounter and the future appointment
```

### 2.2 How the patient returns (TODAY)

The patient returns through the **exact same new patient flow**:

```
Patient decides to return (or calls reception)
  →
Reception searches for existing patient
  →
Reception books NEW PatientSchedule (date/time/clinician)
  →
On visit day, schedule is admitted → new StaffAppointment created
  →
Clinician sees "My Appointments" list
  →
Clinical workflow repeats for this new visit
```

**There is NO continuity between the old encounter and the new one.** The new appointment has:
- No reference to the previous encounter
- No follow-up context
- No prior treatment plan visible by default
- No flag indicating this is a follow-up visit
- No workflow automation based on the prior encounter's recommendations

### 2.3 Workflow Completion (TODAY)

```
Clinician clicks "Complete workflow"
  →
EncounterCompletionService.validateCompletion()
  → Checks: pending tasks? pending lab? unfulfilled prescriptions? diagnosis? unpaid balance?
  → Evaluates ENCOUNTER_COMPLETE clinical rules
  → Returns blocking issues (CRITICAL) and warnings
  ↓
If blocked → must resolve issues or provide override reason
  ↓
If ready → encounter marked: workflow_status = "completed", workflow_completed_at = now
  → Pending WorkflowTasks cancelled
  → NO follow-up scheduling step
  → NO follow-up validation
  → Encounter simply ends
```

### 2.4 Patient Portal Dashboard (TODAY)

```
PatientPortalService.getDashboard()
  → Returns next_appointment from upcoming PatientSchedule rows
  → Returns upcoming_count, active_prescriptions_count
  → NO follow-up-specific data
  → Shows only what the patient has booked, not what was recommended
```

---

## 3. Current Database Relationships

### 3.1 Database Tables (no Follow-up table exists)

All tables examined:

| Table | Has follow-up fields? | Details |
|-------|----------------------|---------|
| `patient_schedules` | No | `appointment_type` (free text STRING(128)) — could store "follow-up" but no validation |
| `staff_appointments` | No | No follow-up columns. `workflow_status` tracks active/completed only |
| `medical_history_logs` | JSONB only | Follow-up data buried in `form_data` (unindexed, unqueryable) |
| `workflow_tasks` | No | Only appointment forwarding, not follow-up scheduling |
| `timeline_events` | No | Event types: PATIENT_REGISTERED, APPOINTMENT_CREATED, CONSULTATION, etc. — no FOLLOWUP event type |
| `notifications` | No | Categories: system, logs, appointments, workflow, finance — no follow-up category |
| `patient_profiles` | No | No `next_follow_up` column |
| `users` | No | No follow-up tracking |
| `diagnosis_form_configs` | No | Defines form templates only |

### 3.2 StaffAppointment Model (key entity)

```
StaffAppointment
  ├── appointment_id (UUID PK)
  ├── schedule_id (FK → PatientSchedule)
  ├── patient_id (FK → User)
  ├── assigned_staff_id (FK → User)
  ├── admitted_by (FK → User)
  ├── admitted_at (DATE)
  ├── status (STRING: "admitted", "completed", "cancelled")
  ├── notes (TEXT)
  ├── workflow_status (STRING: "active", "completed")
  └── workflow_completed_at (DATE, nullable)
```

**Missing for follow-up:**
- `follow_up_required` boolean
- `follow_up_date` / `follow_up_time`
- `follow_up_status` (pending, scheduled, completed, missed, cancelled)
- `parent_appointment_id` (link to prior encounter)
- `related_encounter_id`
- `follow_up_reason` / `follow_up_instructions`

### 3.3 PatientSchedule Model

```
PatientSchedule
  ├── schedule_id (UUID PK)
  ├── patient_id (FK → User)
  ├── assigned_staff_id (FK → User)
  ├── schedule_date (DATEONLY)
  ├── start_time (STRING)
  ├── end_time (STRING)
  ├── status (STRING: scheduled, pending, updated, rescheduled, completed, cancelled, admitted)
  ├── appointment_type (STRING(128) — FREE TEXT, no controlled vocabulary)
  └── notes (TEXT)
```

**Missing for follow-up:**
- No `schedule_type` (new patient / follow-up / referral / walk-in)
- No `source_encounter_id` (reference to the appointment that recommended this schedule)
- No `is_follow_up` boolean
- No `compliance_tracking`

### 3.4 MedicalHistoryLog Model (where follow-up data actually lives)

```
MedicalHistoryLog
  ├── log_id (UUID PK)
  ├── patient_id (FK → User)
  ├── appointment_id (FK → StaffAppointment)
  ├── sender_staff_id (FK → User)
  ├── receiver_staff_id (FK → User, nullable)
  ├── action_type (STRING: submit, forward, return, prescribe, complete)
  ├── header_title (STRING)
  ├── form_config_id (UUID, nullable)
  ├── form_data (JSONB) ← Follow-up data stored here, UNPROCESSED
  ├── attachment_ids (JSONB)
  ├── notes (TEXT)
  ├── status (STRING)
  ├── parent_log_id (UUID, nullable)
  ├── task_type (STRING, default: "CONSULTATION")
  └── resource_type / resource_id (nullable)
```

The JSONB `form_data` may contain (from Ophthalmology template):
```json
{
  "oph_follow_up_required": true,
  "oph_follow_up_plan": "Return in 3 months for diabetic screening",
  "oph_follow_up_days": 90,
  "oph_follow_up_date": "2026-10-22",
  "oph_follow_up_time": "09:00"
}
```

**This data is NEVER read by any system process.**

---

## 4. Current APIs

### 4.1 All Workflow APIs (no follow-up endpoints exist)

| Method | Route | Purpose | Follow-up? |
|--------|-------|---------|-----------|
| GET | `/api/workflow/context/:appointmentId` | Get workflow context | NO |
| POST | `/api/workflow/entry` | Submit workflow entry | NO |
| GET | `/api/workflow/timeline` | List timeline | NO |
| GET | `/api/workflow/inbox` | List forwarded tasks | NO |
| GET | `/api/workflow/receivers` | List eligible receivers | NO |
| POST | `/api/workflow/validate-completion/:appointmentId` | Validate completion | NO |
| POST | `/api/workflow/execute-completion/:appointmentId` | Execute completion | NO |

### 4.2 Scheduling APIs

| Method | Route | Purpose | Follow-up? |
|--------|-------|---------|-----------|
| POST | `/api/schedules` | Create schedule | NO |
| PATCH | `/api/schedules/:id` | Update schedule status | NO |
| GET | `/api/schedules` | List schedules | NO |

### 4.3 Patient Portal APIs

| Method | Route | Purpose | Follow-up? |
|--------|-------|---------|-----------|
| GET | `/api/patient-portal/dashboard` | Patient dashboard | Shows next_appointment only |
| POST | `/api/patient-portal/schedules` | Patient self-booking | NO follow-up context |

**No API endpoint exists to:**
- Create a follow-up appointment linked to a prior encounter
- List pending/overdue follow-ups
- Mark a follow-up as completed
- Cancel a follow-up
- Get follow-up recommendations for a patient

---

## 5. Current UI Flow

### 5.1 Frontend Routes (no follow-up page exists)

| Route | Component | Purpose | Follow-up? |
|-------|-----------|---------|-----------|
| `/appointments` | `StaffAppointmentsTable` | My assigned visits | NO |
| `/appointments/[id]` | `AppointmentWorkflowPanel` | Clinical workflow | NO (see below) |
| `/workflow-inbox` | `WorkflowInboxTable` | Forwarded patients | NO |
| `/patients/list` | Patient registry | Patient management | NO |
| `/patient/appointments` | Portal booking | Patient self-scheduling | NO |
| `/finance/cashier` | Cashier desk | Payment collection | NO |

### 5.2 AppointmentWorkflowPanel (the main clinical workspace)

**Available actions in GlobalWorkflowActions:**
1. **Back to appointments** — navigates back
2. **Forward to staff** — creates WorkflowTask
3. **Prescription** — creates Prescription
4. **Complete workflow** — ends encounter
5. **Open history** — view timeline

**NO "Schedule Follow-up" button exists.**

**NO visual indicator** for:
- Follow-up recommendation from this encounter
- Pending follow-ups for this patient
- Previous follow-up history
- Overdue follow-ups

### 5.3 StaffAppointmentsTable (visits list)

**Columns:** Patient ID, Patient name, Scheduled time, Admitted at, Visit status, Billing, Workflow, Created, Actions

**NO column for:**
- Follow-up required
- Follow-up date
- Visit type (new/follow-up/referral)
- Source encounter

### 5.4 WorkflowInboxTable (forwards)

**Columns:** Patient ID, Patient name, Subject, From, Visit, Forwarded at, Status, Actions

**NO follow-up context.** Only shows forwarded tasks, not follow-up reminders.

---

## 6. Existing Strengths

1. **Form infrastructure exists**: The Ophthalmology template proves the system CAN capture follow-up data (`follow_up_required`, `follow_up_plan`, `follow_up_days`, `follow_up_date`, `follow_up_time`) as dynamic diagnosis form fields. This is reusable.

2. **Encounter completion engine is robust**: `EncounterCompletionService` with `validateCompletion()` and `executeCompletion()` provides a strong validation framework that could be extended with follow-up rules.

3. **Clinical rule engine exists**: `ClinicalRuleEngineService` with `evaluateRules()` supports pluggable rules at trigger points. ENCOUNTER_COMPLETE trigger exists. Adding a FOLLOWUP_DUE trigger is architecturally possible.

4. **Scheduling infrastructure is solid**: `PatientScheduleService` with slot generation, overlap checking, horizon validation, and admission flow provides a complete scheduling foundation.

5. **Notification service exists**: `notificationService.notifyInternalUser()` supports real-time notifications via Socket.IO.

6. **Timeline events exist**: `TimelineEventService` already tracks patient history. Follow-up events could be added as a new event type.

7. **Workflow task system exists**: `WorkflowTask` model with pending/done/cancelled statuses could be repurposed for follow-up task tracking.

8. **Patient portal exists**: `/patient/appointments` for self-booking and `getDashboard()` for viewing upcoming appointments — could be extended with follow-up awareness.

9. **Audit logging exists**: `logAudit()` in `auditService` captures all clinical actions. Follow-up actions could be audited.

10. **Permission system is mature**: `userHasPermission()` with resource/action granularity supports role-based access control.

---

## 7. Existing Weaknesses

1. **Follow-up data is dead data**: The `follow_up_*` fields in the Ophthalmology form are stored in `JSONB` and NEVER read by any service. They are documentation artifacts only.

2. **No linked encounters**: There is no `parent_appointment_id` or `related_encounter_id` on any model. Each encounter is an island. There is no way to know if an appointment is a follow-up of a previous one.

3. **No visit type classification**: `PatientSchedule.appointment_type` is free text (STRING 128). Reception cannot distinguish new patient vs follow-up vs referral vs walk-in programmatically.

4. **Workflow completion has no follow-up step**: The `executeCompletion()` method does not prompt, require, or even suggest creating a follow-up. Encounters end with zero follow-up automation.

5. **No follow-up status tracking**: No system can answer: "How many patients need follow-up?" "Which follow-ups are overdue?" "Who missed their follow-up?"

6. **No follow-up reminders**: No notification triggers exist for upcoming or overdue follow-ups. Patients receive no automated reminders.

7. **No follow-up compliance metrics**: The system cannot track follow-up adherence rates, missed follow-up rates, or follow-up completion statistics.

8. **Appointment self-booking is disconnected**: When a patient books through the portal, the system has no way to enforce or suggest a follow-up time based on clinical recommendations.

9. **No follow-up visibility in dashboards**: The Doctor Dashboard, Reception Dashboard, and Admin Dashboard show no follow-up queues, alerts, or summaries.

10. **No multi-appointment support**: The system cannot manage multiple follow-ups for the same patient (e.g., weekly physio sessions x 6, monthly checkups x 3 months).

---

## 8. Missing Features (Complete Gap Analysis)

| Feature | Current State | Gap |
|---------|--------------|-----|
| **Dedicated Follow-up entity** | Does not exist | No table, model, or type |
| **Schedule follow-up action** | Does not exist | No button in workflow panel |
| **Follow-up API endpoints** | Does not exist | CRUD for follow-ups |
| **Follow-up frontend page** | Does not exist | No UI for listing/managing follow-ups |
| **Linked encounters** | Does not exist | No encounter-to-encounter relationship |
| **Visit type classification** | Free text only | No controlled vocabulary for visit types |
| **Follow-up status** | Does not exist | No pending/scheduled/completed/missed status |
| **Follow-up rules in clinical engine** | Does not exist | No FOLLOWUP_DUE trigger |
| **Follow-up reminders** | Does not exist | No automated notifications |
| **Follow-up compliance reporting** | Does not exist | No analytics |
| **Bulk follow-up scheduling** | Does not exist | No series support |
| **Reception follow-up queue** | Does not exist | No way for reception to see follow-ups |
| **Doctor dashboard follow-up widget** | Does not exist | No follow-up overview for clinicians |
| **Patient portal follow-up visibility** | Does not exist | Patient cannot see recommended follow-ups |

---

## 9. Technical Debt

1. **`form_data` as unstructured JSONB**: Follow-up data is embedded in `MedicalHistoryLog.form_data` as opaque JSON. There is no index on follow-up fields. Querying "all patients needing follow-up" would require a full table scan and JSON extraction. This is a performance and maintenance liability.

2. **`appointment_type` as free text**: The `appointment_type` column on `PatientSchedule` is VARCHAR(128) with no validation, no controlled vocabulary, and no index. Over time, this will accumulate inconsistent values ("Follow-up", "follow up", "FU", "f/up", "Control visit", etc.).

3. **Duplicate workflow completion logic**: Both `medicalWorkflowService.submitWorkflowEntry()` (lines 403-421) and `encounterCompletionService.executeCompletion()` independently handle workflow completion. The former cancels pending tasks inline; the latter uses the service. This duplication could cause inconsistencies if follow-up logic is added to one path but not the other.

4. **No composition root for encounter lifecycle**: The encounter lifecycle (admission → clinical work → completion) has no centralized orchestrator. Multiple services (`appointmentService`, `medicalWorkflowService`, `encounterCompletionService`) each handle parts. Adding follow-up to the lifecycle would require changes in multiple places.

5. **Ophthalmology template coupling**: Follow-up form fields are defined ONLY in the Ophthalmology diagnosis preset. Other specialties cannot capture follow-up data without creating their own templates. There is no cross-specialty follow-up field.

6. **Seed data inconsistency**: The demo seed uses "Ophthalmology follow-up" as an `appointment_type` value, but no system logic interprets this string. It's purely cosmetic.

---

## 10. Clinical Risks

| Risk | Severity | Description |
|------|----------|-------------|
| **Missed follow-ups** | **High** | No automated system ensures patients return when clinically required. Relies entirely on verbal instruction and patient memory. |
| **Loss of clinical intent** | **High** | A doctor records "Follow-up in 90 days" in clinical notes/form_data, but no system enforces this. If the patient doesn't book, the intent is lost. |
| **No accountability** | **High** | There is no audit trail of: "Who recommended follow-up?" "Was the follow-up completed?" "Why was it missed?" This creates medico-legal exposure. |
| **Chronic disease management failure** | **Critical** | Chronic conditions (diabetes, hypertension, glaucoma) require scheduled follow-ups. The current system cannot track adherence to chronic care plans. |
| **Post-operative care gaps** | **High** | Surgical patients need scheduled follow-ups (day 1, week 1, month 1, etc.). No system tracks post-operative follow-up compliance. |
| **No clinical decision support** | **Medium** | Clinicians get no reminders about pending follow-ups for patients they are currently seeing. No "This patient has an overdue follow-up" warning. |
| **Reception cannot prioritize** | **Medium** | When a patient calls to book, reception cannot distinguish between "routine new visit" and "critical overdue follow-up." No triaging capability. |
| **Patient safety incidents** | **Critical** | If a clinician recommends urgent follow-up but the patient does not return, there is no system to detect and escalate the missed follow-up. This is a patient safety risk. |

---

## 11. Overall Maturity Score

**Score: 8 / 100**

| Category | Score | Justification |
|----------|-------|---------------|
| **Follow-up data capture** | 10/100 | Only exists as form fields in one specialty template, data goes nowhere |
| **Follow-up scheduling** | 0/100 | No automated scheduling from clinical recommendations |
| **Follow-up tracking** | 0/100 | No status, no queue, no dashboard |
| **Follow-up notifications** | 0/100 | No reminders for patients or staff |
| **Follow-up compliance** | 0/100 | No metrics, no reporting |
| **Encounter linking** | 0/100 | No parent/child relationship between encounters |
| **Visit type classification** | 5/100 | Free text field only, no controlled vocabulary |
| **Clinical rule integration** | 0/100 | No follow-up rules in clinical rule engine |
| **Patient portal integration** | 0/100 | Shows next appointment but not recommended follow-ups |
| **Reception workflow** | 0/100 | Cannot distinguish follow-ups from new visits |
| **Medico-legal readiness** | 5/100 | Some audit of clinical notes but no follow-up-specific audit trail |

**Key takeaway**: The system has strong foundations (encounter completion, clinical rules, scheduling, notifications, permissions, auditing) but follow-up as a feature is essentially **non-existent**. The current maturity reflects that follow-up is at the "idea" stage — data can be captured but cannot be acted upon.

---

## 12. Recommendations (Do NOT Implement)

1. **Create a dedicated Follow-up entity** (table, model, service, controller, routes) rather than relying on JSONB form_data.

2. **Establish encounter linking** by adding `parent_appointment_id` and `related_encounter_type` to enable follow-up chains.

3. **Implement controlled visit types** with a vocabulary: New Patient, Follow-up, Referral, Walk-in, Emergency, Post-operative, Screening.

4. **Add a "Schedule Follow-up" action** to the global workflow actions in `AppointmentWorkflowPanel.tsx`, between "Prescription" and "Complete workflow".

5. **Integrate follow-up with the clinical rule engine** by adding a `FOLLOWUP_DUE` trigger that evaluates follow-up intervals.

6. **Build follow-up dashboard widgets** for: Clinician (my follow-ups), Reception (arriving follow-ups), Admin (compliance metrics), Patient Portal (pending follow-ups).

7. **Add follow-up validation to encounter completion** — at minimum a warning if follow-up was recommended but not scheduled.

8. **Implement follow-up notifications** for: upcoming follow-ups, overdue follow-ups, missed follow-ups (escalation path).

9. **Create a follow-up series/schedule** capability for chronic care plans requiring multiple visits (e.g., physiotherapy 3x/week for 6 weeks).

10. **Separate follow-up from the Ophthalmology template** so it is a cross-specialty, system-level feature, not a specialty-specific form field.

---

## Appendix A: Files Searched (Complete)

### Backend Services
- `backend/services/medicalWorkflowService.js` — 784 lines, no follow-up processing
- `backend/services/encounterCompletionService.js` — 218 lines, no follow-up step
- `backend/services/clinicalRuleEngineService.js` — 341 lines, no follow-up rules
- `backend/services/appointmentService.js` — 319 lines, no follow-up awareness
- `backend/services/patientScheduleService.js` — 625 lines, no follow-up scheduling
- `backend/services/patientPortalService.js` — 299 lines, no follow-up in dashboard
- `backend/services/timelineEventService.js` — 239 lines, no follow-up events
- `backend/services/notificationService.js` — 137 lines, no follow-up notifications

### Backend Controllers
- `backend/controllers/workflow/medicalWorkflowController.js` — 182 lines, no follow-up endpoints

### Backend Models
- `backend/models/scheduling/staffAppointment.js` — 72 lines, no follow-up columns
- `backend/models/scheduling/patientSchedule.js` — 62 lines, free-text appointment_type
- `backend/models/workflow/medicalHistoryLog.js` — 88 lines, JSONB form_data container
- `backend/models/workflow/workflowTask.js` — 74 lines, appointment forwarding only

### Backend Configs
- `backend/config/ophthalmologyDiagnosisPreset.js` — 725 lines, has follow-up FORM FIELDS ONLY

### Frontend Components
- `frontend/src/features/medical-workflow/AppointmentWorkflowPanel.tsx` — 561 lines, NO follow-up action
- `frontend/src/features/medical-workflow/components/GlobalWorkflowActions.tsx` — 80 lines, 4 actions (no follow-up)
- `frontend/src/features/medical-workflow/components/EncounterValidationDialog.tsx` — 325 lines, no follow-up validation
- `frontend/src/features/medical-workflow/WorkflowInboxTable.tsx` — 310 lines, no follow-up columns
- `frontend/src/features/staff-appointments/StaffAppointmentsTable.tsx` — 321 lines, no follow-up columns

### Frontend Forms
- `frontend/src/features/medical-certificate/certificateDocumentUtils.ts` — hardcoded text only

### Documentation
- `docs/OUTPATIENT_WORKFLOW.md` — 419 lines, covers entire patient journey, mentions no follow-up process

---

## Appendix B: Key Code Evidence

### Evidence 1: Follow-up form fields (ophthalmologyDiagnosisPreset.js lines 310, 552-558)
```javascript
field(S.INTAKE, "follow_up_required", "Follow-up required", "switch", 14),
// ...
field(S.PLAN, "follow_up_plan", "Follow-up plan", "textarea", 3),
field(S.PLAN, "follow_up_days", "Follow-up in (days)", "number", 4),
field(S.PLAN, "follow_up_date", "Follow-up date", "date", 5),
field(S.PLAN, "follow_up_time", "Follow-up time", "time", 6),
```
These are the ONLY follow-up fields in the system. They are defined ONLY for the Ophthalmology template.

### Evidence 2: Workflow completion has no follow-up (encounterCompletionService.js lines 51-122)
```javascript
async executeCompletion(appointmentId, userId, options) {
  // Sets workflow_status = "completed"
  // Cancels pending workflow tasks
  // NO follow-up creation
  // NO follow-up validation
  // Encounter simply ends
}
```

### Evidence 3: Global workflow actions have no follow-up (GlobalWorkflowActions.tsx lines 28-79)
```tsx
Actions: Back | Forward to staff | Prescription | Complete workflow | History
// NO "Schedule Follow-up" button
```

### Evidence 4: Patient portal returns next_appointment only (patientPortalService.js lines 277-284)
```javascript
return {
  next_appointment: upcoming[0] || null,  // Only scheduled appointments
  // NO recommended_follow_ups
  // NO pending_follow_ups
  // NO overdue_follow_ups
};
```

### Evidence 5: Follow-up data stored but never read
The `MedicalHistoryLog.form_data` JSONB field stores follow-up data when submitted through the Ophthalmology template, but no service, controller, or scheduled job reads this data to create appointments, send notifications, or trigger any action.