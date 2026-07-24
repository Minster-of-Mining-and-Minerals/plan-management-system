# Phase 2.5.1.5 — Clinical Order Hardening Report

**NovaCure Clinical Platform — Senior EMR Engineering Hardening Sprint**

> [!NOTE]
> This document summarizes all changes, database migrations, model extensions, audit logs, RBAC permissions, lifecycle enhancements, and test suite verification performed during **Phase 2.5.1.5 — Clinical Order Hardening Sprint**.

---

## 1. Task Implementation Summary

### Task 1 — Clinical Order Status History
- **Database Table**: Created `clinical_order_status_histories` via migration [20260725000002-create-clinical-order-status-histories.js](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/migrations/20260725000002-create-clinical-order-status-histories.js).
- **Sequelize Model**: Created [clinicalOrderStatusHistory.js](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/orders/clinicalOrderStatusHistory.js) (`ClinicalOrderStatusHistory`).
- **Association**: `ClinicalOrder.hasMany(ClinicalOrderStatusHistory, { foreignKey: "order_id", as: "statusHistory" })`.
- **Automatic History Recording**: Every status change (`SUBMITTED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) automatically creates an immutable transition log capturing `previous_status`, `new_status`, `changed_by`, `reason`, and timestamp.

### Task 2 — Cancellation Reason Tracking
- **Database Migration**: Added `cancellation_reason` column to `clinical_orders` via migration [20260725000003-add-cancellation-reason-to-clinical-orders.js](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/migrations/20260725000003-add-cancellation-reason-to-clinical-orders.js).
- **Model Attribute**: Added `cancellation_reason` to [clinicalOrder.js](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/orders/clinicalOrder.js).
- **Service Enforcement**: `cancelOrder(orderId, cancellationReason, staffId)` enforces non-empty `cancellationReason`. Rejects cancellation of completed or already cancelled orders.

### Task 3 — Order Audit Events
- **Audit Integration**: Integrated `auditService.logAudit` into [clinicalOrderService.js](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/clinicalOrderService.js).
- **Action Tracing**:
  - `ORDER_CREATED`
  - `ORDER_ACCEPTED`
  - `ORDER_STARTED`
  - `ORDER_COMPLETED`
  - `ORDER_CANCELLED`
  - `RESULT_CREATED`
  - `RESULT_VERIFIED`
  - `RESULT_AMENDED`

### Task 4 — RBAC Hardening
- **Permissions Seeder**: Created seeder [20260725000002-seed-clinical-order-hardening-permissions.js](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/seeders/20260725000002-seed-clinical-order-hardening-permissions.js).
- **New Permissions**:
  - `orders:cancel`: Granted to Doctor, Admin, Super Admin.
  - `orders:amend`: Granted to Doctor, Admin, Super Admin.
- **Route Protection**: [clinicalOrderRoutes.js](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/routes/clinicalOrderRoutes.js) guards `PATCH /api/orders/:id/cancel` with `checkPermission("orders", "cancel")` and `POST /api/orders/:id/result/amend` with `checkPermission("orders", "amend")`.

### Task 5 — Result Amendment Tracking
- **Database Table**: Created `clinical_order_result_histories` via migration [20260725000004-create-clinical-order-result-histories.js](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/migrations/20260725000004-create-clinical-order-result-histories.js).
- **Sequelize Model**: Created [clinicalOrderResultHistory.js](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/orders/clinicalOrderResultHistory.js) (`ClinicalOrderResultHistory`).
- **Association**: `ClinicalOrderResult.hasMany(ClinicalOrderResultHistory, { foreignKey: "result_id", as: "amendmentHistory" })`.
- **Amendment Method**: `amendResult(orderId, payload, staffId)` preserves prior summary and JSONB test data in `ClinicalOrderResultHistory`, requires an explicit amendment `reason`, updates the active result, and emits audit event `RESULT_AMENDED`.

### Task 6 — Timeline Integration
- **Timeline Backfill**: Updated [timelineEventService.js](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/services/timelineEventService.js) to format `CLINICAL_ORDER` timeline event descriptions with cancellation reasons and status changes.

---

## 2. Database Changes Matrix

| Table Name | Change Type | Columns / FKs Added |
| :--- | :--- | :--- |
| `clinical_order_status_histories` | **NEW TABLE** | `history_id`, `order_id` (FK `clinical_orders`), `previous_status`, `new_status`, `changed_by` (FK `users`), `reason`, `created_at`, `updated_at` |
| `clinical_orders` | **COLUMN ADDITION** | `cancellation_reason` (TEXT, nullable) |
| `clinical_order_result_histories` | **NEW TABLE** | `history_id`, `result_id` (FK `clinical_order_results`), `previous_summary`, `previous_data`, `new_summary`, `new_data`, `changed_by` (FK `users`), `reason`, `created_at`, `updated_at` |

---

## 3. RBAC Permissions Matrix

| Permission Name | Resource | Action | Authorized Roles |
| :--- | :--- | :--- | :--- |
| `orders:create` | `orders` | `create` | Doctor, Nurse, Admin, Super Admin |
| `orders:view` | `orders` | `view` | Doctor, Nurse, Admin, Super Admin |
| `orders:accept` | `orders` | `accept` | Doctor, Admin, Super Admin |
| `orders:execute` | `orders` | `execute` | Doctor, Nurse, Admin, Super Admin |
| `orders:result_create` | `orders` | `result_create` | Doctor, Nurse, Admin, Super Admin |
| `orders:result_verify` | `orders` | `result_verify` | Doctor, Admin, Super Admin |
| `orders:result_review` | `orders` | `result_review` | Doctor, Admin, Super Admin |
| `orders:cancel` | `orders` | `cancel` | Doctor, Admin, Super Admin |
| `orders:amend` | `orders` | `amend` | Doctor, Admin, Super Admin |

---

## 4. API Endpoints & Routes Matrix

| Method | Endpoint Path | RBAC Permission | Controller Handler |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | `orders:create` | `clinicalOrderController.createOrder` |
| `GET` | `/api/orders/:id` | `orders:view` | `clinicalOrderController.getOrder` |
| `GET` | `/api/orders/encounter/:appointmentId` | `orders:view` | `clinicalOrderController.listEncounterOrders` |
| `GET` | `/api/orders/patient/:patientId` | `orders:view` | `clinicalOrderController.listPatientOrders` |
| `GET` | `/api/orders/department/:departmentId` | `orders:view` | `clinicalOrderController.listDepartmentQueue` |
| `PATCH` | `/api/orders/:id/accept` | `orders:accept` | `clinicalOrderController.acceptOrder` |
| `PATCH` | `/api/orders/:id/status` | `orders:execute` | `clinicalOrderController.updateOrderStatus` |
| `POST` | `/api/orders/:id/result` | `orders:result_create` | `clinicalOrderController.recordResult` |
| `PATCH` | `/api/orders/:id/cancel` | `orders:cancel` | `clinicalOrderController.cancelOrder` |
| `POST` | `/api/orders/:id/result/amend` | `orders:amend` | `clinicalOrderController.amendResult` |

---

## 5. Automated Test Verification Results

All 10 backend integration test suites were executed using Jest:

```bash
PASS tests/clinicalOrder.test.js
PASS tests/encounterFollowUp.test.js
PASS tests/followUpContinuity.test.js
PASS tests/followUpOutcome.test.js
PASS tests/clinicalFoundation.test.js
PASS tests/security/attachmentsPortal.test.js
PASS tests/security/authJwt.test.js
PASS tests/smoke/auth.test.js
PASS tests/smoke/health.test.js
PASS tests/smoke/rbac.test.js

Test Suites: 10 passed, 10 total
Tests:       1 skipped, 111 passed, 112 total
```

### Coverage Highlights in `clinicalOrder.test.js`:
- ✅ Order creation + status history (`SUBMITTED`).
- ✅ Department queue & order acceptance + status history (`ACCEPTED`).
- ✅ Result recording + status history (`COMPLETED`).
- ✅ Order cancellation with required `cancellation_reason` validation.
- ✅ Result amendment saving previous data into `ClinicalOrderResultHistory`.
- ✅ Verification of timeline event backfilling.

---

## 6. Frontend Build Verification

The Next.js production build compiler (`npm run build`) was executed:

```bash
 ✓ Compiled successfully in 15.4s
   Running TypeScript ...
 ✓ Generating static pages using 11 workers (3/3)
   Finalizing page optimization ...
```
**Result**: **0 TypeScript errors, 0 compilation errors**.

---

## 7. Backward Compatibility Assessment

- All existing Phase 2.5 REST contracts remain 100% backward compatible.
- `cancellation_reason` and history associations are non-breaking schema additions.
- The platform is now fully hardened and ready for **Phase 2.6 — Dedicated Laboratory Module**.
