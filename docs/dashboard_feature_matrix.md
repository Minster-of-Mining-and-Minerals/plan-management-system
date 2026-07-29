# Enterprise Dashboard Feature Matrix (Phase 2.5.4)

| Domain | Feature Description | Backend Source | Command Center Status |
| :--- | :--- | :--- | :--- |
| **Enterprise KPI Layer** | Sparklines, previous period comparison, % change, trend arrows | `DashboardAnalyticsService.getExecutiveOverview` | **Production Ready** |
| **Encounter Pipeline** | 8-Stage visual tracker with wait times, bottleneck & SLA alerts | `DashboardAnalyticsService.getEncounterPipeline` | **Production Ready** |
| **Queue Monitoring** | Reception, Triage, Lab, Rad, Pharmacy, Cashier queue sizes & utilization % | `DashboardAnalyticsService.getQueueMonitoring` | **Production Ready** |
| **Doctor Productivity** | Consultations, duration, orders requested/reviewed, productivity scores | `DashboardAnalyticsService.getDoctorProductivity` | **Production Ready** |
| **Nurse Dashboard** | Vitals completed, triaged, triage duration, med admins, escalations | `DashboardAnalyticsService.getNurseMetrics` | **Production Ready** |
| **Laboratory Intelligence**| Incoming orders, specimens, QC %, verified results, TAT, tech workload | `DashboardAnalyticsService.getLaboratoryIntelligence` | **Production Ready** |
| **Radiology Intelligence** | Imaging pending, scanning, reporting, critical findings, modality counts | `DashboardAnalyticsService.getRadiologyIntelligence` | **Production Ready** |
| **Pharmacy Intelligence**  | Prescriptions, dispensed, low stock alerts, controlled drugs, top meds | `DashboardAnalyticsService.getPharmacyIntelligence` | **Production Ready** |
| **Financial Executive**    | Daily/weekly/monthly/quarterly/yearly revenue, tenders, refunds | `DashboardAnalyticsService.getFinancialExecutive` | **Production Ready** |
| **Department Workload**    | Department load %, queue, active staff, efficiency & SLA compliance | `DashboardAnalyticsService.getDepartmentPerformance` | **Production Ready** |
| **Diagnosis Intelligence** | Top ICD diagnoses, working vs final diagnoses, conversion rates | `DashboardAnalyticsService.getDiagnosisIntelligence` | **Production Ready** |
| **Clinical Orders**        | Orders by type, completion %, TAT, stat/critical orders | `DashboardAnalyticsService.getClinicalOrderIntelligence` | **Production Ready** |
| **Care Continuity**        | Follow-ups created/completed/missed, readmissions, care score | `DashboardAnalyticsService.getCareContinuityAnalytics` | **Production Ready** |
| **Timeline Feed**          | Enterprise event stream filterable by module, user, and severity | `DashboardAnalyticsService.getTimelineIntelligence` | **Production Ready** |
| **Drill-Down Analytics**   | Interactive side drawer for raw record inspection & CSV export | `DashboardAnalyticsService.getDrillDownRecords` | **Production Ready** |
| **Interactive Filtering**   | Multi-period dropdown (Today, Yesterday, Week, Month, Quarter, Year) | `DashboardAnalyticsService.getDateRange` | **Production Ready** |
