# Phase 2.4.4 — Follow-up Clinical Resolution Engine: Architecture & Implementation Plan

**Date**: 2026-07-23
**Author**: Lead Clinical Architect
**Status**: Pre-implementation Proposal — Awaiting Review
**Prerequisites**: Phase 2.4.1 (Foundation) + Phase 2.4.2 (Scheduling) + Phase 2.4.3 (Continuity) complete

---

## Executive Summary

Phase 2.4.3 introduced the **Clinical Handover** layer — the clinician now sees *why* the patient returned. Phase 2.4.4 closes the clinical loop: the clinician must **record what happened** as a result of the follow-up, creating a formal clinical resolution that links the original recommendation to its outcome.

This phase also introduces **Follow-up Chaining** — if the clinician determines during the follow-up encounter that *another* follow-up is needed, the new recommendation creates a linked chain rather than an isolated record.

---

## Table of Contents

1. Current State Analysis
2. Data Model
3. State Transitions
4. API Endpoints
5. Services
6. Validation & Clinical Rules
7. UI Changes
8. Timeline Integration
9. Audit Integration
10. Analytics Considerations
11. Migration Strategy
12. Backward Compatibility
13. RBAC Requirements
14. Implementation Plan

---

## 1. Current State Analysis

### 1.1 Existing EncounterFollowUp Model

```
EncounterFollowUp
  ├── follow_up_id (PK)
  ├── patient_id
  ├── appointment_id (original encounter that created follow-up)
  ├── recommended_by
  ├── reason
  ├── clinical_instructions
  ├── priority
  ├── recommended_date
  ├── target_date
  ├── status: RECOMMENDED → PENDING_SCHEDULING → SCHEDULED → COMPLETED/CANCELLED/EXPIRED/MISSED
  ├── completion_notes (TEXT, free-form — insufficient)
  ├── completed_encounter_id (FK → StaffAppointment)
  ├── cancel_reason
  ├── metadata (JSONB)
  └── attempts[] → EncounterFollowUpAttempt
```

**Problem**: `completion_notes` is a single free-text field with no structure. There is no:
- Outcome classification (RESOLVED, PARTIALLY_RESOLVED, REFERRED, ONGOING, etc.)
- Outcome summary
- Residual symptoms/conditions
- Provider who assessed the outcome
- Outcome date
- Link to the clinical workflow entry that documented the outcome
- Ability to query "Which follow-ups were resolved vs still ongoing?"

### 1.2 Existing Follow-up to Encounter Link

Currently, when `autoCompleteFollowUp()` runs:
1. `EncounterFollowUpAttempt.status` → `ATTENDED`
2. `EncounterFollowUp.status` → `COMPLETED`
3. `EncounterFollowUp.completed_encounter_id` → new appointment

**But there is no record of the clinical outcome of the follow-up.** The clinician's work (diagnosis, prescriptions, notes) is recorded in `MedicalHistoryLog` under the new encounter, but there is no formal linkage saying "this encounter resolved the original follow-up reason."

### 1.3 Follow-up Chaining Gap

When a clinician sees a follow-up patient and determines they need *another* follow-up, the current system creates a completely new `EncounterFollowUp` record with no link to the originating one. This means:
- You cannot trace a care chain: FU#1 → FU#2 → FU#3
- No concept of "follow-up series"
- Cannot report on follow-up adherence across multiple related encounters

### 1.4 Encounter Completion Engine

The `EncounterCompletionService` already:
- Validates completion readiness using `ENCOUNTER_COMPLETE` clinical rules
- Checks: pending tasks, lab orders, prescriptions, diagnosis, unpaid balance, follow-up required
- Executes completion by setting `workflow_status = "completed"` and `workflow_completed_at = now`

**Missing**: For follow-up encounters, there is no validation that the follow-up outcome has been recorded before allowing completion.

### 1.5 Continuity Engine (Phase 2.4.3)

`followUpContinuityService.getFollowUpContext()` returns the follow-up DTO including:
- Origin encounter data
- Previous diagnosis/prescriptions/notes
But has no field for *outcome* since none exists yet.

---

## 2. Data Model — Proposed Changes

### 2.1 Extend EncounterFollowUp (Recommended Approach)

Rather than creating a new `FollowUpOutcome` model, extend `EncounterFollowUp` with structured outcome fields. This avoids:
- Additional JOIN complexity
- Duplicate lifecycle management
- Schema fragmentation for a one-to-one relationship

**New columns to add to `encounter_follow_ups` table:**

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `outcome` | ENUM | No | NULL | RESOLVED, PARTIALLY_RESOLVED, UNCHANGED, WORSENED, REFERRED, ONGOING, LOST_TO_FOLLOWUP, DECEASED |
| `outcome_summary` | TEXT | No | NULL | Free-text clinical summary of the follow-up outcome |
| `outcome_assessed_by` | UUID (FK → User) | No | NULL | The clinician who assessed the outcome |
| `outcome_assessed_at` | DATE | No | NULL | When the outcome was assessed |
| `outcome_log_id` | UUID (FK → MedicalHistoryLog) | No | NULL | Link to the clinical workflow entry containing the outcome documentation |
| `residual_conditions` | TEXT | No | NULL | Conditions remaining after the follow-up |
| `follow_up_chain_id` | UUID | No | NULL | Groups sequential follow-ups into a chain |
| `chain_sequence` | INTEGER | No | NULL | Position in the follow-up chain (1, 2, 3...) |
| `parent_follow_up_id` | UUID (FK → self) | No | NULL | The previous follow-up in the chain |
| `child_follow_up_id` | UUID (FK → self) | No | NULL | The next follow-up in the chain |

### 2.2 Outcome Enum Values

```
RESOLVED              → The original reason for follow-up is fully addressed
PARTIALLY_RESOLVED    → The reason is partially addressed but requires monitoring
UNCHANGED             → Condition is stable, same as original encounter
WORSENED              → Condition has deteriorated since original encounter
REFERRED              → Patient was referred to another specialty/facility
ONGOING               → Active treatment continues, another follow-up scheduled
LOST_TO_FOLLOWUP      → Patient did not return and outcome cannot be assessed
DECEASED              → Patient has died (critical safety outcome)
```

### 2.3 Follow-up Chain Model

A follow-up chain represents a series of related follow-ups for the same clinical condition.

```
Chain Example:
Encounter A (Initial) → FU#1 (3 months)
  ├── outcome: PARTIALLY_RESOLVED
  ├── chain_sequence: 1
  ├── child_follow_up_id → FU#2
  └── new_followup: "Return in 6 months"
      ↓
FU#2 (6 months later) → Encounter B (Follow-up)
  ├── outcome: RESOLVED
  ├── chain_sequence: 2
  ├── parent_follow_up_id → FU#1
  └── no further follow-up needed
```

### 2.4 New Status Transition

Add new status: `OUTCOME_PENDING`

When a follow-up encounter's outcome has not yet been recorded, the follow-up can be in this intermediate state before being fully resolved.

Updated status lifecycle:
```
RECOMMENDED
  ↓
PENDING_SCHEDULING
  ↓
SCHEDULED
  ↓ (patient admitted)
ATTENDED (new — replaces implicit attend via autoComplete)
  ↓
OUTCOME_PENDING (new — outcome must be recorded)
  ↓ (clinician records outcome)
COMPLETED
```

OR direct transitions:
```
SCHEDULED → OUTCOME_PENDING → COMPLETED
SCHEDULED → COMPLETED (auto-complete without outcome — backward compat)
COMPLETED → [terminal]
```

### 2.5 Consideration: New Separate Model Alternative

If extending `EncounterFollowUp` becomes too large, an alternative is a separate `EncounterFollowUpOutcome` model:

```
EncounterFollowUpOutcome
  ├── outcome_id (PK)
  ├── follow_up_id (FK → EncounterFollowUp)
  ├── encounter_id (FK → StaffAppointment — the follow-up encounter)
  ├── outcome (ENUM)
  ├── outcome_summary
  ├── assessed_by (FK → User)
  ├── assessed_at
  ├── outcome_log_id (FK → MedicalHistoryLog)
  ├── residual_conditions
  └── metadata
```

**Decision**: Prefer extending `EncounterFollowUp` for simplicity, unless the model grows beyond 8 outcome-related fields. At that point, split into a separate table.

---

## 3. State Transitions

### 3.1 Updated ALLOWED_TRANSITIONS

```javascript
const ALLOWED_TRANSITIONS = {
  RECOMMENDED: ["PENDING_SCHEDULING", "SCHEDULED", "CANCELLED", "EXPIRED"],
  PENDING_SCHEDULING: ["SCHEDULED", "CANCELLED", "EXPIRED"],
  SCHEDULED: ["OUTCOME_PENDING", "COMPLETED", "CANCELLED", "MISSED", "EXPIRED"],
  OUTCOME_PENDING: ["COMPLETED", "CANCELLED"], // Must record outcome before complete
  COMPLETED: [],  // Terminal, but could have child follow-up chained
  CANCELLED: [],
  EXPIRED: [],
  MISSED: ["SCHEDULED"], // Can reschedule
};
```

### 3.2 Auto-complete Behavior Change (Important)

Currently `autoCompleteFollowUp()` transitions directly:
- `SCHEDULED → COMPLETED` with `completion_notes = "Auto-completed on patient return"`

With Phase 2.4.4:
- `SCHEDULED → OUTCOME_PENDING` with no outcome recorded
- The follow-up stays in `OUTCOME_PENDING` until the clinician explicitly records the outcome during the encounter
- When the encounter is completed (or earlier, via an explicit action), the outcome is recorded and the follow-up transitions to `COMPLETED`

**Backward compatibility**: If `autoCompleteFollowUp()` cannot determine the outcome (because the clinician hasn't recorded it yet), it should still transition to `OUTCOME_PENDING` and the encounter completion validation should block completion if `OUTCOME_PENDING` follow-ups exist without recorded outcomes.

---

## 4. API Endpoints

### 4.1 New Endpoints

```
PATCH  /api/follow-ups/:id/outcome          → Record follow-up outcome
GET    /api/follow-ups/:id/chain            → Get follow-up chain
POST   /api/follow-ups/:id/chain            → Create follow-up chain (link to new follow-up)
DELETE /api/follow-ups/:id/chain            → Break chain linkage
```

### 4.2 Modified Endpoints

```
GET    /api/workflow/:appointmentId/follow-up-context
       → Add outcome fields to the DTO (if outcome is recorded)
```

### 4.3 New Follow-up Chain Endpoints

```
GET    /api/follow-ups/:id/chain
       → Returns the full chain: [parent_chain] + [current] + [child_chain]
       → Each item includes: follow_up_id, status, outcome, recommended_date, priority, reason

POST   /api/follow-ups/:id/chain
       → Creates a new EncounterFollowUp linked as child of :id
       → Body: { reason, clinical_instructions, priority, target_date, assigned_department_id, ... }
       → Sets follow_up_chain_id = :id's chain_id (or creates new chain_id)
       → Sets chain_sequence = parent.chain_sequence + 1
       → Returns the new follow-up record
```

### 4.4 Record Outcome Request

```json
PATCH /api/follow-ups/:id/outcome
{
  "outcome": "PARTIALLY_RESOLVED",
  "outcome_summary": "Vision improved from 6/18 to 6/9. Some residual glare remains.",
  "outcome_log_id": "uuid-of-medical-history-log",
  "residual_conditions": "Mild glare at night, requires night driving caution",
  "assessed_at": "2026-08-15"
}
```

### 4.5 Record Outcome Response

```json
{
  "success": true,
  "data": {
    "follow_up_id": "uuid",
    "outcome": "PARTIALLY_RESOLVED",
    "outcome_summary": "Vision improved from 6/18 to 6/9...",
    "outcome_assessed_by": { "user_id": "uuid", "full_name": "Dr. Smith" },
    "outcome_assessed_at": "2026-08-15",
    "status": "COMPLETED",
    "completion_notes": "Outcome: PARTIALLY_RESOLVED. Residual: Mild glare at night."
  }
}
```

---

## 5. Services

### 5.1 New Service: `followUpOutcomeService.js`

**Responsibilities**:
- Record outcome on an EncounterFollowUp
- Validate outcome data completeness
- Transition status from OUTCOME_PENDING to COMPLETED
- Handle follow-up chain creation/management
- Handle chain traversal queries
- Emit timeline events for outcome recording
- Record audit for outcome recording
- Notify relevant clinicians on outcome

**Key Methods**:

```javascript
class FollowUpOutcomeService {
  async recordOutcome(followUpId, outcomeData, options)
    // Validates outcome enum value
    // Validates the follow-up is in SCHEDULED or OUTCOME_PENDING status
    // Updates EncounterFollowUp with outcome fields
    // Transitions status to COMPLETED
    // Emits FOLLOW_UP_OUTCOME_RECORDED timeline event
    // Records audit: "Follow-up Outcome Recorded"
    // If outcome is ONGOING or REFERRED, may trigger new follow-up recommendation
    
  async createFollowUpChain(followUpId, newFollowUpData, options)
    // Creates a new EncounterFollowUp record
    // Links it as child of followUpId
    // Creates or reuses follow_up_chain_id
    // Sets chain_sequence appropriately
    // Emits FOLLOW_UP_CHAIN_CREATED timeline event
    
  async getFollowUpChain(followUpId)
    // Traverses parent_follow_up_id chain to root
    // Traverses child_follow_up_id chain to leaf
    // Returns ordered array of all chain members
    
  async getPendingOutcomes(filters)
    // Returns all follow-ups in OUTCOME_PENDING status
    // Used for reporting and dashboard widgets
    
  async validateOutcomeRequired(appointmentId)
    // Checks if the current encounter is a follow-up encounter
    // If yes, verifies outcome has been recorded
    // Returns validation result for encounter completion engine
}
```

### 5.2 Modified Service: `encounterFollowUpService.js`

**Changes**:
- `autoCompleteFollowUp()` → transition to `OUTCOME_PENDING` instead of `COMPLETED`
- `findFollowUpForAppointment()` → also check for `OUTCOME_PENDING` status
- `_getFollowUp()` → include outcome fields in default includes
- Add `recordOutcome()` delegating to `followUpOutcomeService`

### 5.3 Modified Service: `followUpContinuityService.js`

**Changes**:
- `getFollowUpContext()` → add `outcome`, `outcome_summary`, `outcome_assessed_by`, `outcome_assessed_at` to the DTO

### 5.4 Modified Service: `encounterCompletionService.js`

**Changes**:
- `_buildValidationContext()` → add check for `has_follow_up_outcome`
- Return blocking issue if encounter is a follow-up and no outcome recorded

### 5.5 Modified Service: `clinicalRuleEngineService.js`

**Changes**:
- Add new rule: **"Missing Follow-up Outcome"** for `ENCOUNTER_COMPLETE` trigger
- Severity: CRITICAL (blocking) for follow-up encounters without recorded outcome

---

## 6. Validation & Clinical Rules

### 6.1 Outcome Validation Rules

| Rule | Severity | Condition |
|------|----------|-----------|
| Outcome Required | CRITICAL | Follow-up encounter has no recorded outcome |
| Outcome Field Required | CRITICAL | outcome + outcome_summary are both empty |
| Outcome Requires Provider | CRITICAL | outcome_assessed_by is null |
| Outcome Date Required | WARNING | outcome_assessed_at is not provided |

### 6.2 New Clinical Rule

```javascript
{
  name: "Missing Follow-up Outcome",
  trigger_event: "ENCOUNTER_COMPLETE",
  severity: "CRITICAL",
  condition: "is_follow_up_encounter && !has_outcome",
  action: { block_completion: true }
}
```

### 6.3 Frontend Validation

When the clinician clicks "Complete workflow" on a follow-up encounter:
1. Validation dialog opens
2. If no outcome recorded → blocking issue: "Follow-up outcome must be recorded before completing this encounter"
3. User is directed to record the outcome first
4. If outcome recorded → pass through

---

## 7. UI Changes

### 7.1 New Component: `FollowUpOutcomeDialog.tsx`

A dialog/form that appears when:
- Clinician clicks "Record Follow-up Outcome" (new button)
- Encounter completion validation detects missing outcome

**Fields**:
- Outcome (select dropdown): RESOLVED, PARTIALLY_RESOLVED, UNCHANGED, WORSENED, REFERRED, ONGOING
- Outcome Summary (textarea, required): Clinical summary of what happened
- Residual Conditions (textarea, optional): Conditions remaining after follow-up
- Assessed Date (date, default today): When outcome was assessed
- (Auto-populated: assessed_by = current user)

**Behavior**:
- If outcome is: RESOLVED, PARTIALLY_RESOLVED, UNCHANGED, WORSENED → follow-up COMPLETED
- If outcome is: ONGOING → opens "Create New Follow-up" prompt for chaining
- If outcome is: REFERRED → allows entering referral details
- On save → PATCH `/api/follow-ups/:id/outcome`

### 7.2 New Component: `FollowUpChainView.tsx`

A panel that shows the full follow-up chain for a patient:
```
┌─────────────────────────────────────┐
│ Follow-up Chain: Diabetic Screening │
├─────────────────────────────────────┤
│ #1 Jul 2026 → PARTIALLY_RESOLVED   │
│    ↘ Re-examined, next in 6 months │
│ #2 Jan 2027 → RESOLVED             │
│    ↘ No further follow-up needed   │
└─────────────────────────────────────┘
```

### 7.3 Modified Component: `FollowUpClinicalHandover.tsx`

- Add outcome section at the bottom (if outcome exists):
  - "Previous Follow-up Outcome: RESOLVED"
  - "Outcome Summary: ..."
- Add "Record Outcome" button (if outcome not yet recorded)

### 7.4 Modified Component: `AppointmentWorkflowPanel.tsx`

- Add new action button in `GlobalWorkflowActions`:
  - "Record Follow-up Outcome" (conditionally rendered for follow-up encounters only)
- Integrate outcome validation into the completion flow:
  - Before showing validation dialog, check if outcome is recorded
  - If missing, show the outcome dialog first

### 7.5 Modified Component: `GlobalWorkflowActions.tsx`

- Add `onRecordOutcome` prop
- Render "Record Follow-up Outcome" button conditionally
- Button appears between "Prescription" and "Complete workflow"

### 7.6 Modified Component: `FollowUpManagementPage.tsx`

- Add outcome column to follow-up queue
- Filter by outcome status
- Show chain badge for chained follow-ups

---

## 8. Timeline Integration

### 8.1 New Timeline Event Types

| Event Type | Title | Description |
|------------|-------|-------------|
| `FOLLOW_UP_OUTCOME_RECORDED` | Follow-up Outcome Recorded | `Outcome: RESOLVED. Summary: ...` |
| `FOLLOW_UP_CHAIN_CREATED` | Follow-up Chain Created | `Follow-up chain #2 created from #1` |
| `FOLLOW_UP_OUTCOME_REQUIRED` | Outcome Recording Required | `Follow-up outcome must be recorded before completion` (validation event) |

### 8.2 Timeline Metadata Enhancement

```javascript
metadata: {
  outcome: "PARTIALLY_RESOLVED",
  outcome_summary: "Vision improved...",
  chain_id: "uuid-of-chain",
  chain_sequence: 2,
  has_chain: true,
}
```

---

## 9. Audit Integration

### 9.1 New Audit Actions

| Action | Resource Type | Description |
|--------|---------------|-------------|
| `Follow-up Outcome Recorded` | EncounterFollowUp | Audit trail of outcome recording |
| `Follow-up Chain Created` | EncounterFollowUp | Audit trail of chain creation |
| `Follow-up Outcome Updated` | EncounterFollowUp | If outcome is revised |

### 9.2 Audit Payload Structure

```javascript
await recordAudit(req, {
  action: "Follow-up Outcome Recorded",
  resourceType: "EncounterFollowUp",
  resourceId: followUpId,
  module: "follow-up",
  previous: { status: "SCHEDULED", outcome: null },
  next: { status: "COMPLETED", outcome: "RESOLVED" },
  extra: {
    outcome: "RESOLVED",
    assessed_by: userId,
    outcome_log_id: logId,
    has_child_follow_up: false,
  },
});
```

---

## 10. Analytics Considerations

### 10.1 Queryable Outcome Metrics

| Metric | Query |
|--------|-------|
| Follow-up resolution rate | `COUNT(*) WHERE outcome = 'RESOLVED' / COUNT(*)` |
| Outcome distribution | `GROUP BY outcome` |
| Average time to follow-up | `AVG(outcome_assessed_at - recommended_date)` |
| Chain length distribution | `MAX(chain_sequence) GROUP BY follow_up_chain_id` |
| Lost to follow-up rate | `COUNT(*) WHERE outcome = 'LOST_TO_FOLLOWUP'` |
| Referral rate | `COUNT(*) WHERE outcome = 'REFERRED'` |
| Worsening tracking | `COUNT(*) WHERE outcome = 'WORSENED'` |
| Clinician outcome patterns | `GROUP BY outcome_assessed_by` |

### 10.2 Dashboard Widgets (Future)

- **Outcome Distribution Pie Chart**: Shows % RESOLVED vs PARTIAL vs WORSENED etc.
- **Follow-up Adherence Funnel**: RECOMMENDED → SCHEDULED → ATTENDED → OUTCOME_RECORDED
- **Chain Depth Map**: Visual tree of follow-up chains
- **Clinician Outcome Report**: Per-clinician outcome patterns

---

## 11. Migration Strategy

### 11.1 Database Migration

```sql
-- New migration: 20260724000001-add-follow-up-outcome-fields.js

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("encounter_follow_ups", "outcome", {
      type: Sequelize.ENUM(
        "RESOLVED", "PARTIALLY_RESOLVED", "UNCHANGED", "WORSENED",
        "REFERRED", "ONGOING", "LOST_TO_FOLLOWUP", "DECEASED"
      ),
      allowNull: true,
    });
    await queryInterface.addColumn("encounter_follow_ups", "outcome_summary", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("encounter_follow_ups", "outcome_assessed_by", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "user_id" },
    });
    await queryInterface.addColumn("encounter_follow_ups", "outcome_assessed_at", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn("encounter_follow_ups", "outcome_log_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn("encounter_follow_ups", "residual_conditions", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("encounter_follow_ups", "follow_up_chain_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn("encounter_follow_ups", "chain_sequence", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("encounter_follow_ups", "parent_follow_up_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "encounter_follow_ups", key: "follow_up_id" },
    });
    await queryInterface.addColumn("encounter_follow_ups", "child_follow_up_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "encounter_follow_ups", key: "follow_up_id" },
    });

    // Add indexes for query performance
    await queryInterface.addIndex("encounter_follow_ups", ["outcome"]);
    await queryInterface.addIndex("encounter_follow_ups", ["follow_up_chain_id"]);
    await queryInterface.addIndex("encounter_follow_ups", ["parent_follow_up_id"]);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove in reverse order
    await queryInterface.removeColumn("encounter_follow_ups", "child_follow_up_id");
    await queryInterface.removeColumn("encounter_follow_ups", "parent_follow_up_id");
    await queryInterface.removeColumn("encounter_follow_ups", "chain_sequence");
    await queryInterface.removeColumn("encounter_follow_ups", "follow_up_chain_id");
    await queryInterface.removeColumn("encounter_follow_ups", "residual_conditions");
    await queryInterface.removeColumn("encounter_follow_ups", "outcome_log_id");
    await queryInterface.removeColumn("encounter_follow_ups", "outcome_assessed_at");
    await queryInterface.removeColumn("encounter_follow_ups", "outcome_assessed_by");
    await queryInterface.removeColumn("encounter_follow_ups", "outcome_summary");
    await queryInterface.removeColumn("encounter_follow_ups", "outcome");
  },
};
```

### 11.2 Data Backfill

Existing records with `completed_encounter_id` set but no outcome should be:
- Backfilled to `outcome = NULL` (unknown)
- Status stays `COMPLETED` (no change required)
- No automatic outcome assignment (clinically unsafe to assume)

### 11.3 Service Compatibility

- `_getFollowUp()` default includes should include outcome fields
- `autoCompleteFollowUp()` behavior change: use feature flag or version check
- Old API consumers continue to work — new fields are optional/appended

---

## 12. Backward Compatibility

| Concern | Status | Mitigation |
|---------|--------|------------|
| Existing completed follow-ups | ✅ | NULL outcome is valid — old records unchanged |
| Existing API consumers | ✅ | New fields are appended; old consumers ignore unknown fields |
| Existing autoCompleteFollowUp | ⚠️ | Change transition to OUTCOME_PENDING — may affect downstream logic that expects COMPLETED |
| Frontend non-follow-up encounters | ✅ | No UI changes for non-follow-up encounters |
| Follow-up management page | ✅ | New columns hidden behind feature flag until frontend updated |
| Encounter completion validation | ⚠️ | New rule "Missing Follow-up Outcome" may block completion — needs phase-in |
| Third-party integrations | ✅ | Read-only consumers unaffected |

### 12.1 Mitigation for Breaking Changes

1. **Feature flag**: `FOLLOW_UP_ENABLE_OUTCOME_TRACKING` (default: false)
   - When false: autoCompleteFollowUp transitions to COMPLETED as before
   - When true: autoCompleteFollowUp transitions to OUTCOME_PENDING
2. **Phase-in period**: Allow clinicians to record outcomes optionally for 2 weeks, then make mandatory
3. **Completion override**: Clinicians can override the "Missing Follow-up Outcome" warning during phase-in

---

## 13. RBAC Requirements

### 13.1 New Permissions

| Permission | Resource | Action | Description |
|------------|----------|--------|-------------|
| `follow-up:record_outcome` | EncounterFollowUp | update | Record outcome on a follow-up |
| `follow-up:create_chain` | EncounterFollowUp | create | Create a follow-up chain |
| `follow-up:view_chain` | EncounterFollowUp | read | View follow-up chain history |

### 13.2 Permission Assignment

| Role | record_outcome | create_chain | view_chain |
|------|---------------|--------------|------------|
| Doctor | ✅ | ✅ | ✅ |
| Nurse | ✅ | ✅ | ✅ |
| Reception | ❌ | ❌ | ✅ |
| Admin | ❌ | ❌ | ✅ |
| Cashier | ❌ | ❌ | ✅ |

### 13.3 Permission Checks

```javascript
// Record outcome
checkPermission("follow-up", "record_outcome")

// Create chain
checkPermission("follow-up", "create_chain")

// View chain
checkPermission("follow-up", "view_chain")
```

No new permission groups required — existing `follow-up` permission group can be extended with new actions.

---

## 14. Implementation Plan

### Phase 2.4.4 Task Breakdown

#### Task 1: Database Migration
- [ ] Create migration `20260724000001-add-follow-up-outcome-fields.js`
- [ ] Update `EncounterFollowUp` model with new associations
- [ ] Add outcome ENUM to model definition
- [ ] Add self-referencing associations for chain (parent/child)

#### Task 2: Update EncounterFollowUpService
- [ ] Modify `ALLOWED_TRANSITIONS` to include `OUTCOME_PENDING`
- [ ] Modify `autoCompleteFollowUp()` to transition to `OUTCOME_PENDING` (behind feature flag)
- [ ] Add `TIMELINE_EVENTS` entries for `FOLLOW_UP_OUTCOME_RECORDED`, `FOLLOW_UP_CHAIN_CREATED`
- [ ] Add `AUDIT_ACTIONS` entries for outcome recording and chain creation

#### Task 3: Create FollowUpOutcomeService
- [ ] Create `backend/services/followUpOutcomeService.js`
- [ ] Implement `recordOutcome()`
- [ ] Implement `createFollowUpChain()`
- [ ] Implement `getFollowUpChain()`
- [ ] Implement `getPendingOutcomes()`
- [ ] Implement `validateOutcomeRequired()`
- [ ] Add timeline event emission
- [ ] Add audit logging
- [ ] Add notification integration

#### Task 4: Create Outcome Endpoints
- [ ] Create `backend/controllers/followUp/followUpOutcomeController.js`
- [ ] Add `recordOutcome` handler
- [ ] Add `createChain` handler
- [ ] Add `getChain` handler
- [ ] Add `breakChain` handler
- [ ] Register in `backend/routers/followUp/encounterFollowUpRoutes.js`

#### Task 5: Create Outcome Validator
- [ ] Create `backend/validators/followUp/followUpOutcomeValidator.js`
- [ ] Validate outcome enum, summary required, assessed_by required

#### Task 6: Update Encounter Completion Engine
- [ ] Add `FOLLOW_UP_OUTCOME_MISSING` rule to `clinicalRuleEngineService.js`
- [ ] Update `encounterCompletionService._buildValidationContext()` to check outcome
- [ ] Register new rule in seed defaults

#### Task 7: Update Continuity Service
- [ ] Modify `followUpContinuityService.getFollowUpContext()` to include outcome fields
- [ ] Add chain information to DTO

#### Task 8: Frontend — Redux API
- [ ] Add `recordFollowUpOutcome` mutation to `followUpApi.ts`
- [ ] Add `createFollowUpChain` mutation
- [ ] Add `getFollowUpChain` query
- [ ] Add outcome types

#### Task 9: Frontend — Outcome Dialog
- [ ] Create `FollowUpOutcomeDialog.tsx`
- [ ] Outcome dropdown
- [ ] Outcome summary textarea
- [ ] Residual conditions textarea
- [ ] Assessed date picker
- [ ] Conditional chain creation (if outcome = ONGOING)

#### Task 10: Frontend — Chain View
- [ ] Create `FollowUpChainView.tsx`
- [ ] Display chain as timeline/flow
- [ ] Show outcome for each chain member

#### Task 11: Frontend — Workflow Integration
- [ ] Add "Record Follow-up Outcome" button to `GlobalWorkflowActions.tsx`
- [ ] Integrate outcome dialog into `AppointmentWorkflowPanel.tsx`
- [ ] Block completion on missing outcome for follow-up encounters
- [ ] Update validation dialog to show blocking issue

#### Task 12: Frontend — Clinical Handover Update
- [ ] Add outcome section to `FollowUpClinicalHandover.tsx`
- [ ] Show existing outcome if recorded
- [ ] Show "Record Outcome" button if not

#### Task 13: Timeline Events
- [ ] Verify `FOLLOW_UP_OUTCOME_RECORDED` event type is accepted by timeline service
- [ ] Add description generation for outcome events

#### Task 14: Tests
- [ ] Create `backend/tests/followUpOutcome.test.js`
  - [ ] Record outcome for SCHEDULED follow-up
  - [ ] Record outcome for OUTCOME_PENDING follow-up
  - [ ] Reject invalid outcome transitions
  - [ ] Create follow-up chain
  - [ ] Traverse chain forward/backward
  - [ ] Validate outcome required for encounter completion
  - [ ] Verify timeline events emitted
  - [ ] Verify audit recorded
  - [ ] Verify backward compatibility (existing COMPLETED records unaffected)

#### Task 15: Documentation
- [ ] Update API documentation with new endpoints
- [ ] Update DTO schema documentation
- [ ] Document outcome enum values and meanings
- [ ] Document chain creation workflow

---

## Appendix A: Files to Create

| File | Purpose |
|------|---------|
| `backend/migrations/20260724000001-add-follow-up-outcome-fields.js` | Database migration |
| `backend/services/followUpOutcomeService.js` | Outcome recording + chain management |
| `backend/controllers/followUp/followUpOutcomeController.js` | Outcome API handlers |
| `backend/validators/followUp/followUpOutcomeValidator.js` | Outcome validation |
| `frontend/src/features/follow-up/components/FollowUpOutcomeDialog.tsx` | Outcome recording dialog |
| `frontend/src/features/follow-up/components/FollowUpChainView.tsx` | Chain display component |
| `backend/tests/followUpOutcome.test.js` | Integration tests |

## Appendix B: Files to Modify

| File | Changes |
|------|---------|
| `backend/models/clinical/encounterFollowUp.js` | New columns, self-referencing associations |
| `backend/services/encounterFollowUpService.js` | ALLOWED_TRANSITIONS, autoCompleteFollowUp, timeline events |
| `backend/services/followUpContinuityService.js` | Add outcome fields to DTO |
| `backend/services/encounterCompletionService.js` | Add outcome validation to context |
| `backend/services/clinicalRuleEngineService.js` | Add "Missing Follow-up Outcome" rule |
| `backend/routers/followUp/encounterFollowUpRoutes.js` | New routes for outcome + chain |
| `backend/routers/workflow/medicalWorkflowRoutes.js` | (No changes unless needed) |
| `frontend/src/redux/api/followUpApi.ts` | New mutations + queries |
| `frontend/src/features/medical-workflow/AppointmentWorkflowPanel.tsx` | Outcome button + dialog integration |
| `frontend/src/features/medical-workflow/components/GlobalWorkflowActions.tsx` | New outcome button prop |
| `frontend/src/features/medical-workflow/components/FollowUpClinicalHandover.tsx` | Outcome section |
| `frontend/src/features/follow-up/FollowUpManagementPage.tsx` | Outcome column + filters |

## Appendix C: Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| autoCompleteFollowUp behavior change breaks existing flow | **High** | Feature flag, phase-in period, override option |
| Clinicians forget to record outcome | Medium | Blocking issue on encounter completion; clear UI prompt |
| Chain data becomes orphaned | Low | Cascade delete handling; chain integrity validation |
| Migration fails on large tables | Low | Add columns as nullable; no data transformation needed |
| Frontend outcome dialog disrupts workflow | Medium | Dismissible; can be postponed but blocks completion |
| Backward compatibility with third-party integrations | Low | New optional fields; old JSON parsers ignore unknown keys |