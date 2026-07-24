# Phase 2.6.3 — Laboratory Queue & Worklist Architectural Analysis

**NovaCure Clinical Platform — Senior EMR Architectural Discovery Document**

---

## 1. Current Architectural Flow (Phases 2.5 → 2.6.2)

Currently, NovaCure manages laboratory requests through direct state modifications on `ClinicalOrder` (`order_type = 'LABORATORY'`) and `LaboratorySpecimen`:

1. **Order Creation**: `ClinicalOrder` is created with `status = 'SUBMITTED'` and `laboratory_status = 'WAITING_FOR_COLLECTION'`.
2. **Specimen Initialization**: `LaboratorySpecimen` record created with `collection_status = 'PENDING_COLLECTION'`.
3. **Specimen Collection**: `collectSpecimen` sets specimen status to `COLLECTED` and order status to `SPECIMEN_COLLECTED`.
4. **Specimen Reception & Acceptance**: Laboratory staff manually process reception (`RECEIVED`) and acceptance (`ACCEPTED`).
5. **Result Submission**: Technicians submit results via `submitLaboratoryResult` setting order status to `COMPLETED`.

---

## 2. Missing Operational Queue Concepts

While the domain entity states accurately reflect clinical order and specimen progression, **the laboratory department currently lacks an operational worklist engine**:

1. **No Task Delegation / Claiming**: Any staff member with permission can manipulate order and specimen states without explicitly claiming ownership of the work item.
2. **No Priority-Based Worklist Sorting**: Orders are queried as flat lists without automatic prioritization (`STAT` vs `URGENT` vs `ROUTINE`).
3. **No Operational State Queues**: Lab technicians cannot view focused operational queues for specific lifecycle stages:
   - **`COLLECTION` Queue**: Uncollected specimen requests needing phlebotomy / sample draw.
   - **`RECEPTION` Queue**: Samples in transit awaiting lab reception verification.
   - **`PROCESSING` Queue**: Samples accepted and currently under analyzer/bench processing.
   - **`RESULT_ENTRY` Queue**: Tested samples awaiting data entry into EMR.
   - **`VERIFICATION` Queue**: Completed result drafts awaiting supervisor verification.
4. **No Workload Tracking**: Operational metrics (waiting time, time in queue, staff workload) cannot be calculated without discrete queue state transitions.

---

## 3. Required Architectural Changes (Phase 2.6.3 Scope)

To bridge these gaps while strictly maintaining backward compatibility with Phase 2.5 and Phase 2.6 foundation models, we introduce **`LaboratoryWorkQueue`**:

```mermaid
graph TD
    CO[ClinicalOrder - order_type: LABORATORY] -->|Triggers| LWQI[LaboratoryWorkQueueItem]
    LS[LaboratorySpecimen] -->|Linked To| LWQI
    LWQI -->|Queue Types| QT[COLLECTION | RECEPTION | PROCESSING | RESULT_ENTRY | VERIFICATION]
    LWQI -->|Status Lifecycle| ST[WAITING --> CLAIMED --> IN_PROGRESS --> COMPLETED]
    ST -->|Priority Order| PR[STAT (1) > URGENT (2) > ROUTINE (3)]
```

### Key Components to Add:
1. **`laboratory_work_queue_items` Database Table & Sequelize Model**:
   - `id` (UUID PK), `specimen_id` (FK `laboratory_specimens`), `order_id` (FK `clinical_orders`), `queue_type` (`COLLECTION`, `RECEPTION`, `PROCESSING`, `RESULT_ENTRY`, `VERIFICATION`), `status` (`WAITING`, `CLAIMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `priority` (`STAT`, `URGENT`, `ROUTINE`), `assigned_staff_id` (FK `users`), `department_id` (FK `departments`), `entered_at`, `claimed_at`, `completed_at`.
2. **Automatic Queue Progression Service (`laboratoryQueueService.js`)**:
   - Hooked into `laboratoryService.js` state transitions to automatically close current queue item and initialize next queue stage.
3. **Priority Engine**:
   - Primary Sort: `STAT` $\to$ `URGENT` $\to$ `ROUTINE`.
   - Secondary Sort: `entered_at` (Oldest First).
4. **RBAC & REST Endpoints**:
   - Permissions: `laboratory:view_queue`, `laboratory:claim_work`, `laboratory:start_work`, `laboratory:complete_work`.
   - Routes mounted at `/api/laboratory/workqueue`.
5. **Frontend UI Panel (`LaboratoryWorklistPanel.tsx`)**:
   - Tabbed operational workbench with claim/start/complete buttons and live priority sorting.
