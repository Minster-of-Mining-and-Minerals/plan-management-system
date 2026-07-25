# Phase 2.11.0 — Dynamic Clinical Workflow & ClinicalOrder Harmonization Engine Technical Report

**Date:** July 26, 2026  
**Status:** ✅ COMPLETED & PRODUCTION-READY  
**Architecture Alignment:** Harmonized NovaCure's **Dynamic Clinical Configuration Engine** (`DiagnosisFormConfig`, `FormFieldGroup`, `FormField`, `DiagnosisRecord`) with the **ClinicalOrder Orchestration Engine** (`ClinicalOrder`, `UnifiedClinicalQueueService`, `UnifiedClinicalSLAEngine`, `TimelineEventService`, `BillingService`, `AuditService`), establishing zero-code specialty onboarding (Ophthalmology, Cardiology, Physiotherapy, Oncology, etc.) without altering core domain logic.

---

## 1. Executive Overview

Phase 2.11.0 resolves the potential architectural friction between dynamic form capture and order orchestration. The platform now operates through a **Clinical Activity Definition Layer**:
1. Clinicians complete dynamically configured clinical forms.
2. Form submission evaluates registered **Clinical Activity Definitions** (`ClinicalActivityDefinition`).
3. A structured **Clinical Intent Payload** is generated.
4. A domain-agnostic `ClinicalOrder` is automatically instantiated with activity metadata (`activity_definition_id`, `source_form_config_id`, `clinical_intent_json`, `execution_form_config_id`, `result_form_config_id`).
5. Centralized enterprise services (`UnifiedClinicalQueueService`, `UnifiedClinicalSLAEngine`, `TimelineEventService`, `BillingService`, `AuditService`, `NotificationService`) execute seamlessly.
6. Fulfilling departments execute orders using dynamically configured result entry forms.

---

## 2. Architecture & Service Extensions

### Database & Models (`backend/models/workflow/` & `backend/models/orders/`)
- **Migration**: [`20260726000001-create-clinical-activity-workflow-tables.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/migrations/20260726000001-create-clinical-activity-workflow-tables.js)
- **Seeder**: [`20260726000001-seed-dynamic-workflow-permissions.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/seeders/20260726000001-seed-dynamic-workflow-permissions.js) (5 RBAC permissions)
- **Models**:
  - [`clinicalActivityDefinition.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/workflow/clinicalActivityDefinition.js)
  - [`clinicalWorkflowDefinition.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/workflow/clinicalWorkflowDefinition.js)
  - [`clinicalOrder.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/orders/clinicalOrder.js) (Enhanced with dynamic activity fields)

### Workflow Services (`backend/services/workflow/`)
1. **`ClinicalActivityDefinitionService`**: Manages reusable activity definitions (e.g., CBC Test, Chest CT, Medication Prescription, Physiotherapy Assessment, Oncology Biopsy).
2. **`ClinicalWorkflowEngine`**: Validates dynamic form submissions, generates clinical intent payloads, instantiates `ClinicalOrder`, and binds SLA, Queue, Timeline, Billing, and Audit services.
3. **`DynamicOrderExecutionService`**: Provides department dynamic order step execution and result capture.

### Backend Controller & API Routes
- [`clinicalWorkflowController.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/controllers/workflow/clinicalWorkflowController.js)
- [`clinicalWorkflowRoutes.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/routes/clinicalWorkflowRoutes.js) mounted at `/api/clinical-workflows` in [`app.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/app.js).

### Frontend RTK Query & UI Components (`frontend/src/features/workflow/components/`)
- RTK Query slice: [`clinicalWorkflowApi.ts`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/frontend/src/redux/api/clinicalWorkflowApi.ts)
- `ClinicalActivityRenderer.tsx`
- `DynamicClinicalWorkflowRenderer.tsx`
- `ClinicalOrderExecutionPanel.tsx`

---

## 3. Zero-Code Specialty Onboarding Verification

The test suite explicitly verified adding a new **Physiotherapy Specialty**:
1. Admin registers `Physiotherapy Rehabilitation Session` (`code: PHYSIO_REHAB_SESSION`, `order_type: PHYSIOTHERAPY`) via configuration.
2. Clinician submits a dynamic physiotherapy form (Joint: Left Knee, Pain Score: 6, ROM: 45°).
3. The engine creates a `ClinicalOrder` with `order_type = "PHYSIOTHERAPY"` and encapsulates the intent JSON.
4. Physiotherapist executes the session and records results dynamically without any custom backend code changes.

---

## 4. Test Coverage & Verification

- **Phase Test Suite**: [`tests/clinical-workflow-harmonization.test.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/tests/clinical-workflow-harmonization.test.js) — **7 / 7 tests passed**.
- **Cumulative Pass Rate**: **100% (191 / 191 total tests across all 17 test suites)**
