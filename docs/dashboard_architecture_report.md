# Enterprise Dashboard Architecture Report (Phase 2.5.4)

## Architecture Overview
The NovaCure EMR Dashboard has evolved into an Enterprise Clinical Operations Command Center comparable to Epic, Oracle Health (Cerner Millennium), and InterSystems TrakCare. The architecture preserves 100% of existing UI layouts, cards, and charts while expanding backend services to compute real-time operational intelligence, active encounter pipeline stages, queue bottleneck indicators, doctor productivity scores, nurse triage metrics, and financial executive analytics.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Frontend Command Center (React)                      │
│ (AdminDashboardPage, EncounterPipelineWidget, Sparklines, DrillDown)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          RTK Query Layer                               │
│  (useGetExecutiveOverviewQuery, useGetEncounterPipelineQuery, etc.)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │  HTTP GET /api/dashboard/* + Socket.IO
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Express Command Center Dashboard Routes                │
│            (verifyToken + checkPermission("dashboard:view"))          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Dashboard Analytics Service & Cache                    │
│      (15s TTL Cache, Pipeline Calculator, Queue Bottleneck Monitor)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Sequelize ORM Layer                            │
│  (User, StaffAppointment, ClinicalOrder, CashierPayment, WorkflowTask) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database Cluster                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Architectural Highlights
1. **Zero UI Breakdown**: All existing card grid structures, Recharts visual components, colors, and design variables were strictly preserved.
2. **8-Stage Active Encounter Pipeline**: Real-time stage tracking (`Registration → Waiting → Triage → Consultation → Orders Running → Result Review → Cashier → Completed`) with live counts, wait times, and bottleneck alerts.
3. **Multi-Dimensional Filters**: Period filtering (**Today**, **Yesterday**, **Week**, **Month**, **Quarter**, **Year**, **Custom**) combined with Department, Provider, and Priority filters.
4. **Drill-Down Analytics Drawer**: Side drawer allowing users to inspect raw dataset records, filter by column, and export data as CSV/Print format.
5. **Real-Time WebSocket Integration**: Socket.IO event handler (`sockets/dashboardSocketHandler.js`) broadcasting live updates to command center workstations without page reloads.
