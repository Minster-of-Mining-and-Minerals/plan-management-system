# Phase 2.9.4 — Clinical Care Plan, Goal Management & Patient Outcome Tracking Engine Report

**Date:** July 25, 2026  
**Status:** ✅ COMPLETED & PRODUCTION-READY  
**Architecture Alignment:** Built a complete Care Management domain on top of existing NovaCure clinical architecture (ClinicalProblem, ClinicalAlert, TimelineEventService, ClinicalAuditEngine, NotificationService) — no existing workflow broken.

---

## 1. Clinical Care Management Gap Analysis — Summary

| Gap | Status Before | Status After |
|---|---|---|
| Clinical Care Plan | ❌ None | ✅ `ClinicalCarePlan` (DRAFT → ACTIVE → ON_HOLD → COMPLETED/CANCELLED) |
| Measurable Goal Tracking | ❌ No SMART goals | ✅ `ClinicalGoal` (baseline/target/current/unit + auto ACHIEVED detection) |
| Intervention Engine | ❌ None | ✅ `ClinicalIntervention` (MEDICATION/INVESTIGATION/COUNSELING/DIET/FOLLOW_UP) |
| Care Team Management | ❌ None | ✅ `CareTeamMember` (role/responsibilities per plan) |
| Generalized Clinical Task | ❌ Appointment-only WorkflowTask | ✅ `ClinicalTask` (OPEN → ACCEPTED → COMPLETED → OVERDUE + notifications) |
| Longitudinal Outcome Tracking | ❌ Single-point FollowUpOutcome | ✅ `PatientOutcome` (baseline → current → target + % progress + status) |
| RBAC Coverage | ❌ Missing | ✅ 6 new permissions seeded |

---

## 2. Technical Highlights

### Outcome Status Direction Detection
The `PatientOutcomeService` correctly handles both "higher is better" (e.g. step count) and "lower is better" (e.g. HbA1c, blood pressure, weight) targets by detecting the baseline→target direction.

### Care Plan Lifecycle
```
DRAFT → ACTIVE → ON_HOLD → COMPLETED
                          ↘ CANCELLED
```

### Goal Achievement Logic
Goals auto-evaluate from `PENDING → IN_PROGRESS → ACHIEVED` when `updateGoalProgress()` is called — no manual status change needed.

### Clinical Task to Alert Bridge
`ClinicalTask` has an `alert_id` FK allowing clinical alerts to spawn traceable actionable tasks.

---

## 3. Deliverables

### Database Schema
- **Migration:** [`20260725000020-create-care-management-tables.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/migrations/20260725000020-create-care-management-tables.js) — 6 tables
- **Seeder:** [`20260725000017-seed-care-management-permissions.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/seeders/20260725000017-seed-care-management-permissions.js) — 6 permissions

### Models (`backend/models/careManagement/`)
- [`ClinicalCarePlan`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/careManagement/clinicalCarePlan.js) · [`ClinicalGoal`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/careManagement/clinicalGoal.js) · [`ClinicalIntervention`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/careManagement/clinicalIntervention.js) · [`CareTeamMember`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/careManagement/careTeamMember.js) · [`ClinicalTask`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/careManagement/clinicalTask.js) · [`PatientOutcome`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/careManagement/patientOutcome.js)

### Services (`backend/services/careManagement/`)
- [`ClinicalCarePlanService`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/careManagement/clinicalCarePlanService.js) · [`ClinicalGoalService`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/careManagement/clinicalGoalService.js) · [`ClinicalInterventionService`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/careManagement/clinicalInterventionService.js) · [`CareTeamService`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/careManagement/careTeamService.js) · [`ClinicalTaskService`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/careManagement/clinicalTaskService.js) · [`PatientOutcomeService`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/careManagement/patientOutcomeService.js)

### Frontend UI (`frontend/src/features/care-management/`)
- [`CarePlanPanel.tsx`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/frontend/src/features/care-management/components/CarePlanPanel.tsx) · [`GoalProgressPanel.tsx`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/frontend/src/features/care-management/components/GoalProgressPanel.tsx) · [`ClinicalTaskDashboard.tsx`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/frontend/src/features/care-management/components/ClinicalTaskDashboard.tsx) · [`OutcomeDashboard.tsx`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/frontend/src/features/care-management/components/OutcomeDashboard.tsx)

---

## 4. Test Results

| Test Suite | Tests Passing |
|---|---|
| `clinical-care-management.test.js` | **27 / 27** |
| `clinical-intelligence.test.js` | **14 / 14** |
| `clinical-data-integrity.test.js` | **7 / 7** |
| `clinical-governance-hardening.test.js` | **7 / 7** |
| `future-domain-compatibility.test.js` | **7 / 7** |
| `cross-domain-clinical-harmonization.test.js` | **10 / 10** |
| Pharmacy suites (×6) | **60 / 60** |
| **CUMULATIVE TOTAL** | **132 / 132 (100%)** |
