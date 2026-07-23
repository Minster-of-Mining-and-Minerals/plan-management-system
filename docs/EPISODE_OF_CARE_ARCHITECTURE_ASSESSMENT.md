# Episode of Care / Clinical Continuity — Architecture Assessment

## Based on Actual NovaCure Codebase (July 2026)

---

## 1. Current Encounter Model Assessment

### 1.1 How StaffAppointment Represents an Encounter

The `StaffAppointment` model (`backend/models/scheduling/staffAppointment.js`) is a thin record with these fields:

```javascript
{
  appointment_id: UUID,          // Primary key
  schedule_id: UUID,             // FK → PatientSchedule (unique, 1:1)
  patient_id: UUID,              // FK → User (the patient)
  assigned_staff_id: UUID,       // FK → User (the clinician who "owns" the visit)
  admitted_by: UUID,             // FK → User (who checked the patient in)
  admitted_at: DATE,             // Timestamp of check-in
  status: "admitted",            // String: admitted | completed | cancelled
  workflow_status: "active",     // String: active | completed
  workflow_completed_at: DATE,   // When workflow was completed
  notes: TEXT,                   // Free text
  created_at, updated_at         // Timestamps
}
```

**Key characteristics:**
- 1:1 relationship with `PatientSchedule` — an encounter IS an admitted schedule
- No concept of "episode," "care program," or "treatment course"
- No linking between encounters (no `previous_encounter_id`, no `episode_id`)
- No clinical data stored directly — all clinical data lives in `MedicalHistoryLog` (the timeline)
- `workflow_status` is the primary lifecycle field; `status` is largely vestigial

### 1.2 How Encounters Are Created

**Call chain:**
```
PATCH /api/schedules/:id { status: "admitted" }
  → patientScheduleService.updateSchedule()
    → appointmentService.syncFromScheduleAdmission()
      → Creates StaffAppointment (if not exists)
      → Attempts autoCompleteFollowUp() if schedule linked to follow-up
```

The encounter is created as a **side effect** of schedule admission. There is no direct "create encounter" API. The `PatientSchedule` must exist first.

### 1.3 How Encounters Are Completed

**Two paths:**

**Path A — Legacy workflow submit:**
```
POST /api/workflow/submit { action_type: "complete" }
  → medicalWorkflowService.submitWorkflowEntry()
    → Creates MedicalHistoryLog with status "completed"
    → Updates StaffAppointment: workflow_status = "completed"
    → Cancels all pending WorkflowTask entries
```

**Path B — Validation Engine (current primary):**
```
GET  /api/workflow/appointment/:id/validate-completion  (validate)
POST /api/workflow/appointment/:id/execute-completion    (execute)
  → encounterCompletionService.executeCompletion()
    → Evaluates ENCOUNTER_COMPLETE rules via clinicalRuleEngineService
    → Updates StaffAppointment: workflow_status = "completed", workflow_completed_at = now
    → Cancels all pending WorkflowTask entries
```

**Critical:** Neither path emits a timeline event for encounter completion. Neither path creates a `MedicalHistoryLog` in the Validation Engine path. Neither path updates or closes any `EncounterFollowUp` records (aside from the follow-up table itself).

### 1.4 What Data Belongs to an Encounter

| Data Category | Storage Location | Access Pattern |
|--------------|-----------------|----------------|
| Patient identity | `StaffAppointment.patient_id` | Direct FK |
| Assigned clinician | `StaffAppointment.assigned_staff_id` | Direct FK |
| Appointment time | `PatientSchedule` (linked via schedule_id) | Through schedule relationship |
| Clinical notes/forms | `MedicalHistoryLog` rows with `appointment_id` | Timeline query |
| Diagnosis data | `MedicalHistoryLog.form_data` (JSON) | Embedded in form submissions |
| Prescriptions | `Prescription` with `appointment_id` | Separate model query |
| Lab orders | `MedicalHistoryLog` with header_title containing "LabOrder" | String matching in logs |
| Billing | `AppointmentBillingAccount` with `appointment_id` | Separate model |
| Collection requests | `BillingCollectionRequest` with `appointment_id` | Separate model |
| Workflow tasks | `WorkflowTask` with `appointment_id` | Separate model |
| Follow-up records | `EncounterFollowUp.appointment_id` | Links OUT from encounter |
| Timeline events | `TimelineEvent` with `appointment_id` | Event store |

**Observation:** All clinical data is **loosely coupled** via `appointment_id` FK. There is no aggregate root or bounded context.

---

## 2. Current Patient Continuity Assessment

### 2.1 Does the system support linking multiple encounters together?

**NO.** There is no database-level linking between encounters. The only bridge is `EncounterFollowUp`:

```
Encounter A (appointment_id = "A")
    ↓
EncounterFollowUp.appointment_id = "A" (origin)
EncounterFollowUp.completed_encounter_id = "B" (resolution)
    ↓
Encounter B (appointment_id = "B")
```

This is a **one-directional, one-hop link** from A → B. There is no:
- `previous_encounter_id` on StaffAppointment
- `episode_id` grouping encounters
- Patient-level encounter chain/sequence number
- Bidirectional linking

### 2.2 Does the system track a patient's treatment journey?

**PARTIALLY.** The patient's journey can be reconstructed by:
1. Querying all `StaffAppointment` rows for a `patient_id` → get all encounters
2. Querying all `EncounterFollowUp` rows for a `patient_id` → get all follow-up links
3. Querying all `TimelineEvent` rows for a `patient_id` → get all events

But this reconstruction is **manual and ad-hoc**. There is no API, service, or model that presents "this patient's treatment history" as a coherent concept. The patient portal does show appointments, but these are individual schedule views, not an integrated episode view.

### 2.3 Does the system track disease/problem-based care?

**NO.** There is no model for:
- Problem list (active/past medical problems)
- Diagnosis coding (ICD codes, SNOMED)
- Problem-encounter linkage (which encounter addressed which problem)
- Problem status tracking (resolved, ongoing, chronic)

Diagnosis data is **embedded in `MedicalHistoryLog.form_data` as unstructured JSON**. It cannot be queried by diagnosis code, type, or status.

### 2.4 Does the system track follow-up chains?

**PARTIALLY.** The `EncounterFollowUp` model supports a single hop:
```
Encounter A → Follow-up → Encounter B
```

But there is **no chaining**. If Encounter B also recommends a follow-up, that's a separate `EncounterFollowUp` record with no connection to the first one. The chain:

```
Encounter A → Follow-up 1 → Encounter B → Follow-up 2 → Encounter C
```

...is stored as two independent `EncounterFollowUp` records. There is no:
- `parent_follow_up_id` or `previous_follow_up_id`
- Encounter sequence numbering
- Follow-up tree/flattened chain visualization

### 2.5 Does the system carry clinical context between encounters?

**NO.** Each encounter starts with a **blank slate**:
- No previous diagnoses carried forward
- No previous medications carried forward
- No previous clinical notes visible by default
- No previous treatment plan carried forward
- No previous investigations accessible inline

The clinician must manually review the timeline (via `GET /api/workflow/timeline`) to see past encounter data. There is no automatic context inheritance.

### Identified Gaps Summary

| Capability | Status | Impact |
|-----------|--------|--------|
| Encounter linking | Missing | Cannot trace care pathway |
| Episode grouping | Missing | No multi-encounter treatment tracking |
| Problem/disease tracking | Missing | No ICD coding, no problem list |
| Follow-up chaining | Partial | Single hop only, no chain visualization |
| Clinical context carry-over | Missing | Each encounter is a silo |
| Patient-level treatment status | Missing | No "active treatment" vs "discharged" flag |
| Cross-encounter billing | Missing | Each encounter billed independently |
| Outcome measurement | Missing | No link between follow-up reason and resolution |
| Care team continuity | Missing | Assigned staff can change between encounters |

---

## 3. Follow-up Relationship Analysis

### 3.1 Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FOLLOW-UP RELATIONSHIP                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Encounter A (appointment_id = "A")                         │
│    ├── patient_id, assigned_staff_id, workflow_status        │
│    ├── MedicalHistoryLogs (clinical data for A)              │
│    ├── AppointmentBillingAccount (billing for A)             │
│    └── EncounterFollowUp (origin)                            │
│          ├── follow_up_id                                    │
│          ├── appointment_id = "A"  ──── origin               │
│          ├── recommended_by = Dr. X                          │
│          ├── reason = "Cataract follow-up"                   │
│          ├── status = "COMPLETED"                            │
│          ├── completed_encounter_id = "B"                    │
│          └── completion_notes = "Auto-completed..."          │
│                │                                             │
│                ▼                                             │
│  EncounterFollowUpAttempt                                    │
│    ├── attempt_id                                            │
│    ├── follow_up_id ───────► EncounterFollowUp               │
│    ├── schedule_id ────────► PatientSchedule #2              │
│    ├── status = "ATTENDED"                                   │
│    └── attended_at                                           │
│                │                                             │
│                ▼                                             │
│  PatientSchedule #2                                          │
│    ├── schedule_id                                           │
│    ├── patient_id                                            │
│    ├── assigned_staff_id = Dr. Y                             │
│    ├── appointment_type = "Follow-up visit"                  │
│    └── status = "admitted"                                   │
│                │                                             │
│                ▼                                             │
│  Encounter B (appointment_id = "B")                          │
│    ├── patient_id (same patient)                             │
│    ├── assigned_staff_id = Dr. Y (MAY BE DIFFERENT)         │
│    ├── schedule_id = PatientSchedule #2                      │
│    └── workflow_status = "active" (starts fresh)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 What Information Is Preserved

| Information | Preserved? | Where |
|-------------|-----------|-------|
| That a follow-up was needed | YES | `EncounterFollowUp.reason` |
| Who recommended it | YES | `EncounterFollowUp.recommended_by` |
| The originating encounter | YES | `EncounterFollowUp.appointment_id` |
| The resolving encounter | YES | `EncounterFollowUp.completed_encounter_id` |
| The schedule that created the new encounter | YES | `EncounterFollowUpAttempt.schedule_id` |
| Clinical instructions for follow-up | YES | `EncounterFollowUp.clinical_instructions` |
| Priority/urgency | YES | `EncounterFollowUp.priority` |
| When the attempt was made | YES | `EncounterFollowUpAttempt.attended_at` |

### 3.3 What Information Is Lost

| Information | Lost? | Impact |
|-------------|-------|--------|
| Previous diagnoses from Encounter A | YES | Encounter B starts with no diagnosis context |
| Previous medications from Encounter A | YES | No auto-population of repeat prescriptions |
| Previous clinical notes | PARTIALLY | Accessible via timeline but not inline |
| Previous billing/billing balance | YES | Brand new billing account for Encounter B |
| Previous assigned staff | YES | Dr. Y may differ from Dr. X with no transition note |
| Previous workflow state | YES | New workflow starts at "active" |
| Previous lab results | YES | Not carried forward automatically |
| Whether the follow-up reason was resolved | PARTIALLY | `completion_notes` is free text, not structured |
| Follow-up chain history | YES | No link from Follow-up 1 to Follow-up 2 |
| Care plan continuity | YES | No treatment plan model exists |
| Condition status (worsened, improved, resolved) | YES | No outcome tracking |

### 3.4 Is Follow-up Enough to Represent Continuity of Care?

**NO.** The current follow-up model has these fundamental limitations:

1. **Single hop only**: Cannot represent `Encounter A → Follow-up → Encounter B → Follow-up → Encounter C`
2. **No condition linkage**: The `reason` field is free text; cannot group follow-ups by condition
3. **No outcome measurement**: Cannot determine if the follow-up resolved the original concern
4. **No multi-encounter episode**: Cannot group a patient's cataract surgery journey (pre-op visit + surgery + follow-up 1 + follow-up 2) into one episode
5. **No shared clinical context**: Each encounter is informationally isolated
6. **No problem list integration**: Multiple follow-ups for different problems cannot be distinguished
7. **No temporal tracking**: No concept of "expected duration of treatment" or "care plan timeline"
8. **No care team coordination**: Different clinicians may see the patient with no coordination mechanism

---

## 4. Episode of Care — Design Analysis

### 4.1 Proposed EpisodeOfCare Model

```javascript
// New model: EpisodeOfCare
{
  episode_id: UUID,                  // Primary key
  patient_id: UUID,                  // FK → User (patient)
  status: ENUM,                      // "PLANNED" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED"
  type: ENUM,                        // "CONSULTATION" | "SURGERY" | "CHRONIC_DISEASE" | "MATERNITY" | ...
  diagnosis_code: STRING,            // ICD-10 or facility-specific code
  diagnosis_description: TEXT,       // Description of the condition
  clinical_impression: TEXT,         // Overall assessment
  treatment_goal: TEXT,              // What the episode aims to achieve
  start_date: DATEONLY,              // When the episode began
  expected_end_date: DATEONLY,       // Projected end date
  actual_end_date: DATEONLY,         // When the episode actually ended
  primary_clinician_id: UUID,        // FK → User (responsible clinician)
  department_id: UUID,               // FK → Department
  referral_source: STRING,           // "SELF" | "REFERRAL" | "TRANSFER" | "FOLLOW_UP"
  referral_notes: TEXT,              // Referral details
  outcome: TEXT,                     // Outcome of the episode
  metadata: JSONB,                   // Flexible extension
  created_by: UUID,
  updated_by: UUID,
  deleted_at: DATE,
  created_at, updated_at
}
```

### 4.2 Required Database Relationships

```
Patient (User)
    │
    │ 1:N
    ▼
EpisodeOfCare
    │
    │ 1:N
    ├──────────────────────┬──────────────────┬──────────────────┐
    │                      │                  │                  │
    ▼                      ▼                  ▼                  ▼
StaffAppointment      EncounterFollowUp   MedicalHistoryLog   Prescription
(encounters)          (follow-ups)        (shared timeline)   (shared scripts)
│                                         │                  │
│ belongs to episode                      │ belongs to       │ belongs to
│                                         │ episode          │ episode
└─────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
                                                     AppointmentBillingAccount
                                                     (billing grouped by episode
                                                      or kept per-encounter)
```

**StaffAppointment changes:**
```javascript
// Add to StaffAppointment:
episode_id: UUID,        // FK → EpisodeOfCase (nullable, allows existing appointments)
episode_sequence: INT,   // Order within episode (1, 2, 3...)
```

**EncounterFollowUp changes:**
```javascript
// Add to EncounterFollowUp:
episode_id: UUID,        // FK → EpisodeOfCase (which episode this follow-up belongs to)
parent_follow_up_id: UUID,  // FK → EncounterFollowUp (for chaining, nullable)
```

### 4.3 Required Migrations

```javascript
// Migration 1: Create episode_of_care table
"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("episode_of_cares", {
      episode_id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      patient_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "user_id" } },
      status: { type: Sequelize.ENUM("PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"), defaultValue: "ACTIVE" },
      type: { type: Sequelize.STRING(50), allowNull: true },
      diagnosis_code: { type: Sequelize.STRING(20), allowNull: true },
      diagnosis_description: { type: Sequelize.TEXT, allowNull: true },
      clinical_impression: { type: Sequelize.TEXT, allowNull: true },
      treatment_goal: { type: Sequelize.TEXT, allowNull: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      expected_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      actual_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      primary_clinician_id: { type: Sequelize.UUID, allowNull: true, references: { model: "users", key: "user_id" } },
      department_id: { type: Sequelize.UUID, allowNull: true, references: { model: "departments", key: "department_id" } },
      referral_source: { type: Sequelize.STRING(30), allowNull: true },
      referral_notes: { type: Sequelize.TEXT, allowNull: true },
      outcome: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSONB, defaultValue: {} },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    
    await queryInterface.addIndex("episode_of_cares", ["patient_id"]);
    await queryInterface.addIndex("episode_of_cares", ["status"]);
    await queryInterface.addIndex("episode_of_cares", ["primary_clinician_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("episode_of_cares");
  }
};
```

```javascript
// Migration 2: Add episode_id to StaffAppointment
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("staff_appointments", "episode_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "episode_of_cares", key: "episode_id" },
    });
    await queryInterface.addColumn("staff_appointments", "episode_sequence", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
    });
    await queryInterface.addIndex("staff_appointments", ["episode_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("staff_appointments", "episode_sequence");
    await queryInterface.removeColumn("staff_appointments", "episode_id");
  }
};
```

```javascript
// Migration 3: Add episode_id to EncounterFollowUp + parent_follow_up_id
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("encounter_follow_ups", "episode_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "episode_of_cares", key: "episode_id" },
    });
    await queryInterface.addColumn("encounter_follow_ups", "parent_follow_up_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "encounter_follow_ups", key: "follow_up_id" },
      comment: "For chaining follow-ups within an episode",
    });
    await queryInterface.addIndex("encounter_follow_ups", ["episode_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("encounter_follow_ups", "parent_follow_up_id");
    await queryInterface.removeColumn("encounter_follow_ups", "episode_id");
  }
};
```

### 4.4 Required Services

**`EpisodeOfCareService`** — New service:

| Method | Purpose |
|--------|---------|
| `createEpisode(data, options)` | Create a new episode linked to patient |
| `getEpisode(episodeId)` | Get episode with all encounters and follow-ups |
| `listPatientEpisodes(patientId, filters)` | List episodes for a patient |
| `updateEpisode(episodeId, data, options)` | Update episode fields |
| `completeEpisode(episodeId, outcome, options)` | Set status to COMPLETED, record outcome |
| `addEncounterToEpisode(episodeId, encounterId, sequence)` | Link an encounter to an episode |
| `removeEncounterFromEpisode(encounterId)` | Unlink encounter from episode |
| `getEpisodeTimeline(episodeId)` | Get all timeline events for all encounters in episode |
| `getEpisodeClinicalSummary(episodeId)` | Aggregated clinical data across encounters |
| `autoCreateEpisode(patientId, encounterId, options)` | Auto-create episode on first encounter admission |

**Impact on existing services:**

| Service | Required Changes |
|---------|-----------------|
| `patientScheduleService.js` | On `updateSchedule()` with `status: "admitted"`, check/create episode before calling `syncFromScheduleAdmission` |
| `appointmentService.js` | `syncFromScheduleAdmission()` should accept/use `episode_id` when creating StaffAppointment |
| `encounterFollowUpService.js` | `createFollowUp()` should auto-assign to the current episode if available. `autoCompleteFollowUp()` should pass episode context. Add support for `parent_follow_up_id` |
| `encounterCompletionService.js` | `executeCompletion()` should check if episode should be completed when last encounter in episode is completed |
| `medicalWorkflowService.js` | Timeline retrieval should optionally filter/scope by `episode_id` |

### 4.5 Required APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/episodes` | Create episode |
| GET | `/api/episodes/:id` | Get episode details |
| GET | `/api/episodes` | List episodes (with filters: patient_id, status, type) |
| PATCH | `/api/episodes/:id` | Update episode |
| POST | `/api/episodes/:id/complete` | Complete episode |
| POST | `/api/episodes/:id/link-encounter` | Link existing encounter to episode |
| GET | `/api/episodes/:id/timeline` | Episode-wide timeline |
| GET | `/api/episodes/:id/summary` | Clinical summary across encounters |
| GET | `/api/patients/:id/episodes` | Patient's episodes |
| GET | `/api/patients/:id/active-episode` | Current active episode |

**Impact on existing APIs:**

| Current API | Change |
|-------------|--------|
| `POST /api/appointments` (implicit via schedule admit) | Accept optional `episode_id` parameter |
| `POST /api/follow-ups` | Auto-link to current episode |
| `GET /api/workflow/timeline` | Add optional `episode_id` filter |
| `POST /api/appointment-billing` | Add optional `episode_id` for episode-level billing views |
| `GET /api/patients/:id` | Include active episode info |

### 4.6 Required RBAC

New permissions:

| Permission | Resource | Action | Purpose |
|-----------|----------|--------|---------|
| `EPISODE:CREATE` | Episode | create | Create new episodes |
| `EPISODE:READ` | Episode | read | View episode details |
| `EPISODE:UPDATE` | Episode | update | Update episode fields |
| `EPISODE:COMPLETE` | Episode | complete | Complete/close episodes |
| `EPISODE:LINK_ENCOUNTER` | Episode | link | Link encounters to episodes |

Default role mapping:

| Role | Permissions |
|------|------------|
| Doctor / Clinician | `EPISODE:CREATE, READ, UPDATE, COMPLETE, LINK_ENCOUNTER` |
| Nurse | `EPISODE:CREATE, READ, UPDATE, LINK_ENCOUNTER` |
| Reception / Admin | `EPISODE:READ, LINK_ENCOUNTER` |
| Cashier | `EPISODE:READ` (for billing context) |

### 4.7 Timeline Integration

**New timeline event types for episodes:**

| Event | Trigger |
|-------|---------|
| `EPISODE_CREATED` | Episode created |
| `EPISODE_UPDATED` | Episode details changed |
| `EPISODE_ENCOUNTER_ADDED` | Encounter linked to episode |
| `EPISODE_FOLLOW_UP_PLANNED` | Follow-up created within episode |
| `EPISODE_COMPLETED` | Episode completed |
| `EPISODE_CANCELLED` | Episode cancelled |

**TimelineEvent model already supports this** — it has `patient_id`, `appointment_id`, `event_type`, `resource_type`, `resource_id`, and `metadata` fields. No migration needed for timeline storage.

The `resource_type` field can be set to `"EpisodeOfCare"` and `resource_id` to the episode ID.

### 4.8 Audit Requirements

New audit event types:

| Audit Action | Resource | Meaning |
|-------------|----------|---------|
| "Episode of Care Created" | `EpisodeOfCare` | Episode record created |
| "Episode of Care Updated" | `EpisodeOfCare` | Fields modified |
| "Episode of Care Completed" | `EpisodeOfCare` | Episode closed |
| "Episode of Care Cancelled" | `EpisodeOfCare` | Episode cancelled |
| "Encounter Linked to Episode" | `StaffAppointment` | Encounter assigned to episode |
| "Episode Follow-up Created" | `EncounterFollowUp` | Follow-up within episode |
| "Episode Clinical Summary Viewed" | `EpisodeOfCare` | Audit for PHI access |

---

## 5. Clinical Context Continuity

### 5.1 Categories of Information

#### A) Automatically Inherited Information

These should flow from the previous encounter to the new encounter **without clinician action**:

| Information | Source | Target Storage | Mechanism |
|-------------|--------|---------------|-----------|
| Patient demographics | User/PatientProfile | Already available | Already inherited |
| Active diagnoses from episode | EpisodeOfCare.diagnosis_code | In-memory context | Episode query on admission |
| Active problem list | EpisodeOfCare (extended) | In-memory context | Episode query on admission |
| Allergies | PatientAllergy | Already available | Already queried during prescribing |
| Episode type and goals | EpisodeOfCare | In-memory context | Episode query on admission |
| Clinician assignments | EpisodeOfCare.primary_clinician_id | In-memory context | Episode query on admission |
| Previous follow-up reason | EncounterFollowUp.reason | Displayed on new encounter | Follow-up link on admission |

#### B) Information Shown Only as Reference

These should be visible but **not auto-populated** into the new encounter:

| Information | How to Display |
|-------------|---------------|
| Previous encounter's clinical notes | Episode timeline view |
| Previous encounter's diagnosis form data | Episode timeline view (with formSchema for rendering) |
| Previous prescriptions | Episode medication history view |
| Previous lab/investigation results | Episode timeline view |
| Previous billing summary | Episode financial summary |
| Previous encounter's assigned staff | Episode timeline metadata |
| Follow-up chain (all previous follow-ups) | Episode follow-up tree view |
| Previous Vitals | Episode vitals timeline |

#### C) Information Requiring Clinician Confirmation

These should be **explicitly reviewed and confirmed** by the clinician:

| Information | Confirmation Mechanism | Why |
|-------------|----------------------|-----|
| Carry-over of previous diagnosis | Checkbox: "Carry forward diagnosis?" | Condition may have resolved |
| Repeat prescription | "Repeat previous prescription" button | Dosage may need adjustment |
| Continuing treatment plan | "Continue previous plan" option | Plan may need modification |
