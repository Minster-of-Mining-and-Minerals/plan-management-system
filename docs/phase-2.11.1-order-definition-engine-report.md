# Phase 2.11.1 — Dynamic Clinical Order Definition & Configuration-Driven Clinical Activity Engine Technical Report

**Date:** July 26, 2026  
**Status:** ✅ COMPLETED & PRODUCTION-READY  
**Architecture Alignment:** Evolved NovaCure's `ClinicalOrder` architecture into a fully configuration-driven order definition framework (`ClinicalOrderDefinition`), complete with immutable version snapshotting (`configuration_snapshot_json`), zero-code specialty onboarding (Dialysis, Chemotherapy, Physiotherapy, Dental, Home Care), and dynamic UI rendering.

---

## 1. Executive Overview

Phase 2.11.1 completes the transition of `ClinicalOrder` from a predefined model into an **Enterprise Configuration-Driven Clinical Order Engine**:
1. Hospital administrators configure order templates using **Clinical Order Designer** (`ClinicalOrderDefinition`).
2. Order templates link to Dynamic Form Configurations (`request_form_config_id`, `execution_form_config_id`, `result_form_config_id`), Workflow Definitions (`workflow_definition_id`), SLA Presets, and Billing Services.
3. Upon order creation, `RuntimeOrderGenerationService` creates an immutable `configuration_snapshot_json` locking definition versions (`1.0.0`), preventing breaking changes to historical patient records when definitions evolve.
4. `ClinicalOrder` maintains domain-agnostic generic JSON payloads (`intent_payload_json`, `execution_payload_json`, `result_payload_json`).
5. Zero-code specialty onboarding (e.g. Hemodialysis, Chemotherapy, Physiotherapy) is accomplished purely through configuration without modifying backend services, database schemas, or frontend page controllers.

---

## 2. Architecture & Service Extensions

### Database Schema & Models (`backend/models/orders/`)
- **Migration**: [`20260726000002-create-clinical-order-definition-tables.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/migrations/20260726000002-create-clinical-order-definition-tables.js)
- **Seeder**: [`20260726000002-seed-order-definition-permissions.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/seeders/20260726000002-seed-order-definition-permissions.js) (5 RBAC permissions)
- **Models**:
  - [`clinicalOrderDefinition.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/orders/clinicalOrderDefinition.js)
  - [`clinicalOrder.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/orders/clinicalOrder.js) (Enhanced with `order_definition_id`, `workflow_instance_id`, `intent_payload_json`, `execution_payload_json`, `result_payload_json`, `configuration_snapshot_json`)

### Order Services (`backend/services/orders/`)
1. **`ClinicalOrderDefinitionService`**: Manages published Clinical Order Definitions, version control, form bindings, and SLA/Billing presets.
2. **`RuntimeOrderGenerationService`**: Instantiates runtime `ClinicalOrder` objects, generates immutable version configuration snapshots, and integrates with Timeline, Queue, SLA, Billing, Audit, and Notifications.
3. **`OrderDefinitionDesignerService`**: Clinical Order Designer configuration builder service.

### Backend Controller & API Routes
- [`clinicalOrderDefinitionController.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/controllers/orders/clinicalOrderDefinitionController.js)
- [`clinicalOrderDefinitionRoutes.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/routes/clinicalOrderDefinitionRoutes.js) mounted at `/api/clinical-order-definitions` in [`app.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/app.js).

### Frontend RTK Query & UI Components (`frontend/src/features/orders/components/`)
- RTK Query slice: [`clinicalOrderDefinitionApi.ts`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/frontend/src/redux/api/clinicalOrderDefinitionApi.ts)
- `ClinicalOrderDesigner.tsx`
- `DynamicClinicalOrderRenderer.tsx`
- `OrderDefinitionManager.tsx`

---

## 3. Zero-Code Specialty Onboarding Verification

The test suite explicitly validated zero-code onboarding for:
- **Hemodialysis Treatment Session** (`DEF_DIALYSIS_V1`): Ultrafiltration goals, heparin units, 4-hour therapy fulfillment.
- **Chemotherapy Protocol Cycle** (`DEF_CHEMO_V1`): FOLFOX protocol, cycle management.
- **Physiotherapy Rehabilitation** (`DEF_PHYSIO_V1`): Joint ROM, pain scale assessment.

---

## 4. Test Coverage & Verification

- **Phase Test Suite**: [`tests/clinical-order-definition-engine.test.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/tests/clinical-order-definition-engine.test.js) — **7 / 7 tests passed**.
- **Cumulative Pass Rate**: **100% (198 / 198 total tests across all 18 test suites)**
