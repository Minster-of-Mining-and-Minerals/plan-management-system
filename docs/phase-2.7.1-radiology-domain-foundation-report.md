# Phase 2.7.1 — Radiology Domain Foundation
## Implementation & Validation Report

**Date:** July 25, 2026  
**Status:** ✅ COMPLETED  
**Architecture Alignment:** Extension of Unified Clinical Order Architecture (`ClinicalOrder`, `ClinicalOrderResult`, `TimelineEventService`, `auditService`, `RBAC`)  

---

## 1. Overview

Phase 2.7.1 introduces the **Radiology Domain Foundation** to the NovaCure Clinical Platform. Rather than creating a standalone subsystem or duplicate order engine, Radiology is implemented as a direct extension of the **Unified Clinical Order Architecture** established in Phase 2.5.

Radiology orders are instances of `ClinicalOrder` where `order_type = 'RADIOLOGY'`. The module introduces specialized radiology entities:
- **Procedure Catalogs:** Modality-specific diagnostic procedures (XRAY, CT, MRI, Ultrasound, Mammography, Fluoroscopy, ECG).
- **Imaging Studies:** Performed imaging procedures (`RadiologyStudy`) tracked by unique accession numbers (`RAD-YYYYMMDD-XXXX`) and workflow statuses (`ORDERED` → `SCHEDULED` → `IN_PROGRESS` → `IMAGE_ACQUIRED` → `REPORT_PENDING` → `COMPLETED`).
- **Diagnostic Reports:** Radiologist narrative findings, impressions, and recommendations (`RadiologyReport`) integrated with parent `ClinicalOrderResult` records.
- **Amendment History:** Complete version history tracking (`RadiologyReportHistory`) for amended diagnostic reports with mandatory change reasons.
- **Work Queue:** Specialized operational queues (`RadiologyWorkQueueItem`) mirroring `LaboratoryQueueService` stages (`SCHEDULING`, `WAITING`, `IMAGING`, `REPORTING`, `VERIFICATION`).

---

## 2. Target Architecture

```
                       ClinicalOrder (Phase 2.5)
                              │ (order_type = RADIOLOGY)
                              │
                    ┌─────────┴─────────┐
                    │                   │
             Laboratory (2.6)    Radiology (2.7.1)
                    │                   │
             Work Queue         Radiology Queue
                    │                   │
             Observations       Imaging Studies & Reports
                    │                   │
             Timeline           Timeline (TimelineEventService)
                    │                   │
             Audit Log          Audit Log (auditService)
```

---

## 3. Database Migrations

### Migration: [`20260725000010-create-radiology-domain-tables.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/migrations/20260725000010-create-radiology-domain-tables.js)

1. `radiology_procedure_catalogs`: Catalog of imaging modalities, codes, names, body regions, and contrast flags.
2. `radiology_studies`: Tracks study accession numbers, workflow statuses, scheduled/performed dates, radiographers, and radiologists.
3. `radiology_reports`: Stores diagnostic report findings (`TEXT`), impressions (`TEXT`), recommendations (`TEXT`), and verification status (`PRELIMINARY`, `FINAL`, `AMENDED`).
4. `radiology_report_histories`: Preserves previous findings, impressions, recommendations, status, user attribution, and change reasons upon amendment.
5. `radiology_work_queue_items`: Operational work queue items tracked by queue stage (`SCHEDULING`, `WAITING`, `IMAGING`, `REPORTING`, `VERIFICATION`) and priority (`STAT`, `URGENT`, `ROUTINE`).
6. `clinical_orders.radiology_status`: Adds `radiology_status` column to `clinical_orders` (defaulting to `'WAITING_FOR_SCHEDULE'`).

---

## 4. Backend Implementation

### Models & Registries
- [`RadiologyProcedureCatalog`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/radiology/radiologyProcedureCatalog.js)
- [`RadiologyStudy`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/radiology/radiologyStudy.js)
- [`RadiologyReport`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/radiology/radiologyReport.js)
- [`RadiologyReportHistory`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/radiology/radiologyReportHistory.js)
- [`RadiologyWorkQueueItem`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/radiology/radiologyWorkQueueItem.js)
- Associations linked with `ClinicalOrder`, `ClinicalOrderResult`, `User`, `Department`, and `StaffAppointment`.

### Services
- [`RadiologyService`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/radiologyService.js): Manages procedure catalog, study scheduling, acquisition start/completion, report submission, verification, and amendment history. Wraated in managed database transactions (`db.sequelize.transaction`).
- [`RadiologyQueueService`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/radiologyQueueService.js): Manages queue item creation, priority sorting (`STAT` > `URGENT` > `ROUTINE`), worklist queries, claiming, starting, completing, and stage transitions.

### Timeline & Audit Integration
- **Timeline Events emitted via [`timelineEventService`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/timelineEventService.js):**
  - `RADIOLOGY_ORDERED`
  - `RADIOLOGY_SCHEDULED`
  - `RADIOLOGY_STARTED`
  - `RADIOLOGY_COMPLETED`
  - `RADIOLOGY_REPORT_AVAILABLE`
  - `RADIOLOGY_REPORT_VERIFIED`
- **Audit Logs recorded via [`auditService`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/auditService.js):**
  - `RADIOLOGY_ORDER_CREATED`
  - `RADIOLOGY_STUDY_SCHEDULED`
  - `RADIOLOGY_STARTED`
  - `RADIOLOGY_COMPLETED`
  - `RADIOLOGY_REPORT_CREATED`
  - `RADIOLOGY_REPORT_VERIFIED`
  - `RADIOLOGY_REPORT_AMENDED`
  - `RADIOLOGY_WORK_CLAIMED`
  - `RADIOLOGY_WORK_STARTED`
  - `RADIOLOGY_WORK_COMPLETED`

---

## 5. RBAC & Security

Permission group `'Radiology'` seeded via [`20260725000007-seed-radiology-permissions.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/seeders/20260725000007-seed-radiology-permissions.js):

| Permission | Resource / Action | Roles Granted |
| :--- | :--- | :--- |
| View Radiology | `radiology:view` | Doctor, Nurse, Radiographer, Radiologist, Admin, Super Admin |
| Schedule Study | `radiology:schedule` | Radiographer, Radiologist, Nurse, Admin, Super Admin |
| Perform Study | `radiology:perform` | Radiographer, Radiologist, Admin, Super Admin |
| Draft Report | `radiology:report_create` | Radiologist, Admin, Super Admin |
| Verify Report | `radiology:report_verify` | Radiologist, Doctor, Admin, Super Admin |
| Amend Report | `radiology:report_amend` | Radiologist, Admin, Super Admin |
| Operational Queue | `radiology:view_queue` | Radiographer, Radiologist, Nurse, Admin, Super Admin |
| Claim Queue Item | `radiology:claim_work` | Radiographer, Radiologist, Admin, Super Admin |

Routes registered in [`backend/routes/radiologyRoutes.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/routes/radiologyRoutes.js) and mounted under `/api/radiology` in [`backend/app.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/app.js#L272).

---

## 6. Frontend Integration

- **RTK Query Slice:** [`radiologyApi.ts`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/frontend/src/redux/api/radiologyApi.ts) extending `baseApi` with tag invalidation (`"Radiology"`).
- **UI Component:** [`RadiologyOrderPanel.tsx`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/frontend/src/features/medical-workflow/components/RadiologyOrderPanel.tsx) mirroring `LaboratoryOrderPanel.tsx` in design language, card structure, workflow status badges (`ORDERED`, `SCHEDULED`, `IN_PROGRESS`, `IMAGE_ACQUIRED`, `REPORT_PENDING`, `COMPLETED`), and modal dialogs for scheduling, report drafting, verification, and amendments.

---

## 7. Test Suite Coverage

**File:** [`backend/tests/radiology.test.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/tests/radiology.test.js)

```
✓ Creates procedure catalog items and queries by modality
✓ Creates radiology study with unique accession number (RAD-YYYYMMDD-XXXX)
✓ Schedules imaging study
✓ Starts imaging procedure
✓ Completes image acquisition and transitions queue stage
✓ Queries active radiology work queue sorted by priority
✓ Drafts and submits radiologist diagnostic report
✓ Verifies and signs off report (status -> FINAL)
✓ Rejects amendment when change_reason is missing
✓ Amends report and preserves history in radiology_report_histories
```

---

## 8. Summary of Reused Infrastructure

1. `ClinicalOrder` (Order creation, patient & encounter linkage, priority, status).
2. `ClinicalOrderResult` (Unified clinical order result representation).
3. `ClinicalOrderStatusHistory` (Audit trail for order status transitions).
4. `TimelineEventService` (Unified chronological timeline).
5. `auditService` (Enterprise audit trail logging).
6. RBAC Middleware (`authenticateToken`, `requireInternalAccount`, `checkPermission`).
7. RTK Query (`baseApi` tag invalidation pattern).
8. Component Architecture (Tailwind CSS, Lucide icons, Sonner toast notifications, Shadcn Card/Badge/Dialog components).
