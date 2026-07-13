# Migration Audit & Refactoring Report

**Project:** NovaCure Platform  
**Date:** 2026-07-13  
**Status:** Phase 1 consolidation applied · Single-run baseline ready for activation

---

## Executive Summary

The project already underwent a **partial baseline refactor** (Jan 2026) that squashed 40+ legacy migrations into `20260101000001`–`20260101000008`. This pass:

- Reduced the **active chain from 32 → 25** migrations by merging corrective/patch migrations
- Added **idempotent helpers** and a **TABLE_DROP_ORDER** for safe rollbacks
- Prepared a **single orchestrator migration** (`20260101000000-complete-database-schema.js`) for fresh installs
- Fixed **duplicate timestamp collision** (`20260612000001` × 2)
- Merged **billing + cashier** into one finance migration

**Current modes:**

| Mode | How to run |
|------|------------|
| **Incremental (default today)** | `npx sequelize-cli db:migrate` — runs 25 domain migrations |
| **Single-run baseline (opt-in)** | `node scripts/archive-pre-squash-migrations.js` then `db:migrate` — 1 SequelizeMeta entry |
| **Existing DB meta squash** | `node scripts/squash-sequelize-meta.js` after baseline activation |

---

## A. Removed / Archived Migrations

| File | Reason |
|------|--------|
| `20260102000009-add-slip-config-to-system-branding.js` | **Duplicate** — `slip_config` already in `20260101000007` createTable |
| `20260107000001-ensure-diagnosis-template-schema.js` | **Corrective duplicate** — idempotency merged into `20260106000001` |
| `20260108000001-add-notification-category.js` | **Merged** into `20260104000001` notifications createTable |
| `20260605000007-add-prescription-signature-to-branding.js` | **Merged** into `20260528000001` prescription ecosystem |
| `20260605000008-clear-logo-from-prescription-signatures.js` | **Data-only fix** — not schema; belongs in seeder/one-off script |
| `20260611000001-allow-multiple-staff-diagnosis-forms.js` | **Merged** — `sort_order` + non-unique index in `20260105000001` |
| `20260712000002-create-cashier-ecosystem.js` | **Merged** into `20260712000001-create-billing-ecosystem.js` |
| `20260612000001-create-medical-diagrams.js` | **Replaced** by `20260612000002-create-medical-diagrams.js` (timestamp fix) |

**Legacy archive (pre-Jan-2026 baseline):** 48 files in `migrations/archive/legacy/` — already superseded, kept for history.

---

## B. Merged Migrations

| Original | Merged into | Changes absorbed |
|----------|-------------|------------------|
| `20260102000009` | `20260101000007` | `system_branding.slip_config` |
| `20260107000001` | `20260106000001` | Idempotent table/column checks, starter template seed guard |
| `20260108000001` | `20260104000001` | `notifications.category`, composite index |
| `20260605000007` | `20260528000001` | `system_branding.prescription_signature_file` |
| `20260611000001` | `20260105000001` | `diagnosis_form_configs.sort_order`, multi-form index |
| `20260712000002` | `20260712000001` | Cashier tables, payment columns, cashier RBAC |

---

## C. Dependency Problems Found

### C.1 Duplicate timestamp (FIXED)

Two files shared `20260612000001`:

- `create-medical-certificate-ecosystem.js`
- `create-medical-diagrams.js`

**Sequelize execution order was undefined.** Diagrams migration renamed to `20260612000002`.

### C.2 Circular / ordering risks (acceptable)

| Relationship | Notes |
|--------------|-------|
| `form_fields` ↔ `form_field_groups` | Groups created first; fields reference groups — OK |
| `diagnosis_form_configs` → `form_fields` | Columns added after both tables exist — OK |
| `medical_diagrams.category_id` → `medical_diagram_categories` | Categories migration runs after diagrams — uses addColumn — OK |
| `cashier_payments` → `appointment_billing_accounts` | Cashier created after billing — OK |

### C.3 Seed data in migrations (FLAGGED)

These are **not schema** but remain in the chain for demo completeness:

- `20260615000001-seed-ophthalmology-diagnosis-template.js`
- `20260706000001-seed-ophthalmology-lab-report-template.js`
- `20260707000001-upgrade-ophthalmology-form-engine-v2.js` (schema + data transform)

**Recommendation:** Move to `backend/seeders/` in a follow-up; keep in orchestrator chain until then.

### C.4 Permission seeding in domain migrations

Billing, prescription, pharmacy migrations insert permissions inline. **Idempotent** (checks existing). Acceptable for monolith; consider central permission seeder long-term.

---

## D. Rollback Problems Fixed

### D.1 Enhanced utilities (`migrations/_helpers/migrationUtils.js`)

| Helper | Purpose |
|--------|---------|
| `tableExists` / `columnExists` / `indexExists` | Idempotent guards |
| `safeAddColumn` / `safeRemoveColumn` | Skip if already applied / absent |
| `createTableIfNotExists` | No duplicate table errors |
| `dropTableIfExists` | Safe down() |
| `dropTablesInOrder` | Child-before-parent drops |
| `TABLE_DROP_ORDER` | Full schema teardown sequence |

### D.2 Billing migration down() (FIXED)

Now drops in order:

```
payment_tenders → cashier_payments → cashier_sessions → receipt_sequences
→ appointment_billing_entries → appointment_billing_accounts → billing_services → billing_service_categories
```

Uses `dropTableIfExists` and removes cashier permission resources.

### D.3 Orchestrator down()

`archive/pending/20260101000000-complete-database-schema.js`:

1. Runs each step's `down()` in **reverse order**
2. Falls back to `TABLE_DROP_ORDER` for any remaining objects

### D.4 Known remaining rollback gaps

| Migration | Issue | Mitigation |
|-----------|-------|------------|
| `20260107000001` (removed) | Was no-op down | N/A — removed |
| Seed migrations | down() may delete demo data | Expected; document in deploy runbooks |
| `20260707000001` | Complex form engine transform | down() is no-op by design |

---

## E. Final Migration Order

### E.1 Active incremental chain (25 steps)

```
 1. 20260101000001-create-permissions-and-rbac.js
 2. 20260101000002-create-users.js
 3. 20260101000003-create-user-rbac-junctions.js
 4. 20260101000004-create-departments-and-user-titles.js
 5. 20260101000005-create-user-profiles.js
 6. 20260101000006-create-form-field-system.js
 7. 20260101000007-create-system-branding-and-audit-logs.js
 8. 20260101000008-create-attachments.js
 9. 20260103000001-create-patient-schedules.js
10. 20260104000001-create-staff-appointments-and-notifications.js
11. 20260105000001-create-diagnosis-form-system.js
12. 20260106000001-create-diagnosis-templates.js
13. 20260109000001-create-medical-workflow.js
14. 20260528000001-create-prescription-ecosystem.js
15. 20260608000001-create-pharmacy-ecosystem.js
16. 20260609000001-create-prescription-pharmacy-forwards.js
17. 20260610000001-pharmacy-forward-lifecycle.js
18. 20260612000001-create-medical-certificate-ecosystem.js
19. 20260612000002-create-medical-diagrams.js
20. 20260613000001-create-medical-diagram-categories.js
21. 20260614000001-create-clinical-suggestions.js
22. 20260615000001-seed-ophthalmology-diagnosis-template.js
23. 20260706000001-seed-ophthalmology-lab-report-template.js
24. 20260707000001-upgrade-ophthalmology-form-engine-v2.js
25. 20260712000001-create-billing-ecosystem.js
```

### E.2 Single-run baseline (1 SequelizeMeta entry)

After activation: only `20260101000000-complete-database-schema.js` (orchestrator).

Chain definition: `migrations/_helpers/baseline/chainOrder.js`

---

## F. Schema Dependency Diagram (text)

```
permissions ──┬── roles ── role_permissions
              └── permission_groups ── permission_group_permissions

users ──┬── user_roles ── roles
        ├── user_permission_groups
        ├── internal_user_profiles ── departments, user_titles
        ├── patient_profiles ── patient_field_values
        └── attachments

form_field_groups ── form_fields
        ↑ diagnosis_config_id / diagnosis_template_id

diagnosis_templates ── diagnosis_form_configs ── diagnosis_records
staff_appointments ──┬── medical_history_logs
                     ├── workflow_tasks
                     └── appointment_billing_accounts ── appointment_billing_entries
                              └── cashier_payments ── payment_tenders
patient_schedules ── staff_appointments

prescription_* ── prescriptions ── prescription_items
pharmacy_* ── pharmacy_prescriptions ── pharmacy_prescription_items
prescription_pharmacy_forwards ── forward_audits / forward_files

medical_diagram_categories ── medical_diagrams
medical_certificate_templates ── medical_certificates
clinical_suggestions ── user_suggestion_usage

cashier_sessions ── cashier_payments
receipt_sequences (standalone sequence counter)
billing_services ── billing_service_categories (optional FK)
```

---

## G. Data Safety Notes

| Action | Data loss risk |
|--------|----------------|
| Removing patch migrations | **None** — schema unchanged |
| Merging cashier into billing | **None** on existing DBs that already ran both |
| Deleting `20260605000008` | **None** — one-time logo cleanup only |
| `db:migrate:undo:all` on populated DB | **HIGH** — drops all tables |
| Baseline activation on existing DB | **None** if `squash-sequelize-meta.js` used correctly |

**Flagged:** Moving seed migrations to seeders requires keeping seed data reproducible via `db:seed:all`.

---

## H. Seed Refactoring Recommendations

| Current location | Recommendation |
|------------------|----------------|
| `20260615000001-seed-ophthalmology-*` | Move to `seeders/` |
| `20260706000001-seed-ophthalmology-lab-*` | Move to `seeders/` |
| Permission inserts in billing/prescription migrations | Keep idempotent inserts OR centralize in `seed-role-permissions-matrix.js` |
| `20260605000008` (removed) | Optional one-time seeder if logo cleanup still needed on old DBs |

All seeders should use **UPSERT / existence checks** (pattern already in billing migration).

---

## I. Deliverables Checklist

| Deliverable | Location | Status |
|-------------|----------|--------|
| Refactored migration files | `backend/migrations/` | ✅ 25-step chain |
| Rollback helpers | `migrations/_helpers/migrationUtils.js` | ✅ |
| Single-run orchestrator | `migrations/archive/pending/20260101000000-complete-database-schema.js` | ✅ Ready |
| Chain order manifest | `migrations/_helpers/baseline/chainOrder.js` | ✅ |
| Meta squash script | `scripts/squash-sequelize-meta.js` | ✅ |
| Archive activation script | `scripts/archive-pre-squash-migrations.js` | ✅ |
| This audit report | `docs/MIGRATION_AUDIT_REPORT.md` | ✅ |

---

## J. Remaining Manual Actions

### For development (current default)

No action required. Run migrations as usual:

```bash
cd backend && npx sequelize-cli db:migrate
```

### To activate single-run baseline (new environments)

```bash
cd backend
node scripts/archive-pre-squash-migrations.js   # moves 25 files → archive/pre-squash/
npx sequelize-cli db:migrate                    # runs orchestrator only
```

### For existing databases already on the 32-step chain

```bash
cd backend
node scripts/squash-sequelize-meta.js            # replaces 32 meta rows with 1
# Do NOT re-run archive-pre-squash if migrations already applied
```

### Optional follow-ups

1. Move ophthalmology seed migrations → `seeders/`
2. Normalize index names to `idx_<table>_<column>` (cosmetic; not blocking)
3. Add FK name convention `fk_<child>_<parent>` on next schema change
4. Run full `db:migrate:undo:all` + `db:migrate` on staging to validate rollbacks

---

## K. Naming Standardization (target state)

| Object | Convention | Current state |
|--------|------------|---------------|
| Tables | `snake_case`, plural | ✅ Mostly consistent |
| Columns | `snake_case` | ✅ |
| Indexes | `idx_<table>_<columns>` | ⚠️ Mixed (`notifications_recipient_category_read_idx`, IF NOT EXISTS raw SQL) |
| FK constraints | `fk_<table>_<ref>` | ⚠️ Sequelize auto-names; not enforced |
| Unique | `uq_<table>_<columns>` | ⚠️ Partial |

Full rename is **deferred** — would require new migration on production.

---

## L. Summary

The migration history is **production-viable** in its consolidated 25-step form. Corrective migrations stacked during development have been **merged or removed**. A **single-run baseline** is prepared but **not activated by default** to avoid breaking existing SequelizeMeta histories.

**Net result:**

- ✅ Fresh DB builds cleanly through 25 ordered steps (down from 32)
- ✅ No duplicate timestamp collision
- ✅ Billing + cashier unified
- ✅ Idempotent helpers + rollback order documented
- ✅ Path to 1-migration deploy documented and scripted
