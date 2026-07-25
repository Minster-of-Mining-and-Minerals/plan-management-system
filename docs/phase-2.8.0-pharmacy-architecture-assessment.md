# Phase 2.8.0 — Pharmacy Architecture Discovery & Integration Assessment
## Executive Summary & Architectural Evaluation

**Date:** July 25, 2026  
**Status:** ✅ COMPLETED (ASSESSMENT ONLY — NO CODE MODIFIED)  
**Target Domain:** Enterprise Pharmacy Management System, EMR Prescription Engine & Pharmacy Portal

---

## 1. Current Pharmacy Architecture Discovery

The NovaCure Platform features a dual-domain architecture split between the **Internal EMR Clinical Platform** and the **External/Internal Pharmacy Portal**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 NOVACURE EMR PLATFORM                                   │
│                                                                                         │
│  ┌────────────────────────┐      ┌────────────────────────┐                             │
│  │   Doctor Consultation  │ ───> │   Prescription Module  │ (prescriptions,             │
│  │  (StaffAppointment)    │      │  (EMR Clinical View)   │  prescription_items)        │
│  └────────────────────────┘      └───────────┬────────────┘                             │
│                                              │                                          │
│                                              │ Explicit Forwarding                      │
│                                              ▼                                          │
│                                ┌───────────────────────────┐                            │
│                                │PrescriptionPharmacyForward│                            │
│                                └─────────────┬─────────────┘                            │
└──────────────────────────────────────────────┼──────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PHARMACY PORTAL                                      │
│                                                                                         │
│  ┌────────────────────────┐      ┌────────────────────────┐      ┌───────────────────┐  │
│  │  PharmacyPrescription  │ ───> │PharmacyPrescriptionItem│ ───> │Prescription       │  │
│  │  (Snapshot & Status)   │      │(Dispensing Line Status)│      │Fulfillment        │  │
│  └────────────────────────┘      └────────────────────────┘      └───────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Backend Component Directory

#### Database Models
- **EMR Prescription Domain (`backend/models/prescription/`):**
  - [`Prescription`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/prescription/prescription.js): Root EMR prescription (`prescription_id`, `appointment_id`, `patient_id`, `prescriber_id`, `category_id`, `status` = `issued`, `rendered_html`).
  - [`PrescriptionItem`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/prescription/prescriptionItem.js): EMR line items (`item_name`, `strength`, `route`, `dosage`, `frequency`, `duration`, `quantity`, `instructions`).
  - [`PrescriptionCategory`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/prescription/prescriptionCategory.js): Prescription categories.
  - [`PrescriptionTemplate`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/prescription/prescriptionTemplate.js) & [`PrescriptionTemplateItem`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/prescription/prescriptionTemplateItem.js): Reusable doctor templates.
  - [`PrescriptionDocumentTemplate`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/prescription/prescriptionDocumentTemplate.js): Document PDF print templates.

- **Pharmacy Portal Domain (`backend/models/pharmacy/`):**
  - [`Pharmacy`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/pharmacy/pharmacy.js): Pharmacy organization catalog (`pharmacy_id`, `pharmacy_name`, `pharmacy_code`, `status` = `active`).
  - [`PharmacyPrescription`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/pharmacy/pharmacyPrescription.js): Received prescription in portal (`pharmacy_prescription_id`, `original_prescription_id`, `pharmacy_id`, `patient_id`, `prescriber_id`, `pharmacy_status`, `patient_snapshot`, `prescriber_snapshot`, `current_version`).
  - [`PharmacyPrescriptionItem`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/pharmacy/pharmacyPrescriptionItem.js): Portal dispensing item lines (`item_name`, `dispensed_quantity`, `pharmacy_item_status`, `substitution_notes`).
  - [`PharmacyPrescriptionVersion`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/pharmacy/pharmacyPrescriptionVersion.js): Versioning log for pharmacy modifications.
  - [`PrescriptionFulfillment`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/pharmacy/prescriptionFulfillment.js): Dispensing log (`fulfillment_id`, `fulfilled_by`, `fulfillment_status`, `items_detail`, `dispensed_at`).
  - [`PrescriptionPharmacyForward`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/pharmacy/prescriptionPharmacyForward.js): Join entity for EMR-to-Pharmacy transmission.
  - [`PrescriptionPharmacyForwardAudit`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/pharmacy/prescriptionPharmacyForwardAudit.js) & [`PrescriptionPharmacyForwardFile`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/pharmacy/prescriptionPharmacyForwardFile.js): Audit trails and PDF attachments.
  - [`PharmacyUserProfile`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/pharmacy/pharmacyUserProfile.js): Links user accounts to a specific pharmacy (`portal_role`).

#### Backend Services
- [`pharmacyPrescriptionService.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/pharmacyPrescriptionService.js): Forwarding logic, snapshot generation, pharmacy status transitions (`received` → `reviewing` → `preparing` → `partially_dispensed` → `dispensed` → `completed`), and fulfillment logging.
- [`pharmacyService.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/pharmacyService.js): Pharmacy organization CRUD & active pharmacy listing.
- [`pharmacyUserService.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/pharmacyUserService.js): Pharmacy user profile management.
- [`prescriptionService.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/prescriptionService.js): EMR prescription creation, template expansion, and HTML rendering.

#### Backend Routes & Middlewares
- [`pharmacyRoutes.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/routers/pharmacy/pharmacyRoutes.js): `/api/pharmacies` (EMR internal staff route for managing pharmacies & forwarding prescriptions).
- [`pharmacyPortalRoutes.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/routers/pharmacy/pharmacyPortalRoutes.js): `/api/pharmacy-portal` (Pharmacy Portal route requiring `account_type = 'PHARMACY'` and `attachPharmacyContext`).
- [`prescriptionRoutes.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/routers/prescription/prescriptionRoutes.js): `/api/prescriptions` (EMR doctor prescription issuance).

### 1.2 Frontend Component Directory

- **Pharmacy Portal Views (`frontend/src/features/pharmacy-portal/`):**
  - `PharmacyDashboard.tsx`: Metrics for received, processing, completed prescriptions.
  - `PharmacyPrescriptionsPage.tsx` & `PharmacyPrescriptionList.tsx`: Worklist of forwarded prescriptions.
  - `PharmacyPrescriptionDetailPage.tsx`: Detailed item-by-item dispensing, substitution notes, and status updates.
  - `PharmacyNotificationsPage.tsx`: Unread pharmacy alerts.
- **EMR Clinical Integration (`frontend/src/features/patient-management/`):**
  - `SendToPharmacyDrawer.tsx`: Drawer for doctor/nurse to select target pharmacy and forward issued prescription.
  - `PatientPrescriptionPharmacyPanel.tsx`: Historical view of forwarded status within EMR patient file.
- **RTK Query Endpoints (`frontend/src/redux/api/`):**
  - `pharmacyApi.ts`: EMR endpoints for pharmacy catalog and forwarding.
  - `pharmacyPortalApi.ts`: Pharmacy portal endpoints for worklist and status updates.
  - `prescriptionApi.ts`: EMR endpoints for creating and viewing prescriptions.

---

## 2. Pharmacy Business Lifecycle Mapping

### 2.1 Actual Prescription Entry Pattern

NovaCure operates on a **Hybrid Forwarding Pattern (Pattern B)**:

1. **Doctor Consultation:** Doctor conducts encounter (`StaffAppointment`).
2. **Prescription Issuance:** Doctor uses EMR Prescription Module to enter items (`Prescription` + `PrescriptionItem`). Status set to `issued`.
3. **Explicit Forwarding:** Doctor/Staff opens [`SendToPharmacyDrawer`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/frontend/src/features/patient-management/SendToPharmacyDrawer.tsx) and selects target `Pharmacy`.
4. **Snapshot & Record Creation:** System creates `PharmacyPrescription` with frozen `patient_snapshot` and `prescriber_snapshot`, creates `PharmacyPrescriptionItem`s, and records `PrescriptionPharmacyForward`.
5. **Pharmacy Portal Ingestion:** Prescription appears on Pharmacy Portal dashboard in `received` status.
6. **Pharmacist Dispensing Workflow:** Pharmacist moves status: `received` → `reviewing` → `preparing` → `partially_dispensed` / `dispensed` → `completed`.
7. **Fulfillment Logging:** `PrescriptionFulfillment` log is created recording items dispensed, quantity, and timestamp.

---

## 3. Core Pharmacy Entities Assessment

| Entity Domain | Current Model / Implementation | Status / Gaps |
| :--- | :--- | :--- |
| **Medication Catalog** | **None.** Items are entered as free-text string names (`item_name`, `strength`, `dosage`, `frequency`, `duration`, `quantity`). | ❌ **FAIL.** No controlled medication code, generic/brand name distinction, SNOMED/RxNorm coding, or formulary catalog. |
| **Prescription Record** | `Prescription` (EMR) and `PharmacyPrescription` (Portal). | ⚠️ **PARTIAL.** Functional snapshot copy, but disconnected from `ClinicalOrder`. |
| **Inventory & Stock** | **None.** No stock tables, warehouses, batch numbers, lot numbers, or expiry tracking. | ❌ **FAIL.** No inventory tracking or stock reservation exists. |
| **Dispensing Engine** | `PharmacyPrescriptionItem` line statuses (`pending`, `dispensed`, `partial`, `unavailable`, `substituted`) + `PrescriptionFulfillment`. | ⚠️ **PARTIAL.** Line status tracked, but no barcode verification, digital signature, or batch allocation. |
| **Pharmacy Billing** | **None.** No price fields on `PharmacyPrescriptionItem` or integration with NovaCure Finance (`BillingService` / `AppointmentBilling`). | ❌ **FAIL.** Commercial pharmacy billing is completely missing. |

---

## 4. Comparison With Unified Clinical Architecture

### Analysis: Does Pharmacy use `ClinicalOrder`?

**No.** Pharmacy currently bypasses the **Unified Clinical Order Architecture** (`ClinicalOrder`, `ClinicalOrderResult`, `ClinicalOrderStatusHistory`, `WorkQueue`):

- **Laboratory** uses `ClinicalOrder` (`order_type = 'LABORATORY'`) + `LaboratorySpecimen` + `LaboratoryTestResult`.
- **Radiology** uses `ClinicalOrder` (`order_type = 'RADIOLOGY'`) + `RadiologyStudy` + `RadiologyWorkQueueItem`.
- **Pharmacy** uses an independent `Prescription` table and direct forward to `PharmacyPrescription`.

### Why Bypassed Initially?
Pharmacy was built as a document transmission portal (forwarding PDF/HTML prescription snapshots to external retail pharmacies) rather than an integrated EMR clinical order service.

---

## 5. Portal Separation & Authentication Model

### 5.1 Authentication
- Both EMR Clinical Platform and Pharmacy Portal share the same JWT authentication engine.
- Authorization is governed by `User.account_type`:
  - `account_type = 'INTERNAL'`: Accesses EMR clinical routes (`/api/*`).
  - `account_type = 'PHARMACY'`: Accesses Pharmacy Portal routes (`/api/pharmacy-portal/*`). Enforced by [`requirePharmacyAccount`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/middlewares/accountTypeMiddleware.js).
- Context resolution: [`attachPharmacyContext`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/middlewares/pharmacyMiddleware.js) attaches `req.pharmacyUser` (`pharmacy_id`, `portal_role`) for pharmacy staff users.

### 5.2 Data Boundaries
- **Patient Identifier:** Shared `patient_id` (UUID) + immutable `patient_snapshot` (JSONB) containing full name, email, patient code.
- **Prescriber Identifier:** Shared `prescriber_id` (UUID) + immutable `prescriber_snapshot` (JSONB) containing doctor name, title, department.
- **Prescription Identifier:** Shared `original_prescription_id` linking `PharmacyPrescription` to `Prescription`.

---

## 6. Enterprise Model Classification

NovaCure Pharmacy currently represents **Model 3 — Hybrid Portal Model**:

```
Model 1 — Integrated Clinical EMR Order (Lab/Radiology Pattern)
Model 2 — Independent External Pharmacy ERP
Model 3 — Hybrid Portal Model (Current NovaCure Implementation)
```

It contains an EMR prescription generator, explicit snapshot transmission, and a lightweight portal worklist, but lacks clinical safety checks, master medication formulary, inventory management, and integrated billing.

---

## 7. Critical Problems & Gaps Identified

### 7.1 Architectural Gaps
1. **Disconnected from Unified Clinical Orders:** Bypasses `ClinicalOrder` and central clinical `WorkQueue`.
2. **Free-Text Drug Names:** Lack of RxNorm / SNOMED CT / Master Formulary causes typo vulnerability and prevents automated safety checking.
3. **Data Duplication:** Changes to EMR prescriptions require manual content sync actions (`PHARMACY_FORWARD_ACTION.CONTENT_SYNCED`).

### 7.2 Workflow Gaps
1. **No Inventory or Batch Tracking:** No stock management, warehouse location, batch/lot tracking, or expiry date validation.
2. **No Refill Workflow:** Prescriptions cannot be refilled or tracked for recurring long-term medications.
3. **No Ordering Doctor Callback:** Ordering doctors receive no real-time notification or timeline event when a pharmacy marks a drug `unavailable` or `substituted`.

### 7.3 Security & Regulatory Gaps
1. **No Controlled Substance Controls:** No extra permissions or digital signature requirements for Schedule II / Narcotic medications.
2. **No Audit Chain for Substitutions:** Substitutions are logged in text fields (`substitution_notes`) without physician approval workflow.

### 7.4 Clinical Safety Gaps (CRITICAL)
1. **No Drug-Allergy Interaction (DAI) Checking:** No cross-reference with patient allergy records (e.g. Penicillin, Sulfa).
2. **No Drug-Drug Interaction (DDI) Checking:** No automated warning for dangerous drug interactions (e.g. Warfarin + NSAIDs).
3. **No Duplicate Therapy Detection:** No check if patient is actively taking equivalent medications.
4. **No Dose Range Safety Check:** No pediatric/geriatric or renal-adjusted dosage checks.

---

## 8. Recommended Future Implementation Roadmap (Phase 2.8)

To elevate NovaCure Pharmacy to an enterprise-grade clinical + commercial EMR pharmacy module, we recommend a 3-stage roadmap:

```
Phase 2.8.1 — Pharmacy Unified Clinical Order & Master Formulary Foundation
                             │
                             ▼
Phase 2.8.2 — Clinical Medication Safety Engine (Allergies, Interactions & Dosing)
                             │
                             ▼
Phase 2.8.3 — Pharmacy Inventory Intelligence, Controlled Drugs & Billing Integration
```

### Phase 2.8.1 — Pharmacy Unified Clinical Order & Master Formulary Foundation
- **Unified Clinical Order Integration:** Extend `ClinicalOrder` (`order_type = 'PHARMACY'`) so pharmacy orders follow standard clinical order lifecycles and appear on the unified clinical timeline.
- **Master Medication Catalog (Formulary):** Create `MedicationCatalog` (`code`, `generic_name`, `brand_name`, `dosage_form`, `strength`, `route`, `is_controlled`, `billing_service_id`).
- **Structured Prescribing:** Refactor `PrescriptionItem` to reference `MedicationCatalog`.

### Phase 2.8.2 — Clinical Medication Safety Engine
- **Drug-Allergy Interaction (DAI) Service:** Real-time checking against patient active allergy list upon prescription entry.
- **Drug-Drug Interaction (DDI) Service:** Severity-graded interaction matrix (`MILD`, `MODERATE`, `SEVERE`, `CONTRAINDICATED`).
- **Duplicate Therapy Alerts:** Automated detection of active overlapping prescriptions.
- **Clinician Real-Time Callbacks:** Notify ordering physician via `notificationService` and `TimelineEventService` when pharmacy substitutes or flags a drug as unavailable.

### Phase 2.8.3 — Pharmacy Inventory, Controlled Drugs & Billing Integration
- **Pharmacy Stock Management:** Create `PharmacyStock`, `PharmacyWarehouse`, `MedicationBatch` (`batch_number`, `expiry_date`, `quantity_on_hand`).
- **Controlled Substance Register:** Digital signature enforcement and DEA/Schedule II compliance audit log.
- **Automated Pharmacy Billing:** Automatically generate visit billing charges in NovaCure Finance upon medication dispensing (`PrescriptionFulfillment`).

---

## 9. Success Criteria Verification

- ✅ **Current Pharmacy Architecture Understood:** Documented full backend model, service, route, and frontend layout.
- ✅ **Pharmacy Portal Integration Documented:** Analyzed authentication, `account_type`, and context middleware.
- ✅ **Prescription & Inventory Lifecycles Mapped:** Identified Hybrid Forwarding Pattern (Pattern B) and confirmed absence of stock tables.
- ✅ **Billing Relationship Evaluated:** Confirmed total absence of pharmacy commercial pricing/billing logic.
- ✅ **Unified Clinical Architecture Evaluated:** Documented why Pharmacy currently bypasses `ClinicalOrder`.
- ✅ **Weaknesses & Gaps Identified:** Highlighted critical clinical safety, inventory, and architectural gaps.
- ✅ **Roadmap Defined:** Formulated concrete 3-stage implementation plan (Phases 2.8.1 - 2.8.3).
