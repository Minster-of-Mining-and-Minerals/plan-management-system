# Dashboard Enhancement and Cross-Domain Reporting Integration Report

**Project:** `MoM/projects/plan-management-system`  
**Phase:** Dashboard Navigation, Plan Hierarchy Filtering, Search, and Cross-Domain Analytics  
**Date:** 2026-10-24  
**Status:** Completed & Verified

---

## 1. Executive Summary

This phase successfully enhanced the national dashboard of the Ministry of Mines Plan Management System (`PMS`) by:
1. **Preserving and upgrading the Plan Dashboard** with specific-plan search (matching plan drafts, government structures, and hierarchical plan nodes—e.g. searching for `gold` matches the "National Mining Development Plan" and its goal "Increase Gold Production") and dynamic hierarchy-depth filtering across Strategic Focus (Level 1), Goal (Level 2), and KPI (Level 3).
2. **Preserving the Issue Dashboard** with full domain filtering and status analytics without regressions.
3. **Integrating 3 new domain dashboard tabs** in the unified navigation:
   - **Regional Dashboard:** Federation-wide roster KPIs, regional selection, live departmental placement rates and regional plan scorecards, plus explicitly labeled static previews for multi-regional production forecasts.
   - **Companies Dashboard:** Enterprise registry overview, live company details and licensing breakdown, plus explicitly labeled static previews for industrial mineral export volumes and royalty forecasts.
   - **Purchasing Centers Dashboard:** Centralized gold oversight with canonical mass aggregations (in grams), daily reporting completeness status, seller distributions (ASM vs Company), individual center drilldown, and explicitly labeled static previews for LBMA international gold spot price benchmarks and central bank incentive rates.
4. **Enforcing on-demand progressive loading and security boundaries:** Tabs only mount and fetch their respective domain APIs when activated, preventing unauthorized data prefetching and eliminating N+1 background overhead.

---

## 2. Dashboard Status Matrix

| Dashboard | Real Data Available | Dynamic Metrics Implemented | Static Preview Sections | Authorization Verified |
|---|---|---|---|---|
| **Plan Dashboard** | **Yes (Full)** | Plan search (title, nodes, structures), hierarchical depth filtering (SF -> Goal -> KPI), plan versions, execution progress, structure breakdown, sharing modes, and node subtree isolation | None (100% Dynamic) | **Verified** (`plans:read`, `plans:read_all`, federal/sector tenant isolation) |
| **Issue Dashboard** | **Yes (Full)** | Issue counts, open/resolved/closed statuses, category distribution, severity breakdown, organizational scope | None (100% Dynamic) | **Verified** (`issues:read`, `issues:read_all`) |
| **Regional Dashboard** | **Yes (Partial - Level B)** | Registered regions roster, active administrations count, regional RBAC roles, live regional dashboard (users, placement rates, departmental structure, regional plan scorecard) | Multi-regional mineral production forecasting by region & environmental reporting compliance index | **Verified** (`regions:read`, `regions:manage`, `regional_dashboard:read`, and regional tenant scope) |
| **Companies Dashboard** | **Yes (Partial - Level B)** | Registered commercial mining companies roster, active/suspended status, enterprise RBAC roles, live company dashboard (license number, TIN, users, departmental divisions) | Industrial export volume by mineral & estimated federal royalty contribution by mining company | **Verified** (`companies:read`, `companies:manage`, `company_dashboard:read`, and company tenant scope) |
| **Purchasing Centers Dashboard** | **Yes (Partial - Level B)** | Canonical gold mass totals (grams), transaction counts, today's national performance, center-level intake summaries, seller breakdown (ASM vs Companies), daily report completion status | International gold price index (LBMA PM spot fix in USD/oz) & NBE artisan gold premium incentive rates | **Verified** (`purchasing_centers:read`, `gold_purchases:read`, `purchasing_center_dashboard:view`, and center scope) |

---

## 3. Discovered Dashboard Architecture & Reused Endpoints

### 3.1 Architecture Overview
- **Main Dashboard Container (`/dashboard`):** `GlobalDashboardView.tsx` controls the top-level tablist, reads and synchronizes the active tab state via URL query parameters (`?tab=...`), checks user permissions using `usePermissions()`, and on-demand renders only the active tab component.
- **Plan Dashboard Architecture:** `PlanDashboardView.tsx` with progressive sub-tabs (`Overview`, `Progress`, `Departments & Users`). It communicates with `useGetPlanExecutionDashboardQuery` and `useGetPlanVersionsQuery`.
- **Backend Service Layer:** `backend/services/planExecutionDashboardService.js` provides progressive query sections (`overview`, `progress_tree`, `department_user`, `full`) and cached calculation pipelines (`computeMasterExecutionProgress`, `buildProgressTreeForMaster`).

### 3.2 Reused APIs and Endpoints
1. `GET /api/v1/plans/execution-dashboard`:
   - Supports sections: `overview`, `progress_tree`, `department_user`.
   - Enhanced with query parameters: `search`, `master_plan_version_id`, `government_structure_id`, `status`, `sharing_mode`, `period_version_id`.
2. `GET /api/v1/plans/versions`:
   - Enhanced with search query filter across `draft_name`, start/end years, plan node titles (subquery), and structure names (subquery).
3. `GET /api/v1/regions` & `GET /api/v1/regions/:id/dashboard`:
   - Returns live region registry and regional administrative dashboard aggregates.
4. `GET /api/v1/companies` & `GET /api/v1/companies/:id/dashboard`:
   - Returns live company registry and enterprise operational dashboard aggregates.
5. `GET /api/v1/gold-purchasing/oversight`:
   - Returns canonical gold mass totals (grams), transaction counts, daily report completions, and seller distributions.
6. `GET /api/v1/purchasing-centers/:id/dashboard` & `GET /api/v1/gold-purchasing/centers/:id/dashboard`:
   - Returns individual purchasing center transactions and operational status.

---

## 4. Plan Search & Hierarchy Depth Filtering Implementation

### 4.1 Plan Search (`PlanSearchSelector.tsx`)
- **Supported Search Fields:**
  - Plan Draft Title (`draft_name`)
  - Start Year & End Year (`start_year`, `end_year`)
  - Hierarchical Plan Nodes (matched via subquery `SELECT plan_version_id FROM plan_nodes WHERE title ILIKE :term`)
  - Government Structure / Sector Name (matched via subquery `SELECT government_structure_id FROM government_structures WHERE name ILIKE :term`)
- **Debouncing & Efficiency:**
  - Search queries are debounced at 300ms in frontend hooks before dispatching requests.
  - Bounded result sets with badge indicators for status, year range, and execution status.
  - Selecting a plan dynamically binds `selectedPlanVersionId` and focuses the entire dashboard on that plan.

### 4.2 Hierarchy-Depth Filtering (`PlanHierarchyFilterBar.tsx`)
- **Supported Hierarchy Levels:**
  - `All Levels`: Full plan tree.
  - `Strategic Focus (Level 1, type: "strategic")`: Isolates selected Strategic Focus and all its descending Goals and KPIs.
  - `Goal (Level 2, type: "goal")`: Isolates selected Goal and its child KPIs.
  - `KPI (Level 3, type: "kpi")`: Focuses directly on the single KPI and its execution metrics.
- **Cascading Filter Invalidation:**
  - Changing the selected plan resets hierarchy depth to `all` and clears selected node IDs.
  - Changing a Strategic Focus resets any previously selected Goal and KPI.
  - Changing a Goal resets any previously selected KPI.
  - The UI presents an active subtree banner indicating the currently focused level and node title, with an immediate "Clear Scope" action.

---

## 5. Domain Dashboards Integration

### 5.1 Regional Dashboard Tab (`RegionalDashboardTab.tsx`)
- **Live Functionality:**
  - National overview KPI cards (Total registered regions, operational bureaus, RBAC profiles).
  - Region selector for federal administrators to switch jurisdictions.
  - Embedded `RegionalDashboardView` with `overrideRegionId` rendering live user placement rates, departmental trees, and regional plan scorecards.
- **Static Preview (Clearly Labeled):**
  - Multi-regional mineral production forecasting (Oromia, Benishangul-Gumuz, Tigray, Sidama, Amhara, Gambela in metric tons).
  - Regional environmental and shipment reporting compliance index.
  - Explicit warning notice referencing future API: `GET /api/v1/regions/analytics/production-forecast`.

### 5.2 Companies Dashboard Tab (`CompaniesDashboardTab.tsx`)
- **Live Functionality:**
  - National enterprise overview KPI cards (Total registered commercial operators, active vs suspended companies, enterprise RBAC profiles).
  - Company selector dropdown for federal oversight.
  - Embedded `CompanyDashboardView` with `overrideCompanyId` rendering live operator metadata, license numbers, TIN, and organizational structure.
- **Static Preview (Clearly Labeled):**
  - Industrial mineral export volume by mineral category (Refined Gold, Tantalite, Lithium Concentrate, Potash, Industrial Marble).
  - Estimated federal royalty distribution by concession operator.
  - Explicit warning notice referencing future API: `GET /api/v1/companies/analytics/exports-revenue`.

### 5.3 Purchasing Centers Dashboard Tab (`PurchasingCentersDashboardTab.tsx`)
- **Live Functionality:**
  - Toggle between "Federal Overview" and "Center Drilldown".
  - Canonical gold mass rollups in grams (`canonical_quantity_grams`), total transaction counts, and ETB values.
  - Today's performance vs period summaries.
  - Seller category breakdown comparing Registered Mining Companies vs Artisanal & Small-Scale Mining (ASM) sellers.
  - Center-by-center daily report submission and completeness status.
- **Static Preview (Clearly Labeled):**
  - International gold spot price reference index (LBMA Gold PM Fix in USD/oz).
  - National Bank of Ethiopia artisan gold incentive premium rates (35%–45% incentives).
  - Explicit warning notice referencing future API: `GET /api/v1/gold/market-benchmarks`.

---

## 6. Files Changed and Created

### 6.1 Backend Files
| File Path | Status | Description |
|---|---|---|
| `backend/controllers/plan/planController.js` | Modified | Enhanced `getPlanVersions` search filter to query draft names, node titles, and government structure names |
| `backend/services/planExecutionDashboardService.js` | Modified | Added node `type`, `level`, `weight`, `target_unit`, `parent_id` to tree mapper; enhanced search query matching across nodes and structures |
| `backend/package.json` | Modified | Added `test:dashboard-enhancements` script |
| `backend/scripts/verify-dashboard-enhancements.js` | Created | Comprehensive verification script for search, hierarchy tree depth properties, subtree filtering, and domain registries |

### 6.2 Frontend Files
| File Path | Status | Description |
|---|---|---|
| `frontend/src/features/dashboard/GlobalDashboardView.tsx` | Modified | Upgraded dashboard container to 5 tabs with on-demand rendering and permission gating |
| `frontend/src/features/dashboard/RegionalDashboardTab.tsx` | Created | Dedicated regional dashboard tab with live region switching, roster KPIs, and static forecast preview |
| `frontend/src/features/dashboard/CompaniesDashboardTab.tsx` | Created | Dedicated companies dashboard tab with live company selector, enterprise KPIs, and static royalty preview |
| `frontend/src/features/dashboard/PurchasingCentersDashboardTab.tsx` | Created | Dedicated purchasing centers tab with federal oversight, center drilldown, and static LBMA benchmark preview |
| `frontend/src/features/plan-management/dashboard/types.ts` | Modified | Enhanced `DashboardProgressNode` and `DashboardFilters` with hierarchy depth and plan search types |
| `frontend/src/features/plan-management/dashboard/hooks/usePlanDashboardFilters.ts` | Modified | Added cascading filter reset, hierarchy node collections, and subtree tree calculation |
| `frontend/src/features/plan-management/dashboard/components/PlanSearchSelector.tsx` | Created | Searchable combobox for plans with debouncing and metadata tags |
| `frontend/src/features/plan-management/dashboard/components/PlanHierarchyFilterBar.tsx` | Created | Hierarchy depth selector (SF -> Goal -> KPI) with scope banner |
| `frontend/src/features/plan-management/dashboard/components/PlanDashboardFiltersBar.tsx` | Modified | Integrated search and hierarchy depth filter bars |
| `frontend/src/features/plan-management/dashboard/tabs/ProgressTab.tsx` | Modified | Connected filtered hierarchy tree and active scope banner |
| `frontend/src/features/plan-management/dashboard/tabs/OverviewTab.tsx` | Modified | Displayed active hierarchy subtree scope notice with node progress |
| `frontend/src/features/regional-management/RegionalDashboardView.tsx` | Modified | Added `overrideRegionId` and `hideHeaderNavigation` props |
| `frontend/src/features/company-management/CompanyDashboardView.tsx` | Modified | Added `overrideCompanyId` and `hideHeaderNavigation` props |
| `frontend/src/features/purchasing-center-management/PurchasingCenterDashboardView.tsx` | Modified | Added `overrideCenterId` and `hideHeaderNavigation` props |

---

## 7. Verification & Test Results

1. **TypeScript Type Verification (`npx tsc --noEmit`):**
   - **Result:** Exit Code 0 (Zero type errors).
2. **Dashboard Enhancement Automated Suite (`npm run test:dashboard-enhancements`):**
   - **Test 1 (Plan Search with keyword "gold"):** Found 1 plan ("National Mining Development Plan") by matching plan goal "Increase Gold Production".
   - **Test 2 (Hierarchy Node Properties):** Verified Level 1 Strategic Focus ("Mineral Resources Development Programme"), Level 2 Goal ("Mining licensing and operations administration"), and Level 3 KPI ("Operational throughput").
   - **Test 3 (Subtree Depth Filtering Simulation):** Verified exact subtree isolation for Strategic Focus (1 root), Goal (1 root), and KPI (1 root).
   - **Test 4 (Domain Registries):** Verified 10 regions, 4 companies, and 11 purchasing centers loaded from database.
   - **Result:** 100% Passed.
3. **Existing Dashboard Progressive Loading Suite (`npm run test:dashboard-progressive`):**
   - **Result:** 100% Passed.
4. **Existing Cache Coherency Suite (`npm run test:cache-coherency`):**
   - **Result:** 100% Passed.
5. **Existing Rollup Suite (`npm run test:rollup`):**
   - **Result:** 100% Passed.

---

## 8. Next Steps & Future API Contracts for Unimplemented Features

To transition the clearly labeled static previews to Level A dynamic reporting in subsequent phases:
1. **Multi-Regional Production Telemetry:** Implement `GET /api/v1/regions/analytics/production-forecast` to ingest regional GIS data and quarterly artisanal production returns.
2. **Industrial Mineral Exports & Royalties:** Implement `GET /api/v1/companies/analytics/exports-revenue` connected to customs export clearances and revenue authority royalty receipts.
3. **International Gold Market Telemetry:** Implement `GET /api/v1/gold/market-benchmarks` with scheduled cron jobs polling LBMA daily fixes and NBE foreign exchange rate differentials.
