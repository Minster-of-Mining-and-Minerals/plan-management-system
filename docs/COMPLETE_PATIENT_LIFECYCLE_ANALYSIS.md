# Complete Patient Lifecycle Architecture Analysis

## Trace of Actual Implementation as of the Codebase

---

## SECTION 1 — Patient Journey

### 1. Patient Registration

| Aspect | Detail |
|--------|--------|
| **Module** | Patient Management |
| **API** | `POST /api/patients` |
| **Service** | Patient controller (not workflow-specific) |
| **Models** | `User` + `PatientProfile` (with `patient_code`, `patient_status`) |
| **Workflow Status** | None, no workflow yet |
| **Next Trigger** | Staff navigates to schedule booking |

**What actually happens:**
1. Staff enters demographic/form-field data.
2. System creates an internal User row + PatientProfile (including generated `patient_code`).
3. Patient appears in the patient list at `/patients/list`.

There is **no automated trigger** to the next step. A human must decide to book a schedule.

---

### 2. Scheduling

| Aspect | Detail |
|--------|--------|
| **Module** | Scheduling (owned by `patientScheduleService.js`) |
| **API** | `POST /api/schedules`, `PATCH /api/schedules/:id` |
| **Service** | `patientScheduleService.js` → `createSchedule()`, `updateSchedule()` |
| **Models** | `PatientSchedule` (fields: `schedule_id`, `patient_id`, `assigned_staff_id`, `schedule_date`, `start_time`, `end_time`, `status`, `appointment_type`, `notes`) |
| **Schedule Statuses** | `scheduled`, `pending`, `updated`, `rescheduled`, `completed`, `cancelled`, `admitted` |
| **Validation** | Slot availability, horizon days, day-of-week active, staff must have `receive_appointment` permission, overlap check |
| **Next Trigger** | Human action: reception admits the schedule on visit day |

**What actually happens:**
1. Staff picks date, time slot, and assigned clinician (must have `receive_appointment` permission).
2. `PatientSchedule` created with status = `"scheduled"`.
3. Slot rules, horizon checks, overlap checks enforced.
4. Schedule has a **1:1 link** to `StaffAppointment` via `schedule_id` (created on admission).
5. If booked via patient portal: status = `"scheduled"` without staff admit yet.

**Critical:** The schedule IS the appointment booking. It does NOT create an encounter yet.

---

### 3. Admission (Check-in / Encounter Creation)

| Aspect | Detail |
|--------|--------|
| **Module** | Scheduling → Appointment Service |
| **API** | `PATCH /api/schedules/:id` with `{ status: "admitted" }` |
| **Service** | `patientScheduleService.js` → `updateSchedule()` → calls `appointmentService.syncFromScheduleAdmission()` |
| **Models Created** | `StaffAppointment` (new row, or reuses existing if one already linked) |
| **Workflow Status** | `StaffAppointment.workflow_status = "active"` (default) |
| **Schedule Status** | `PatientSchedule.status = "admitted"` |
| **Next Trigger** | Assigned clinician opens their Appointments list |

**What actually happens:**
1. Admission is allowed **only on the appointment date (today)** — enforced by `assertAdmissionDateIsToday()`.
2. `patientScheduleService.updateSchedule()` detects status change to `"admitted"`.
3. Calls `appointmentService.syncFromScheduleAdmission(scheduleRow, admittedByUserId)`:

   **Inside `syncFromScheduleAdmission()`**:
   - Checks if `StaffAppointment` already exists for this `schedule_id`.
   - If not: creates `StaffAppointment` with:
     - `appointment_id` (UUID)
     - `schedule_id` (links 1:1 to PatientSchedule)
     - `patient_id`
     - `assigned_staff_id` (from the schedule)
     - `admitted_by` (current user)
     - `admitted_at` (Date.now)
     - `status = "admitted"`
     - `workflow_status = "active"` (default from model)
   - Notifies assigned staff: **"New patient appointment assigned"**.
   - If exists: updates existing appointment fields.

   **CRITICAL: After creating the appointment, it also calls:**
   ```javascript
   const encounterFollowUpService = require("./encounterFollowUpService");
   await encounterFollowUpService.autoCompleteFollowUp(
     scheduleRow.schedule_id,
     appointment.appointment_id,
     { admittedBy: admittedByUserId }
   );
   ```
   This attempts to find a follow-up linked to this schedule. If found, it auto-completes the follow-up. If not found (normal first visit), the error is silently caught and ignored.

---

### 4. Workflow Assignment

| Aspect | Detail |
|--------|--------|
| **Module** | Medical Workflow |
| **Service** | `medicalWorkflowService.js` |
| **API** | N/A — implicit on admission |
| **Models** | `StaffAppointment.assigned_staff_id` (from schedule) |
| **Workflow Status** | `StaffAppointment.workflow_status = "active"` |

**What happens at admission:**
- The assigned clinician (from the schedule) is set as `assigned_staff_id` on the StaffAppointment.
- The appointment appears under the clinician's **Appointments** list (`/appointments`).
- No explicit "workflow assignment" step exists — the assignment IS the admission.

---

### 5. Forwarding

| Aspect | Detail |
|--------|--------|
| **Module** | Medical Workflow |
| **API** | `POST /api/workflow/submit` with `{ action_type: "forward", receiver_staff_id, ... }` |
| **Service** | `medicalWorkflowService.submitWorkflowEntry()` |
| **Models** | `MedicalHistoryLog` (log entry) + `WorkflowTask` (task for receiver) |
| **Permissions** | Sender: `WORKFLOW:FORWARD`. Receiver: `PATIENTS:RECEIVE_PATIENT` |
| **Next Trigger** | Receiver checks `/workflow-inbox` |

**What actually happens:**
1. Clinician submits a workflow entry with `action_type = "forward"` and `receiver_staff_id`.
2. System validates: receiver exists, cannot forward to self, receiver has `receive_patient` permission.
3. Creates a `MedicalHistoryLog` entry with:
   - `sender_staff_id` = current user
   - `receiver_staff_id` = target user
   - `action_type = "forward"`
   - `status = "forwarded"`
   - `form_data` from the diagnosis form (partial validation allowed on forward)
4. Closes any pending `WorkflowTask` for current user on this appointment (`closePendingTasksForStaff`).
5. Creates a new `WorkflowTask`:
   - `appointment_id` (the same encounter)
   - `assignee_staff_id` = receiver
   - `assigned_by_staff_id` = sender
   - `medical_log_id` = the log entry
   - `status = "pending"`
6. Notification sent to receiver: **"Patient forwarded to you"**.
7. The appointment appears in receiver's **Workflow Inbox** (`/workflow-inbox`).

**Return action**: Works identically but sends the task back to a previous participant (found via `returnCandidates` in workflow context).

---

### 6. Clinical Work

| Aspect | Detail |
|--------|--------|
| **Module** | Medical Workflow |
| **API** | `POST /api/workflow/submit` with `{ action_type: "submit", form_data, ... }` |
| **Service** | `medicalWorkflowService.submitWorkflowEntry()` |
| **Models** | `MedicalHistoryLog`, `DiagnosisFormConfig` |
| **Workflow Status** | Remains `"active"` (submit does NOT complete) |

**What actually happens:**
1. Clinician fills a diagnosis form (dynamic form tied to `DiagnosisFormConfig`).
2. Form data is validated via `validateDiagnosisFormData()` (full or partial).
3. `MedicalHistoryLog` created with:
   - `action_type = "submit"`
   - `status = "submitted"`
   - `form_data` = validated form fields
   - `form_config_id` = which form config was used
4. Pending `WorkflowTask` for this user is marked `"done"`.
5. No new task is created (unlike forward, there's no receiver).
6. Clinical suggestions learn from the form data (`clinicalSuggestionService.learnFromFormData()`).

---

### 7. Diagnosis

| Aspect | Detail |
|--------|--------|
| **Module** | Medical Workflow (embedded in form submission) |
| **Service** | `diagnosisFormConfigService.js`, `dynamicDiagnosisValidationService.js` |
| **Models** | `MedicalHistoryLog` (stores `form_data` with diagnosis fields), `DiagnosisFormConfig` |
| **API** | Same as Clinical Work — `POST /api/workflow/submit` |

**What actually happens:**
- Diagnosis is not a separate step in the codebase. It is part of the diagnosis form submission.
- Clinicians use a dynamic form that includes diagnosis fields.
- The form data (including diagnosis information) is stored in `MedicalHistoryLog.form_data` as JSON.
- The system checks `has_diagnosis` during encounter completion by counting `MedicalHistoryLog` entries with relevant `action_type` values (`"submit"`, `"forward"`).

---

### 8. Clinical Documents

| Aspect | Detail |
|--------|--------|
| **Module** | Medical Workflow |
| **Models** | `MedicalHistoryLog` (timeline entries with notes and attachments) |
| **API** | `POST /api/workflow/submit` |

**What actually happens:**
- Clinical notes and documents are submitted as workflow entries.
- Attachments are linked via `attachmentAccessService.linkAttachmentsToResource()`.
- The timeline is retrieved via `GET /api/workflow/timeline` which returns all `MedicalHistoryLog` rows for the appointment.

---

### 9. Prescription

| Aspect | Detail |
|--------|--------|
| **Module** | Prescription (separate module) + Medical Workflow |
| **Models** | `Prescription`, `PrescriptionItem`, `PrescriptionCategory`, `PrescriptionTemplate` |
| **Workflow Link** | `Prescription.workflow_log_id` links to `MedicalHistoryLog` |
| **API** | `POST /api/workflow/submit` with `action_type: "prescribe"` |

**What actually happens:**
1. Clinician creates a prescription through the prescription module (separate from workflow submit).
2. Then submits a workflow entry with `action_type = "prescribe"` and `form_data.prescription_id`.
3. System stores prescription metadata in the log (`prescription_id`, `template_name`, `items_summary`).
4. `Prescription.workflow_log_id` is updated to link the prescription to the workflow log.
5. No new task created; existing tasks closed.

---

### 10. Billing

| Aspect | Detail |
|--------|--------|
| **Module** | Finance / Billing |
| **API** | `POST /api/appointment-billing/:appointmentId` |
| **Service** | `appointmentBillingService.js` |
| **Models** | `AppointmentBillingAccount` (statuses: `draft`, `pending_payment`, `partially_paid`, `paid`, `cancelled`, `refunded`) |
| **Workflow Status** | Unchanged |

**What actually happens:**
1. First charge auto-creates `AppointmentBillingAccount` for the visit in `draft` status.
2. Staff adds services from billing catalog.
3. Account transitions to `pending_payment` once charges exist.
4. Unlock rules: charges can be added even after partial/full payment (only `cancelled`/`refunded` locks).
5. Billing is **optional during workflow** — it can happen anytime.

---

### 11. Send to Cashier

| Aspect | Detail |
|--------|--------|
| **Module** | Finance (Collection Request) |
| **API** | `POST /api/appointment-billing/:appointmentId/send-to-cashier` |
| **Models** | `BillingCollectionRequest` (statuses: `pending`, `partially_collected`, `collected`, `superseded`, `cancelled`) |
| **Workflow Status** | Unchanged |

**What actually happens:**
1. Validates: active line items exist, balance due > 0.
2. Creates `BillingCollectionRequest` with `status = "pending"`.
3. Previous open requests for this visit become `"superseded"`.
4. Account ensured `pending_payment` if still `draft`.
5. Visit enters cashier queue.
6. This can also be triggered via Workflow actions ("Forward → Cashier desk").

---

### 12. Cashier (Payment Collection)

| Aspect | Detail |
|--------|--------|
| **Module** | Cashier / Finance |
| **API** | `/api/finance/cashier/*` |
| **Models** | `CashierSession`, `CashierPayment`, `PaymentTender` |
| **Workflow Status** | Unchanged |

**What actually happens:**
1. Cashier opens session (must be open to collect).
2. Queue shows visits with accounts in `pending_payment` or `partially_paid`.
3. Cashier collects full or partial payment.
4. `CashierPayment` + `PaymentTender` rows created.
5. Account → `partially_paid` or `paid`. Collection request → `partially_collected` or `collected`.
6. Receipt generated.

---

### 13. Encounter Completion

| Aspect | Detail |
|--------|--------|
| **Module** | Medical Workflow (Encounter Validation Engine) |
| **API** | `GET /api/workflow/appointment/:appointmentId/validate-completion` (validate) |
|  | `POST /api/workflow/appointment/:appointmentId/execute-completion` (execute) |
| **Service** | `encounterCompletionService.js` + `clinicalRuleEngineService.js` |
| **Models** | `StaffAppointment` (updated), `WorkflowTask` (cancelled) |
| **Workflow Status Before** | `"active"` |
| **Workflow Status After** | `"completed"` |

**What happens during validation:**
1. `encounterCompletionService.validateCompletion()` called.
2. Builds context data: pending tasks, lab orders, prescriptions, diagnosis logs, unpaid balance, follow-up record.
3. Evaluates `ENCOUNTER_COMPLETE` rules via `clinicalRuleEngineService.evaluateRules()`.
4. Returns `{ ready, blockingIssues, warnings, summary }`.

**What happens during execution:**
1. `encounterCompletionService.executeCompletion()` called.
2. Checks if already completed → error if so.
3. Re-runs validation — if CRITICAL blocking issues exist and no `overrideReason` provided → error.
4. Updates `StaffAppointment`:
   - `workflow_status = "completed"`
   - `workflow_completed_at = new Date()`
   - `completed_by = userId`
5. Cancels all pending `WorkflowTask` entries for this appointment (status → `"cancelled"`).
6. Note: `StaffAppointment.status` remains `"admitted"`. Only `workflow_status` changes.

---

### 14. Follow-up (Recommended during encounter)

See **Section 4** for complete follow-up lifecycle.

---

### 15. Final Patient State

After encounter completion:
- `StaffAppointment.workflow_status = "completed"`
- `StaffAppointment.workflow_completed_at` = timestamp
- `PatientSchedule.status = "admitted"` (unchanged from admission)
- `AppointmentBillingAccount` = `paid` (if fully paid), or `partially_paid` / `pending_payment` (if not)
- `WorkflowTask` = all cancelled
- `EncounterFollowUp` = RECOMMENDED/PENDING_SCHEDULING/SCHEDULED/COMPLETED (if follow-up was created)
- Patient remains registered in the system with all history preserved

**The patient has no "final state" field** — the system does not track whether treatment is "complete" globally. Each encounter is independently completed.

---

## SECTION 2 — Workflow Engine

### How a Task is Created

A `WorkflowTask` is created **only** when a workflow entry is submitted with `action_type = "forward"` or `"return"`. The `createWorkflowTask()` function in `medicalWorkflowService.js` creates:

```javascript
{
  task_id: uuidv4(),
  appointment_id: appointmentId,
  patient_id: patientId,
  assignee_staff_id: receiverStaffId,
  assigned_by_staff_id: senderStaffId,
  medical_log_id: log.log_id,
  status: "pending"
}
```

For simple `submit` or `prescribe` actions, **no task is created** — those are passive log entries.

### How Forwarding Works

1. User submits `{ action_type: "forward", receiver_staff_id: X }`.
2. System creates a `MedicalHistoryLog` with sender/receiver.
3. System **closes** the current user's pending task (if any) → status `"done"`.
4. System **creates** a new `WorkflowTask` for the receiver → status `"pending"`.
5. Receiver gets a notification.

### How Users Receive Work

Users see work in two surfaces:

| Surface | What It Shows |
|---------|---------------|
| **Appointments** (`/appointments`) | Visits where `StaffAppointment.assigned_staff_id = me` (my admitted patients) |
| **Workflow Inbox** (`/workflow-inbox`) | `WorkflowTask` where `assignee_staff_id = me AND status = "pending"` (forwards to me) |

The access check in `canAccessAppointment()` grants access if:
1. User is the assigned staff and has `receive_appointment` permission, OR
2. User has a pending `WorkflowTask` for this appointment and has `receive_patient` permission, OR
3. User appears in the `MedicalHistoryLog` history (sender or receiver), OR
4. User is the `admitted_by` user, OR
5. User has `schedule` + `workflow:read` permissions (reception/admin).

### How Tasks are Completed

When a user submits **any** workflow action (`submit`, `forward`, `prescribe`, `return`, `complete`):
- The user's pending `WorkflowTask` for that appointment is marked `"done"`.
- For `forward`/`return`: a new task is created for the receiver.
- For `complete`: ALL pending tasks for the appointment are cancelled (`status = "cancelled"`).

### Multiple User Participation

Multiple users can participate through forwarding:
1. Dr. A (assigned staff) → forwards to Dr. B.
2. Dr. B's task is `pending`.
3. Dr. B submits clinical work → their task becomes `done`.
4. Dr. B forwards to Dr. C → Dr. C's task is `pending`.
5. Each forward creates a new task and closes the sender's task.

**Previous users remain linked** through `MedicalHistoryLog` entries — the entire chain is preserved in the timeline. The `sender_staff_id` and `receiver_staff_id` fields on each log record create the audit trail.

### How Workflow History is Stored

History is stored as `MedicalHistoryLog` rows, each with:
- `appointment_id` (links to the encounter)
- `sender_staff_id`
- `receiver_staff_id` (for forward/return)
- `action_type` (submit, forward, return, prescribe, complete)
- `form_data` (clinical data)
- `form_config_id`
- `header_title`
- `status` (submitted, forwarded, returned, prescribed, completed)
- `created_at` (timestamp for timeline ordering)
- `attachment_ids`

The timeline is retrieved via `listTimeline()` which returns all logs for an appointment ordered by `created_at ASC`.

### Parallel Work

There is **no parallel work** in the current implementation. The workflow is strictly sequential:
- At any time, only one user has a `pending` `WorkflowTask` for the appointment.
- When a user submits, their task is closed.
- If forwarding, a new task is created for one receiver.
- No mechanism exists to assign work to multiple users simultaneously.

### Final Ownership

The encounter is **always owned** by the original `assigned_staff_id` (the clinician who was assigned at admission). Forwarding does **not** transfer ownership — it creates a task. The `StaffAppointment.assigned_staff_id` field never changes after admission. The last user to hold the task is tracked through the workflow task history, but the original clinician remains the "owner" in the database.

---

## SECTION 3 — Encounter Completion (After Validation Engine)

### Process Flow

```
validateCompletion() called
        │
        ▼
Build validation context:
  - pending tasks?
  - pending lab orders?
  - unfulfilled prescriptions?
  - unpaid balance?
  - diagnosis recorded?
  - follow-up created?
        │
        ▼
Evaluate ENCOUNTER_COMPLETE rules
  via clinicalRuleEngineService.evaluateRules()
        │
        ▼
Return blocking issues (CRITICAL severity)
     + warnings (non-CRITICAL severity)
        │
        ▼
executeCompletion() called
  (with optional overrideReason + overriddenWarnings)
        │
        ▼
Re-validate (must pass CRITICAL checks
  or provide override reason)
        │
        ▼
Update StaffAppointment:
  workflow_status = "completed"
  workflow_completed_at = new Date()
  completed_by = userId
        │
        ▼
Cancel all pending WorkflowTask
  status = "cancelled" where status = "pending"
```

### Validations That Run

| Rule Name | Severity | What It Checks |
|-----------|----------|----------------|
| Active Task Blocking | CRITICAL | Are there pending `WorkflowTask` rows for this appointment? Blocks completion. |
| Pending Orders Warning | WARNING | Are there lab orders or unfulfilled prescriptions? |
| Unpaid Balance Warning | WARNING | Does `billingInfo.balance_due > 0`? |
| Missing Diagnosis | WARNING | Is there any `MedicalHistoryLog` with action_type in `["submit", "forward"]`? |
| Missing Follow-up Recommendation | WARNING | If `followUpRequired` option is true, is there an `EncounterFollowUp` for this appointment? |

### What Blocks Completion

Only **CRITICAL severity** alerts block completion. As of the seeded rules, only **"Active Task Blocking"** is CRITICAL — any pending `WorkflowTask` blocks completion.

### What Only Warns

All other rules (Pending Orders, Unpaid Balance, Missing Diagnosis, Missing Follow-up) are **WARNING** severity. They display as warnings but **do not block** completion. The user can override them.

### Override Mechanism

If CRITICAL blocking issues exist, the caller must provide `overrideReason` (a string) to bypass. The data structure also accepts `overriddenWarnings` (array of warning IDs), but this is stored for audit, not enforced for blocking.

### Audit

Audit logging happens in `medicalWorkflowController.executeCompletion()`:
```javascript
await logAudit({
  actorUserId: req.user.user_id,
  action: "complete",
  resourceType: "workflow",
  resourceId: appointmentId,
  details: ctx.details, // includes appointment_id, action_type, override reason
  ipAddress: ctx.ipAddress,
});
```
This is separate from the encounter completion service itself — the controller handles audit.

### Timeline Events

The encounter completion service does **not** emit timeline events directly. It only updates the database. The `MedicalHistoryLog` for the complete action (if submitted through the old workflow submit path) serves as the timeline record. The Validation Engine's `executeCompletion()` path updates the appointment directly without creating a `MedicalHistoryLog`.

### Database Fields That Change

**On `StaffAppointment`:**
- `workflow_status`: `"active"` → `"completed"`
- `workflow_completed_at`: `null` → timestamp
- `completed_by`: `null` → userId

**On `WorkflowTask`:**
- All pending tasks: `status` → `"cancelled"`

---

## SECTION 4 — Follow-up Lifecycle (Complete)

### State Machine for EncounterFollowUp

```
RECOMMENDED ──→ PENDING_SCHEDULING ──→ SCHEDULED ──→ COMPLETED
     │                 │                    │
     ├──→ CANCELLED    ├──→ CANCELLED       ├──→ CANCELLED
     └──→ EXPIRED      └──→ EXPIRED         ├──→ MISSED
                                            └──→ EXPIRED

MISSED ──→ SCHEDULED (reschedule)
COMPLETED ──→ (terminal)
CANCELLED ──→ (terminal)
EXPIRED ──→ (terminal)
```

### Allowed Transitions (from code)
```javascript
RECOMMENDED: ["PENDING_SCHEDULING", "SCHEDULED", "CANCELLED", "EXPIRED"]
PENDING_SCHEDULING: ["SCHEDULED", "CANCELLED", "EXPIRED"]
SCHEDULED: ["COMPLETED", "CANCELLED", "MISSED", "EXPIRED"]
COMPLETED: [] // terminal
CANCELLED: [] // terminal
EXPIRED: [] // terminal
MISSED: [] // terminal (but can be rescheduled via new attempt)
```

### Complete Lifecycle Steps

#### Step 1: Clinician Recommends Follow-up

**Trigger:** Clinician calls `POST /api/follow-ups` during the encounter.

**Service:** `encounterFollowUpService.createFollowUp()`

**Model created:**
```javascript
{
  follow_up_id: uuid,
  patient_id: data.patient_id,
  appointment_id: data.appointment_id, // THE CURRENT encounter
  recommended_by: data.recommended_by,
  assigned_department_id: department || null,
  assigned_user_id: user || null,
  reason: string,
  clinical_instructions: text || null,
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT",
  recommended_date: date,
  target_date: date || null,
  status: "RECOMMENDED"
}
```

**Events:**
- Timeline: `FOLLOW_UP_RECOMMENDED`
- Audit: "Follow-up Created"

**Next:** Status = `RECOMMENDED`. Awaiting scheduling by reception.

---

#### Step 2: Follow-up Record Update (Optional)

**Trigger:** Clinician updates follow-up details.

**Service:** `encounterFollowUpService.updateFollowUp()`

**Allowed only when status is:** `RECOMMENDED` or `PENDING_SCHEDULING`.

**Events:**
- Timeline: `FOLLOW_UP_UPDATED`
- Audit: "Follow-up Updated"

---

#### Step 3: Reception Schedules Appointment

**Trigger:** `POST /api/follow-ups/:id/schedule-appointment`

**Service:** `encounterFollowUpService.scheduleAppointment()`

**This is the PRIMARY scheduling method.** It does TWO things atomically:

**A. Creates a `PatientSchedule`** (via `patientScheduleService.createSchedule()`):
- `patient_id` (from follow-up)
- `assigned_staff_id` (from scheduleData.assigned_staff_id)
- `schedule_date`, `start_time`
- `appointment_type: "Follow-up visit"`
- `status: "scheduled"`

**B. Creates an `EncounterFollowUpAttempt`:**
```javascript
{
  attempt_id: uuid,
  follow_up_id: followUpId,
  schedule_id: scheduleId, // links to PatientSchedule
  attempt_number: sequential,
  status: "SCHEDULED",
  scheduled_date: date,
  scheduled_at: now,
  scheduled_by: userId
}
```

**C. Updates follow-up status:**
- From `RECOMMENDED`/`PENDING_SCHEDULING` → `SCHEDULED`
- From `MISSED` → `SCHEDULED` (reschedule path)

**Events:**
- Timeline: `FOLLOW_UP_SCHEDULED` or `FOLLOW_UP_RESCHEDULED`
- Audit: "Follow-up Scheduled" or "Follow-up Rescheduled"
- Notification: `follow_up_scheduled` to assigned user

**Next:** Status = `SCHEDULED`. Patient has an appointment scheduled.

---

#### Step 4: Appointment Attempt (Patient Attends)

**Trigger A — Manual:** `POST /api/follow-ups/attempts/:attemptId/attended`

**Service:** `encounterFollowUpService.markAttemptAttended()`

**What happens:**
1. Attempt status → `"ATTENDED"`, `attended_at` = now.
2. Follow-up status → `"COMPLETED"`.
3. `completed_encounter_id` = the encounter where the patient was seen (provided as parameter)
4. `completion_notes` recorded.
5. Timeline: `FOLLOW_UP_COMPLETED`
6. Audit: "Follow-up Completed"
7. Notification: `follow_up_completed` to the recommender

**Trigger B — Automatic (Phase 2.4.2):** `autoCompleteFollowUp()`

Called by `appointmentService.syncFromScheduleAdmission()` when a schedule is admitted. If the schedule matches a follow-up attempt, it auto-completes:
1. Attempt status → `"ATTENDED"`, `attended_at` = now.
2. Follow-up status → `"COMPLETED"`.
3. `completed_encounter_id` = the NEW encounter created by this admission.
4. `completion_notes = "Auto-completed on patient return admission"`.
5. Timeline: `FOLLOW_UP_PATIENT_RETURNED` + `FOLLOW_UP_COMPLETED`
6. Audit: "Patient Returned for Follow-up" + "Follow-up Auto-completed"
7. Notifications: `follow_up_patient_returned` + `follow_up_completed`

---

#### Step 5: Missed Appointment

**Trigger:** `POST /api/follow-ups/attempts/:attemptId/missed`

**Service:** `encounterFollowUpService.markAttemptMissed()`

**What happens:**
1. Attempt status → `"MISSED"`, `missed_reason` recorded.
2. Check if any other active `SCHEDULED` attempts exist for this follow-up.
3. If NO other SCHEDULED attempts AND parent follow-up is `SCHEDULED`:
   - Follow-up status → `"MISSED"`
   - Timeline: `FOLLOW_UP_MISSED`
   - Audit: "Follow-up Missed"
4. If other SCHEDULED attempts exist: parent follow-up stays `SCHEDULED`.
5. **The follow-up is NOT closed** — it can be rescheduled.

---

#### Step 6: Reschedule (After Miss)

**Trigger:** `POST /api/follow-ups/:id/reschedule/:previousAttemptId`

**Service:** `encounterFollowUpService.rescheduleAttempt()`

**What happens:**
1. Verifies previous attempt exists and is `MISSED` or `CANCELLED`.
2. Delegates to `scheduleAppointment()`, which:
   - Creates a new `PatientSchedule`
   - Creates a new `EncounterFollowUpAttempt` (with incremented attempt_number)
   - Transitions follow-up from `MISSED` back to `SCHEDULED`
   - Emits `FOLLOW_UP_RESCHEDULED`

---

#### Step 7: Cancel/Expire

**Cancel:** `POST /api/follow-ups/:id/cancel` with `cancel_reason`.

- Allowed from: `RECOMMENDED`, `PENDING_SCHEDULING`, `SCHEDULED`, `MISSED`
- Status → `"CANCELLED"`
- Timeline: `FOLLOW_UP_CANCELLED`

**Expire:** `encounterFollowUpService.expireFollowUp()`.

- Allowed from: `RECOMMENDED`, `PENDING_SCHEDULING`, `SCHEDULED`
- Status → `"EXPIRED"`
- Timeline: `FOLLOW_UP_EXPIRED`

---

### Where Does the Follow-up Lifecycle END?

**According to the actual code:**

The follow-up lifecycle ends when the follow-up status reaches one of **three terminal states**: `COMPLETED`, `CANCELLED`, or `EXPIRED`.

- **COMPLETED**: The patient attended the follow-up appointment (attempt marked ATTENDED), AND the follow-up record is explicitly transitioned to COMPLETED. This happens either:
  - Manually via `markAttemptAttended()` (requires `completed_encounter_id`)
  - Automatically via `autoCompleteFollowUp()` when the patient is admitted for the follow-up appointment

- **CANCELLED**: Someone explicitly cancels the follow-up.

- **EXPIRED**: The follow-up is expired (e.g., target date passed).

**Critical answer to the question:**

The follow-up lifecycle ends when `EncounterFollowUp.status` becomes `"COMPLETED"`. This happens **when the patient attends the follow-up appointment**, NOT when the appointment is scheduled, NOT when the patient is admitted, and NOT when a new encounter begins.

The `completed_encounter_id` field on `EncounterFollowUp` stores the **new encounter** where the follow-up was completed. This is the encounter created when the follow-up schedule was admitted.

---

## SECTION 5 — Relationship Between Encounters

### When a Follow-up Appointment is Attended

**Does the system create a brand new encounter?**

YES. When a follow-up schedule is admitted, `appointmentService.syncFromScheduleAdmission()` creates a **brand new `StaffAppointment`** record. This is a completely separate encounter from the original one where the follow-up was recommended.

**Does it continue the previous encounter?**

NO. The original encounter (`appointment_id` stored in `EncounterFollowUp.appointment_id`) remains in whatever state it was (typically `workflow_status = "completed"`). The follow-up creates an entirely new `StaffAppointment` with a new `appointment_id`.

**Does it link the encounters together?**

YES, through the `EncounterFollowUp` record:
- `EncounterFollowUp.appointment_id` = the ORIGINAL encounter (where follow-up was recommended)
- `EncounterFollowUp.completed_encounter_id` = the NEW encounter (where follow-up was completed)
- `EncounterFollowUpAttempt.schedule_id` = the schedule that was admitted to create the new encounter
- `EncounterFollowUpAttempt.follow_up_id` = links back to the follow-up record

### ASCII Diagram of Relationships

```
FIRST VISIT (encounter_1)
  ┌─────────────────────────────┐
  │ StaffAppointment            │
  │ - appointment_id = "A"      │◄────── PatientSchedule #1 (admitted)
  │ - workflow_status = active  │              │
  │ - assigned_staff_id = Dr.X  │              │
  └─────────────────────────────┘              │
            │                                  │
            ▼                                  │
  EncounterFollowUp                            │
  ├── follow_up_id = "FU1"                     │
  ├── appointment_id = "A" (original)  ◄───────┘
  ├── status = "COMPLETED"
  ├── completed_encounter_id = "B" ───────────┐
  ├── recommended_by = Dr.X                    │
  └─────────────────────────────────────────── │
                                              │
                                              ▼
FOLLOW-UP VISIT (encounter_2 — BRAND NEW)
  ┌─────────────────────────────┐
  │ StaffAppointment            │
  │ - appointment_id = "B"      │◄────── PatientSchedule #2 (admitted)
  │ - workflow_status = active  │              │
  │ - assigned_staff_id = Dr.Y  │              │
  └─────────────────────────────┘              │
            │                                  │
            ▼                                  │
  EncounterFollowUpAttempt                     │
  ├── attempt_id = "AT1"                       │
  ├── follow_up_id = "FU1"              ◄──────┘
  ├── schedule_id = (PatientSchedule #2) ◄─────┘
  ├── status = "ATTENDED"
  ├── attended_at = now
  └── schema diagram:
  
  EncounterFollowUpAttempt ──belongs_to──► EncounterFollowUp
       │                                         │
       ▼                                         ▼
  PatientSchedule                          StaffAppointment (original)
       │
       ▼ (via schedule_id on StaffAppointment)
  StaffAppointment (new encounter)
```

### Key Relationships

| Source | Target | Type | Key |
|--------|--------|------|-----|
| `EncounterFollowUp` | `StaffAppointment` (original) | `belongsTo` | `appointment_id` |
| `EncounterFollowUp` | `StaffAppointment` (completion) | `belongsTo` | `completed_encounter_id` |
| `EncounterFollowUp` | `EncounterFollowUpAttempt` | `hasMany` | `follow_up_id` |
| `EncounterFollowUpAttempt` | `PatientSchedule` | `belongsTo` | `schedule_id` |
| `PatientSchedule` | `StaffAppointment` | `hasOne` | `schedule_id` |

---

## SECTION 6 — Timeline Events

### User Registration & Scheduling
| Event | Trigger | Emitted By |
|-------|---------|------------|
| (No timeline event for registration) | | |
| (No timeline event for scheduling) | | |

### Admission
| Event | Trigger | Emitted By |
|-------|---------|------------|
| No timeline event emitted on admission (notification sent instead) | | |

### Clinical Workflow
| Event | Trigger | Emitted By |
|-------|---------|------------|
| No timeline events for workflow submit/forward/prescribe | | (uses MedicalHistoryLog instead) |

### Follow-up Lifecycle
| Event | Trigger | Emitted By |
|-------|---------|------------|
| `FOLLOW_UP_RECOMMENDED` | `createFollowUp()` | `encounterFollowUpService._emitTimelineEvent()` |
| `FOLLOW_UP_UPDATED` | `updateFollowUp()` | `encounterFollowUpService._emitTimelineEvent()` |
| `FOLLOW_UP_SCHEDULED` | `scheduleAppointment()` or `createAttempt()` | `encounterFollowUpService._emitTimelineEvent()` |
| `FOLLOW_UP_RESCHEDULED` | `scheduleAppointment()` (from MISSED) or `rescheduleAttempt()` | `encounterFollowUpService._emitTimelineEvent()` |
| `FOLLOW_UP_COMPLETED` | `markAttemptAttended()` or `autoCompleteFollowUp()` | `encounterFollowUpService._emitTimelineEvent()` |
| `FOLLOW_UP_CANCELLED` | `cancelFollowUp()` | `encounterFollowUpService._emitTimelineEvent()` |
| `FOLLOW_UP_EXPIRED` | `expireFollowUp()` | `encounterFollowUpService._emitTimelineEvent()` |
| `FOLLOW_UP_MISSED` | `markAttemptMissed()` (when no other scheduled attempts) | `encounterFollowUpService._emitTimelineEvent()` |
| `FOLLOW_UP_PATIENT_RETURNED` | `autoCompleteFollowUp()` | `encounterFollowUpService._emitTimelineEvent()` |

### Encounter Completion
| Event | Trigger | Emitted By |
|-------|---------|------------|
| No timeline event emitted on encounter completion | | (uses audit + MedicalHistoryLog instead) |

### Billing / Cashier
| Event | Trigger | Emitted By |
|-------|---------|------------|
| No timeline events for billing, send-to-cashier, or payment | | (separate notification/audit system) |

---

## SECTION 7 — Final Lifecycle Diagram

```
PATIENT LIFECYCLE — NOVACURE PLATFORM (current implementation)
═══════════════════════════════════════════════════════════════

                    ┌──────────────────────┐
                    │   1. REGISTRATION    │
                    │  User + PatientProfile│
                    │  API: POST /patients  │
                    └──────────┬───────────┘
                               │ Staff books appointment
                               ▼
                    ┌──────────────────────┐
                    │   2. SCHEDULING      │
                    │  PatientSchedule     │
                    │  status: "scheduled" │
                    │  API: POST /schedules│
                    └──────────┬───────────┘
                               │ Visit day: Staff admits
                               ▼
                    ┌──────────────────────┐
          ┌────────┤  3. ADMISSION         │
          │        │  StaffAppointment     │◄──── Check for follow-up
          │        │  - status: "admitted" │      autoCompleteFollowUp()
          │        │  - workflow_status:   │      (if follow-up schedule)
          │        │    "active"           │
          │        │  API: PATCH /schedules│
          │        └──────────┬───────────┘
          │                   │
          │                   ▼
          │        ┌──────────────────────┐
          │        │  4. CLINICAL WORK    │
          │        │  ┌─────────────────┐ │
          │        │  │ submit (notes)  │ │
          │        │  │ prescribe       │ │
          │        │  │ forward → task  │─┼───► Receiver gets WorkflowTask
          │        │  │ return → task   │─┼───► Previous user gets task
          │        │  │ complete (legacy)│ │
          │        │  └─────────────────┘ │
          │        │  API: POST /workflow  │
          │        └──────────┬───────────┘
          │                   │
          │                   ▼ (in parallel, can happen anytime)
          │        ┌──────────────────────┐
          │        │  5. BILLING          │
          │        │  AppointmentBilling  │
          │        │  Account: draft →    │
          │        │  pending_payment     │
          │        │  API: POST /appt-billing│
          │        └──────────┬───────────┘
          │                   │
          │                   ▼
          │        ┌──────────────────────┐
          │        │  6. SEND TO CASHIER  │
          │        │  BillingCollectionReq│
          │        │  status: "pending"   │
          │        │  API: POST /send-to-cashier│
          │        └──────────┬───────────┘
          │                   │
          │                   ▼
          │        ┌──────────────────────┐
          │        │  7. CASHIER          │
          │        │  CashierPayment      │
          │        │  Account: partial/paid│
          │        │  API: /finance/cashier│
          │        └──────────┬───────────┘
          │                   │
          │                   ▼
          │        ┌──────────────────────┐
          │        │  8. VALIDATE +       │
          │        │     COMPLETE ENCOUNTER│
          │        │  Validate rules       │
          │        │  ├── Active Task? (BLOCK)│
          │        │  ├── Pending Orders? (WARN)│
          │        │  ├── Unpaid Balance? (WARN)│
          │        │  ├── Diagnosis? (WARN)│
          │        │  └── Follow-up req? (WARN)│
          │        │                       │
          │        │  Execute completion:  │
          │        │  workflow_status →    │
          │        │  "completed"          │
          │        │  Tasks → cancelled    │
          │        │  API: POST /execute-  │
          │        │  completion           │
          │        └──────────┬───────────┘
          │                   │
          │                   ▼
          │        ┌──────────────────────┐
          │        │  9. FOLLOW-UP REC     │
          │        │  (optional, created   │
          │        │   before or after     │
          │        │   encounter complete) │
          │        │                      │
          │        │  ┌─ RECOMMENDED ──┐  │
          │        │  │ (initial)      │  │
          │        │  └───────┬────────┘  │
          │        │          │           │
          │        │          ▼           │
          │        │  ┌─ PENDING_ ─────┐  │
          │        │  │  SCHEDULING    │  │
          │        │  └───────┬────────┘  │
          │        │          │           │
          │        │          ▼           │
          │        │  ┌─ SCHEDULED ────┐  │
          │        │  │ (has Patient   │  │
          │        │  │  Schedule +    │  │
          │        │  │  Attempt)      │  │
          │        │  └───┬───┬───────┘  │
          │        │      │   │          │
          │        │      │   ▼          │
          │        │      │  MISSED ──┐  │
          │        │      │  (can be  │  │
          │        │      │  resched) │  │
          │        │      │   ▲       │  │
          │        │      │   └───────┘  │
          │        │      ▼              │
          │        │  ┌─ COMPLETED ──┐   │
          └────────┼──┤ (terminal)   │   │
                   │  └──────────────┘   │
                   │                     │
                   │  ALSO: CANCELLED,   │
                   │        EXPIRED      │
                   └─────────────────────┘
                              │
                              ▼ (If follow-up scheduled & patient admitted)
              ┌───────────────┴───────────────┐
              │                                │
              ▼                                ▼
    ┌─────────────────────┐        ┌─────────────────────┐
    │ AUTO-COMPLETE       │        │ MANUAL COMPLETE     │
    │ Follow-up (called   │        │ markAttemptAttended │
    │ on admission of     │        │ (requires completed │
    │ follow-up schedule) │        │ encounter ID)       │
    └─────────────────────┘        └─────────────────────┘
              │                                │
              └───────────┬────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │ NEW ENCOUNTER       │
              │ (StaffAppointment   │
              │  from follow-up     │
              │  schedule admit)    │
              │                     │
              │ Now this new        │
              │ encounter goes      │
              │ through steps 4-8   │
              │ again independently │
              └─────────────────────┘
```

---

## SECTION 8 — Architectural Boundary

### 1. Where does the patient's lifecycle currently stop?

The lifecycle stops at **encounter completion** (`StaffAppointment.workflow_status = "completed"`). The patient has no "active episode" tracking at the system level. Each encounter is a self-contained visit.

For follow-ups, the lifecycle of the follow-up record stops at one of three terminal statuses: `COMPLETED`, `CANCELLED`, or `EXPIRED`. But the **patient lifecycle** as tracked by the system does not have a definitive "end" — the patient remains registered in the system permanently.

### 2. What is considered the end of treatment?

There is **no system-defined "end of treatment"** concept. The closest approximation is:

- **Encounter-level**: `workflow_status = "completed"` on `StaffAppointment`
- **Patient-level**: Nothing. There is no patient-level treatment status field.

The system treats each visit as independent. There is no "course of treatment" or "episode of care" model that spans multiple encounters.

### 3. What starts the next encounter?

**Admission of a new schedule** starts the next encounter. Specifically:
1. A `PatientSchedule` is created (either manually by reception for a regular visit, or as part of follow-up scheduling).
2. The schedule is admitted (`PATCH /api/schedules/:id` with `status: "admitted"`).
3. `appointmentService.syncFromScheduleAdmission()` creates a new `StaffAppointment`.

This happens for **both** regular visits and follow-up visits. There is no special "continue encounter" mechanism.

### 4. Is follow-up considered part of the previous encounter or the next encounter?

**According to the code:**

The follow-up is **linked to the previous encounter** through `EncounterFollowUp.appointment_id` (the original encounter), but it is **completed by the next encounter** through `EncounterFollowUp.completed_encounter_id` (the new encounter).

The follow-up is a **bridge entity between two encounters**:
- It originates from encounter A (via `appointment_id`)
- It is resolved by encounter B (via `completed_encounter_id`)
- The follow-up attempt is linked to the schedule that, when admitted, creates encounter B

So the follow-up is:
- **Conceptually part of the previous encounter's outcome** (the clinician recommends it during that visit)
- **Physically resolved by the next encounter** (the patient must attend a new visit)

### 5. Is there any continuity missing between encounters?

**Yes, significant continuity is missing:**

1. **No episode/course-of-care model**: The system has no concept that links encounter A → follow-up → encounter B as a single "episode of care." Each encounter is fully independent.

2. **No shared clinical context**: When encounter B is created from a follow-up admission, there is **no automatic carry-over** of:
   - Previous diagnoses from encounter A
   - Previous prescriptions from encounter A
   - Previous clinical notes from encounter A
   - Previous billing history (billing is per-encounter)

3. **Separate workflow**: The new encounter starts with `workflow_status = "active"` and goes through its own independent workflow. The previous encounter's completed status is not affected.

4. **Separate billing**: Each encounter has its own `AppointmentBillingAccount`. Balances are not carried forward.

5. **No outcome tracking**: There is no mechanism to determine if the follow-up visit actually addressed the reason it was created. The `completion_notes` field on `EncounterFollowUp` is the only bridge, and it is a free-text field.

6. **The follow-up auto-complete happens inside `syncFromScheduleAdmission()`** — it's a side effect of admission, not a native part of the workflow engine. If `autoCompleteFollowUp()` fails silently (exception caught), the follow-up remains in `SCHEDULED` status with no alert to the user.

7. **No enforcement**: There is nothing preventing the follow-up schedule from being admitted without the follow-up being auto-completed (e.g., if someone manually creates a schedule rather than using the follow-up scheduling flow).