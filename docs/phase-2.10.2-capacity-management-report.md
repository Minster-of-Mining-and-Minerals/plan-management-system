# Phase 2.10.2 — Enterprise Capacity, Resource & Throughput Management Platform Technical Report

**Date:** July 25, 2026  
**Status:** ✅ COMPLETED & PRODUCTION-READY  
**Architecture Alignment:** Extended the existing NovaCure clinical platform (ClinicalOrder, UnifiedClinicalQueueService, UnifiedClinicalSLAEngine, ClinicalOperationsAnalyticsService, ClinicalOperationsCenterService, TimelineEventService, AuditService, NotificationService, Appointment Engine) with an Enterprise Capacity, Resource & Throughput Management Platform without modifying or replacing any core domain.

---

## 1. Executive Overview

Phase 2.10.2 introduces proactive capacity management to NovaCure. While Phase 2.10.1 monitored hospital operations, Phase 2.10.2 actively **manages and optimizes capacity**: evaluating resource utilization, detecting overbooking and conflict bottlenecks, forecasting demand, automating resource allocation (with emergency overrides), and generating actionable operational recommendations across the entire hospital ecosystem.

---

## 2. Architecture & Service Extensions

### Database & Shared Enterprise Resource Models
- **Migration**: [`20260725000030-create-capacity-management-tables.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/migrations/20260725000030-create-capacity-management-tables.js) creating 5 new tables:
  1. `clinical_rooms`
  2. `clinical_equipment`
  3. `clinical_shifts`
  4. `clinical_resource_assignments`
  5. `clinical_capacity_snapshots`
- **Models** (`backend/models/capacity/`):
  - [`clinicalRoom.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/capacity/clinicalRoom.js)
  - [`clinicalEquipment.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/capacity/clinicalEquipment.js)
  - [`clinicalShift.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/capacity/clinicalShift.js)
  - [`clinicalResourceAssignment.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/capacity/clinicalResourceAssignment.js)
  - [`clinicalCapacitySnapshot.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/models/capacity/clinicalCapacitySnapshot.js)

### Backend Engine Services (`backend/services/capacity/`)
1. **`ClinicalCapacityService`**: Calculates hospital, department, provider, room, equipment, and appointment capacity metrics, utilization %, peak utilization, and capacity trends.
2. **`ClinicalResourceAllocationService`**: Manages staff, room, and equipment allocations, conflict detection, emergency overrides, assignment releases, audit logging, and timeline events (`RESOURCE_REALLOCATED`).
3. **`ProviderAvailabilityService`**: Tracks clinician real-time state (`AVAILABLE`, `BUSY`, `CONSULTING`, `PROCEDURE`, `BREAK`, `LEAVE`, `EMERGENCY`, `OFF_DUTY`) and estimates next availability slot.
4. **`ClinicalForecastService`**: Forecasts 24-hour and 7-day demand, peak consultation/lab/radiology/pharmacy hours, and department overload risks (ML-ready architecture).
5. **`AppointmentCapacityOptimizer`**: Analyzes slot availability, overbooking risks, provider idle time, expected wait times, and patient backlog.
6. **`ClinicalThroughputService`**: Calculates patients/hour, orders/hour, department turnaround, and waiting/completion trends.
7. **`ClinicalRecommendationService`**: Evaluates capacity, SLA, queue, and forecast outputs to generate actionable recommendations with confidence scores.
8. **`ClinicalCapacityDashboardService`**: Aggregates executive capacity metrics, SLA risks, forecast risks, and recommended actions.

### Backend API Routes (`backend/routes/clinicalCapacityRoutes.js`)
Mounted at `/api/operations/capacity` in [`app.js`](file:///c:/Users/Amanuel%20Daniel/Desktop/PLC-AND-HOLDING-GROUPS/novacure-platform/backend/app.js) with 7 RBAC permissions (`operations:capacity_view`, `operations:capacity_manage`, `operations:resource_allocate`, `operations:forecast_view`, `operations:recommendation_view`, `operations:availability_view`, `operations:throughput_view`).

### Frontend UI Components (`frontend/src/features/capacity/components/`)
- **`capacityApi.ts`**: RTK Query slice providing full caching, refetching, and tag invalidation.
- **Components**:
  - `CapacityExecutiveSummary.tsx`
  - `DepartmentCapacityPanel.tsx`
  - `ProviderAvailabilityBoard.tsx`
  - `ForecastDashboard.tsx`
  - `ResourceAllocationBoard.tsx`
  - `OperationalRecommendationsPanel.tsx`
  - `ThroughputDashboard.tsx`
  - `CapacityDashboard.tsx`

---

## 3. Test Coverage & Verification

- **New Test Suite**: `tests/clinical-capacity-management.test.js` (16 tests) covering capacity calculations, resource allocations, emergency overrides, provider availability, demand forecasting, appointment optimization, throughput, recommendation workflow, executive dashboard, audit, and timeline integration.
- **Pass Rate**: **100% (16 / 16 tests passed)**
- **Cumulative Pass Rate**: **100% (161 / 161 total tests across all 14 test suites)**
