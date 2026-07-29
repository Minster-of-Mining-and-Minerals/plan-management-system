# Enterprise Dashboard API Documentation (Phase 2.5.4)

## Authentication & Permission Security
All Command Center API routes require a valid JWT Bearer Token (`Authorization: Bearer <token>`) and user permission `dashboard:view`.

---

### Endpoints Overview

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/overview` | `period`, `startDate`, `endDate` | Executive Overview with KPI sparklines & trend arrows |
| `GET` | `/api/dashboard/pipeline` | `period` | Active 8-Stage Encounter Pipeline & Bottlenecks |
| `GET` | `/api/dashboard/queues` | `period` | Queue monitoring for Lab, Rad, Pharmacy, Triage |
| `GET` | `/api/dashboard/doctor-productivity` | `period`, `doctor_id` | Doctor consultation metrics & productivity scores |
| `GET` | `/api/dashboard/nurse-metrics` | `period` | Nurse vitals, triage times & triage priority breakdown |
| `GET` | `/api/dashboard/laboratory-intelligence` | `period` | Lab incoming, verified, TAT, STAT compliance, tech load |
| `GET` | `/api/dashboard/radiology-intelligence` | `period` | Radiology imaging, critical findings, modality stats |
| `GET` | `/api/dashboard/pharmacy-intelligence` | `period` | Prescription dispensing, stock warnings, top meds |
| `GET` | `/api/dashboard/financial-executive` | `period` | Financial revenue timeframes, tenders, collection rates |
| `GET` | `/api/dashboard/departments` | `period` | Department load %, queue sizes, efficiency & SLA |
| `GET` | `/api/dashboard/diagnosis-intelligence` | `period` | Top ICD codes, working vs final diagnoses |
| `GET` | `/api/dashboard/order-intelligence` | `period` | Clinical order completion rates & turnaround times |
| `GET` | `/api/dashboard/care-continuity` | `period` | Follow-ups, readmissions, continuity score |
| `GET` | `/api/dashboard/timeline-intelligence` | `period`, `limit` | Live enterprise event stream feed |
| `GET` | `/api/dashboard/facility-stats` | `period` | Facility occupancy & provider utilization |
| `GET` | `/api/dashboard/drilldown/:metricKey` | `period` | Raw dataset records for interactive side drawer |
| `GET` | `/api/dashboard/role-view` | N/A | Role-tailored perspectival metric bundle |
| `GET` | `/api/dashboard/stats` | N/A | Backward compatible summary stats |
