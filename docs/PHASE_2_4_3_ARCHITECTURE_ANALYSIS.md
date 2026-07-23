# Phase 2.4.3 — Follow-up Continuity Engine: Architectural Analysis

**Date**: 2026-07-23
**Author**: Lead Clinical Architect
**Scope**: Complete architectural analysis before implementation

---

## 1. How Admission Currently Creates StaffAppointment

The admission flow is in **`backend/services/appointmentService.js`**, function `syncFromScheduleAdmission()`.

**Flow:**
1. `PatientScheduleService` updates a schedule row to `status = "admitted"`
2. This triggers a status change callback → `syncFromScheduleStatusChange()` → `syncFromScheduleAdmission()`
3. `syncFromScheduleAdmission()` checks if a `StaffAppointment` already exists for the schedule
   - If yes: updates the appointment with new `admitted_at`, `admitted_by`, `assigned_staff_id`
   - If no: **creates a new `StaffAppointment`** with `appointment_id` (UUID), `schedule_id`, `patient_id`, `assigned_staff_id`, `admitted_by`, `admitted_at`, `status = "admitted"`
4. Notifies the assigned staff via Socket.IO
5. **Calls `encounterFollowUpService.autoCompleteFollowUp(schedule_id, appointment_id)`** — this is the Phase 2.4.2 hook

**Key observation**: The follow-up auto-completion is called from inside `syncFromScheduleAdmission()`. It locates the `EncounterFollowUpAttempt` by `schedule_id` and auto-completes the follow-up. The new `StaffAppointment` is created **before** `autoCompleteFollowUp()` runs.

---

## 2. Where autoCompleteFollowUp() Executes

Located in **`backend/services/encounterFollowUpService.js`** (lines 726-824).

**Logic:**
1. Receives `scheduleId` and `newEncounterId`
2. Finds `EncounterFollowUpAttempt` where `schedule_id = scheduleId AND status = "SCHEDULED"`, including the parent `EncounterFollowUp`
3. If no attempt found → returns `null` (normal appointment, no follow-up)
4. If found:
   - Marks attempt as `ATTENDED` with `attended_at`
   - Marks follow-up as `COMPLETED` with `completed_encounter_id = newEncounterId`
   - Emits timeline events: `FOLLOW_UP_PATIENT_RETURNED`, `FOLLOW_UP_COMPLETED`
   - Records audit entries
   - Sends notifications to the `recommended_by` clinician

**Critical for Phase 2.4.3**: After `autoCompleteFollowUp()` runs, the `EncounterFollowUpAttempt` now has `status = "ATTENDED"` and the parent `EncounterFollowUp` has `status = "COMPLETED"`. However, the new `StaffAppointment` has **no direct link** back to the follow-up. The link is: `StaffAppointment.schedule_id → PatientSchedule.schedule_id → EncounterFollowUpAttempt.schedule_id → EncounterFollowUp.follow_up_id`.

---

## 3. How EncounterFollowUp Is Linked

### 3.1 Link Chain (read direction)

```
StaffAppointment (current)
  └── schedule_id
        ↓
PatientSchedule
  └── schedule_id
        ↓
EncounterFollowUpAttempt
  └── follow_up_id
        ↓
EncounterFollowUp
  ├── appointment_id  →  original StaffAppointment (where follow-up was created)
  ├── completed_encounter_id → StaffAppointment (where follow-up was completed)
  ├── patient_id
  ├── recommended_by
  ├── reason, clinical_instructions, priority, etc.
  └── attempts[] → EncounterFollowUpAttempt[]
        └── schedule_id → PatientSchedule (scheduled appointment)
```

### 3.2 Key Relationships

| Relationship | Direction | Cardinality | Notes |
|---|---|---|---|
| StaffAppointment → PatientSchedule | FK: schedule_id | One-to-one | Each appointment has one schedule |
| PatientSchedule → EncounterFollowUpAttempt | FK: schedule_id | One-to-one (optional) | Only exists if this schedule was created for a follow-up |
| EncounterFollowUpAttempt → EncounterFollowUp | FK: follow_up_id | Many-to-one | Multiple attempts per follow-up |
| EncounterFollowUp → StaffAppointment (original) | FK: appointment_id | One-to-one | The encounter where follow-up was recommended |
| EncounterFollowUp → StaffAppointment (completed) | FK: completed_encounter_id | One-to-one (nullable) | The encounter where follow-up was fulfilled |

### 3.3 Current State After Phase 2.4.2

- `EncounterFollowUp.appointment_id` = original encounter that created the follow-up
- `EncounterFollowUp.completed_encounter_id` = new encounter (populated by `autoCompleteFollowUp`)
- `EncounterFollowUpAttempt.schedule_id` links to the `PatientSchedule` that was created for the follow-up visit

**This is sufficient for Phase 2.4.3 to work.** The continuity service can navigate: `current Appointment → schedule → attempt → followUp → original appointment`.

---

## 4. How the Workflow Loads an Appointment Today

**Frontend flow in `AppointmentWorkflowPanel.tsx`:**

1. User navigates to `/appointments/[appointmentId]`
2. Component mounts with `appointmentId` prop
3. Calls `useGetWorkflowContextQuery(appointmentId)` → `GET /api/workflow/appointment/:appointmentId/context`
4. `medicalWorkflowController.getContext()` → `medicalWorkflowService.getWorkflowContext(appointmentId, userId)`
5. Service:
   - Verifies access via `canAccessAppointment()` (checks assignment or forwarded task)
   - Loads `StaffAppointment` with patient, staff, schedule, billing
   - Loads timeline (`MedicalHistoryLog` entries for this appointment)
   - Loads form configs available
   - Loads pending `WorkflowTask`
   - Returns `WorkflowContext` DTO: `{ appointment, timeline, formConfig, form, formOptions, pendingTask, workflowActive, returnCandidates }`

6. Component renders:
   - `GlobalWorkflowActions` (buttons: Back, Forward, Prescribe, Schedule Follow-up, Complete, History)
   - `DiagnosisReportsCard` (timeline entries)
   - `AppointmentBillingCard`
   - `WorkflowFormCard` (if form selected)
   - Panels (Forward, Prescribe, History) via `AnimatePresence`

---

## 5. How AppointmentWorkflowPanel Obtains Appointment Information

The panel receives `appointmentId` as a prop (from route params like `/appointments/[id]`).

It uses RTK Query:
```typescript
const { data, isLoading, isError, refetch } = useGetWorkflowContextQuery(appointmentId);
```

The `data` object (type `WorkflowContext`) contains:
- `data.appointment` — the `StaffAppointment` with patient, staff, schedule info
- `data.timeline` — array of `MedicalHistoryLog` entries
- `data.formConfig`, `data.form` — the current diagnosis form
- `data.formOptions` — available form variants
- `data.pendingTask` — forwarded task if any
- `data.workflowActive` — whether workflow is active
- `data.returnCandidates` — eligible staff to forward to

---

## 6. Where the Best Extension Point Exists for Injecting Follow-up Context

**Analysis of the workflow loading sequence:**

```
URL: /appointments/[id]
  ↓
AppointmentWorkflowPanel mounts
  ↓
useGetWorkflowContextQuery(appointmentId) fires
  ↓
GET /api/workflow/appointment/:appointmentId/context
  ↓
Renders GlobalWorkflowActions + DiagnosisReportsCard + BillingCard + Form
```

**Option A: Load inside getWorkflowContext** (modify existing endpoint)
- Pros: Single request, already loaded
- Cons: Changes existing API contract, violates backward compatibility, affects all encounters

**Option B: Separate API call in the component** (recommended)
- Pros: Clean separation of concerns, non-follow-up encounters unaffected, follows existing pattern
- Cons: Additional request
- **Decision: OPTION B** — use a separate `GET /api/workflow/:appointmentId/follow-up-context` endpoint

**Extension point in `AppointmentWorkflowPanel.tsx`:**

The ideal location is **after the `useGetWorkflowContextQuery` succeeds** and **before/between the rendering of GlobalWorkflowActions and the DiagnosisReportsCard**.

Specifically, between lines 391-405 in `AppointmentWorkflowPanel.tsx`:
```typescript
// After loading check (line 391)
if (isLoading) return <Loading01 />;

// Insert follow-up context loading here:
// const { data: followUpContext } = useGetFollowUpContextQuery(appointmentId);
// if (followUpContext?.is_follow_up) { show ClinicalHandover }

// Then existing error check (line 393)
if (isError || !data) { ... }
```

---

## 7. Which APIs Currently Return Appointment Details

| API Endpoint | Returns | Notes |
|---|---|---|
| `GET /api/appointments/me` | List of StaffAppointment for current staff | Paginated, with billing summaries |
| `GET /api/appointments/:id` | Single StaffAppointment | With patient, staff, schedule |
| `GET /api/workflow/appointment/:appointmentId/context` | WorkflowContext | Full context for workflow panel |
| `GET /api/workflow/timeline?appointment_id=X` | MedicalHistoryLog[] | Timeline for an appointment |
| `GET /api/follow-ups` | EncounterFollowUp[] | Follow-up management |
| `GET /api/follow-ups/:id` | Single EncounterFollowUp | With attempts |
| `GET /api/follow-ups/schedule/:scheduleId` | EncounterFollowUp | Lookup by schedule |
| `NEW: GET /api/workflow/:appointmentId/follow-up-context` | FollowUpContext | Phase 2.4.3 — Follow-up continuity |

---

## 8. Which Services Should Remain Untouched

Per the requirements, these must NOT be modified:

| Service | Reason |
|---|---|
| `patientScheduleService.js` | Scheduling logic must remain untouched |
| `encounterCompletionService.js` | Encounter completion must remain unchanged |
| `clinicalRuleEngineService.js` | Validation engine must remain unchanged |
| `encounterFollowUpService.js` | Core follow-up service — already complete, needs no changes |
| `notificationService.js` | Notification infrastructure stable |
| `timelineEventService.js` | Timeline infrastructure stable |
| `auditService.js` | Audit infrastructure stable |
| `cashierPaymentService.js` | Billing must remain untouched |
| `medicalWorkflowService.js` | Workflow engine must remain untouched |

---

## 9. Which Components Should Be Extended Instead of Replaced

| Component | Extension Strategy |
|---|---|
| `AppointmentWorkflowPanel.tsx` | **Add follow-up context query + clinical handover card rendering** (not replace entire component) |
| `medicalWorkflowApi.ts` | **Add new endpoint for follow-up context** (add to existing API slice) |
| `medicalWorkflowController.js` | **Add `getFollowUpContext` handler** (already exists in Phase 2.4.2 stubs) |
| `medicalWorkflowRoutes.js` | **Add route** (already exists in Phase 2.4.2 stubs) |
| `baseApi.ts` | **Already has "FollowUp" tag type** — no changes needed |

---

## 10. Backward Compatibility Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Existing encounters show follow-up UI** | Medium | Check `is_follow_up` flag; only render handover when true |
| **New API endpoint conflicts** | Low | Route `/:appointmentId/follow-up-context` is unique, no conflict with existing `/appointment/:appointmentId/context` |
| **Timeline event duplication** | High | The `FOLLOW_UP_CONTEXT_OPENED` must emit only once — use a guard check (boolean state, or check if event already exists) |
| **Performance impact on non-follow-up encounters** | Low | Follow-up context is loaded via separate query; non-follow-up encounters skip it entirely |
| **N+1 queries in follow-up context** | Medium | The existing `followUpContinuityService.getFollowUpContext()` already uses eager loading where possible; must audit for N+1 |
| **Race condition with autoCompleteFollowUp** | Medium | If the clinician opens the workflow very quickly after admission, the follow-up may still be completing. The continuity service needs to handle the case where the follow-up may still be in SCHEDULED state |

---

## 11. Current Phase 2.4.3 Implementation Status

Files that already exist from previous phases or stubs:

| File | Status | Notes |
|---|---|---|
| `backend/services/followUpContinuityService.js` | **EXISTS** | Full implementation of `getFollowUpContext()` |
| `backend/controllers/workflow/medicalWorkflowController.js` | **HAS `getFollowUpContext`** | Already implemented with timeline event + audit |
| `backend/routers/workflow/medicalWorkflowRoutes.js` | **HAS route** | `GET /:appointmentId/follow-up-context` |
| `frontend/src/redux/api/medicalWorkflowApi.ts` | **Missing endpoint** | Need to add `getFollowUpContext` query |
| `frontend/src/features/medical-workflow/AppointmentWorkflowPanel.tsx` | **No integration** | Need to add follow-up context loading and handover display |
| `frontend/src/features/medical-workflow/components/FollowUpClinicalHandover.tsx` | **DOES NOT EXIST** | Need to create |

---

## 12. Implementation Plan

### Phase 2.4.3 Tasks

#### Task 1: Fix Backend Continuity Service (if needed)

- [ ] Review `followUpContinuityService.js` for N+1 queries
- [ ] Add eager loading for the schedule → attempt → followUp chain
- [ ] Handle edge case where follow-up is still SCHEDULED (not yet auto-completed)

#### Task 2: Frontend Redux API

- [ ] Add `getFollowUpContext` query to `medicalWorkflowApi.ts`
- [ ] Add `FollowUpContext` type definition
- [ ] Export `useGetFollowUpContextQuery` hook

#### Task 3: Create FollowUpClinicalHandover Component

- [ ] Create `frontend/src/features/medical-workflow/components/FollowUpClinicalHandover.tsx`
- [ ] Design clinical card showing:
  - Header: "FOLLOW-UP VISIT" with priority badge
  - Previous Provider info
  - Recommended By info
  - Recommendation Date
  - Priority
  - Reason
  - Clinical Instructions
  - Expected Review Date
  - Previous Diagnosis summary
  - Previous Prescriptions summary
  - Previous Clinical Notes
  - Attempt #
  - "Open Previous Encounter" button
  - "View Follow-up History" button

#### Task 4: Integrate into AppointmentWorkflowPanel

- [ ] Import and use `useGetFollowUpContextQuery` in `AppointmentWorkflowPanel.tsx`
- [ ] Add follow-up context loading after main context loads
- [ ] Render `FollowUpClinicalHandover` if `is_follow_up === true`
- [ ] Ensure handover is dismissible (reducible)
- [ ] No UI changes for non-follow-up encounters

#### Task 5: Previous Encounter Navigation

- [ ] "Open Previous Encounter" should navigate to `/appointments/${origin_encounter_id}`
- [ ] This uses existing timeline infrastructure — no new timeline logic required

#### Task 6: Timeline Event

- [ ] The controller already emits `FOLLOW_UP_CONTEXT_OPENED` in `getFollowUpContext`
- [ ] Ensure it only emits once per appointment open (handled by React: the query refetches but the timeline event should be idempotent)
- [ ] Add the `FOLLOW_UP_CONTEXT_OPENED` type to the timeline event types if not already registered

#### Task 7: Audit

- [ ] The controller already records `follow_up_context_viewed` audit event
- [ ] Verify it includes `appointment_id`, `follow_up_id`, `viewer`, `timestamp`

#### Task 8: Tests

Add tests covering:
- [ ] Regular encounter returns `is_follow_up: false`
- [ ] Follow-up encounter returns full DTO
- [ ] Previous provider resolved correctly
- [ ] Previous diagnosis summary resolved
- [ ] Previous prescriptions summary resolved
- [ ] Previous notes resolved
- [ ] Previous timeline accessible
- [ ] Previous encounter navigation works
- [ ] Audit emitted on context view
- [ ] Timeline event emitted once
- [ ] Non-follow-up encounters unaffected

---

## 13. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLINICIAN OPENS ENCOUNTER                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  AppointmentWorkflowPanel mounts                                │
│  appointmentId = "encounter-B-uuid"                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ├──────────────────────────────────────┐
                            ▼                                      ▼
              ┌─────────────────────────┐       ┌──────────────────────────────┐
              │ GET /api/workflow/       │       │ GET /api/workflow/           │
              │   appointment/:id/context│       │   :appointmentId/            │
              │                         │       │   follow-up-context          │
              │ Returns WorkflowContext  │       │                              │
              │ (appointment, timeline,  │       │ Checks schedule → attempt    │
              │  form, billing, etc.)    │       │ → followUp → original        │
              └──────────┬──────────────┘       │ encounter                    │
                         │                      │                              │
                         │                      │ Returns FollowUpContinuityDTO│
                         │                      │ OR { is_follow_up: false }   │
                         │                      └──────────┬───────────────────┘
                         │                                 │
                         ▼                                 ▼
              ┌─────────────────────────┐       ┌──────────────────────────────┐
              │ Render GlobalWorkflow   │       │ is_follow_up?               │
              │ Actions + Timeline +    │       │                              │
              │ Form + Billing          │       │ YES → Show ClinicalHandover │
              │                         │       │ NO → Continue normally       │
              └─────────────────────────┘       └──────────────────────────────┘
```

---

## 14. DTO Schema (Already Defined)

```typescript
interface FollowUpContinuityDTO {
  // Follow-up detection
  is_follow_up: boolean;
  
  // Identifiers
  follow_up_id?: string;
  origin_encounter_id?: string;
  current_encounter_id?: string;
  
  // Provider info
  previous_provider?: { user_id: string; full_name: string } | null;
  recommended_by?: { user_id: string; full_name: string } | null;
  
  // Follow-up details
  recommendation_date?: string;
  reason?: string;
  clinical_instructions?: string | null;
  expected_review_date?: string | null;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  
  // Previous encounter data
  previous_diagnosis?: Array<{
    log_id: string;
    header_title: string;
    created_at: string;
    provider_name: string;
    form_summary: string | null;
  }>;
  previous_prescriptions?: Array<{
    prescription_id: string;
    template_name: string | null;
    category_name: string | null;
    items_summary: string | null;
    prescriber_name: string | null;
    issued_at: string;
    header_title: string | null;
  }>;
  previous_notes?: Array<{
    log_id: string;
    header_title: string;
    notes: string;
    created_at: string;
    provider_name: string;
  }>;
  
  // Timeline summary
  previous_timeline_summary?: {
    total_logs: number;
    action_types: string[];
    last_action: string | null;
    last_action_at: string | null;
  };
  
  // Follow-up status
  follow_up_status?: string;
  attempt_number?: number;
  attempt_status?: string;
}
```

---

## 15. Files to Create

| File | Purpose |
|---|---|
| `frontend/src/features/medical-workflow/components/FollowUpClinicalHandover.tsx` | Clinical handover UI card |

## 16. Files to Modify

| File | Changes |
|---|---|
| `frontend/src/redux/api/medicalWorkflowApi.ts` | Add `getFollowUpContext` query + `FollowUpContext` type |
| `frontend/src/features/medical-workflow/AppointmentWorkflowPanel.tsx` | Add follow-up context loading + handover rendering |

## 17. Files Already Complete (No Changes Needed)

| File | Status |
|---|---|
| `backend/services/followUpContinuityService.js` | Complete (review needed for N+1) |
| `backend/controllers/workflow/medicalWorkflowController.js` | Complete |
| `backend/routers/workflow/medicalWorkflowRoutes.js` | Complete |
| `backend/services/encounterFollowUpService.js` | No changes needed |
| `backend/services/appointmentService.js` | No changes needed |
| `backend/services/patientScheduleService.js` | No changes needed |
| `backend/models/clinical/encounterFollowUp.js` | No changes needed |
| `backend/models/clinical/encounterFollowUpAttempt.js` | No changes needed |
| `backend/app.js` | No changes needed |
| `frontend/src/redux/baseApi.ts` | No changes needed (already has "FollowUp" tag) |
| `frontend/src/features/medical-workflow/components/GlobalWorkflowActions.tsx` | No changes needed |

---

## 18. Performance Considerations

1. **Follow-up context query is read-only** — no data mutations, safe for concurrent requests
2. **Eager loading** — the `followUpContinuityService` loads everything in 3-5 queries:
   - 1 query: StaffAppointment (current encounter)
   - 1 query: EncounterFollowUpAttempt + EncounterFollowUp (finds the follow-up)
   - 1 query: StaffAppointment (original encounter with provider)
   - 1 query: User (recommender)
   - 1 query: MedicalHistoryLog (previous clinical entries)
   - 1 query: Prescription (previous prescriptions, if model exists)
3. **No N+1** — all queries use `findAll` or `findByPk` with includes
4. **Caching** — RTK Query will cache the result per `appointmentId`; refetch only on remount
5. **Non-follow-up encounters are O(1)** — just 2 queries (current encounter + attempt lookup) before returning `{ is_follow_up: false }`

---

## 19. Remaining Work for Phase 2.4.4

After this phase is complete:
1. Follow-up series/multi-appointment support (e.g., physio 3x/week for 6 weeks)
2. Follow-up compliance dashboard widgets
3. Follow-up notifications for overdue/missed appointments
4. Patient portal: recommended follow-ups visibility
5. Visit type classification (controlled vocabulary for appointment_type)
6. Follow-up clinical rules in the clinical rule engine
7. Reception follow-up queue in the main dashboard