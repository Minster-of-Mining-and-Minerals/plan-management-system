# Professional Test Users

Seeded by `20260713000001-seed-professional-test-users.js`.

**Default password for all accounts:** `password`

Admin account (unchanged): `admin@gmail.com` / `password`

---

## Internal staff (`@test.novacure`)

Each user has **one permission group only** (no RBAC roles) so they see only their job sections.

| Email | Role | Expected sidebar sections |
|-------|------|---------------------------|
| `reception_1@test.novacure` | Receptionist | Patients, Appointments, Workflow Inbox |
| `reception_2@test.novacure` | Receptionist | Patients, Appointments, Workflow Inbox |
| `doctor_1@test.novacure` | Doctor | Workflow Inbox, Diagnosis |
| `doctor_2@test.novacure` | Doctor | Workflow Inbox, Diagnosis |
| `doctor_3@test.novacure` | Doctor | Workflow Inbox, Diagnosis |
| `cashier_1@test.novacure` | Cashier | Cashier Desk |
| `cashier_2@test.novacure` | Cashier | Cashier Desk |
| `lab_1@test.novacure` | Lab | Workflow Inbox, Diagnosis |
| `lab_2@test.novacure` | Lab | Workflow Inbox, Diagnosis |

### Permission groups

| Group | Permissions |
|-------|-------------|
| PG – Reception | patients (read, create, schedule), workflow (read, submit, forward, return, complete) |
| PG – Doctor | patients (read, receive_appointment, receive_patient), workflow (read, submit, forward, return, prescribe, complete), diagnosis_forms (read), clinical_suggestion (read) |
| PG – Lab | patients (read, receive_patient), workflow (read, submit, forward, return, complete), diagnosis_forms (read) |
| PG – Cashier | cashier_queue (view), cashier_session (open, close, view), cashier_payment (create, view) |

---

## Patients (`@test.novacure`)

Portal: `/patient/dashboard`

| Email | Name |
|-------|------|
| `patient_1@test.novacure` | Test Patient One |
| `patient_2@test.novacure` | Test Patient Two |
| `patient_3@test.novacure` | Test Patient Three |
| `patient_4@test.novacure` | Test Patient Four |
| `patient_5@test.novacure` | Test Patient Five |

---

## Pharmacy portal (`@test.novacure`)

Portal: `/pharmacy/dashboard`

| Email | Pharmacy | Portal role |
|-------|----------|-------------|
| `pharmacy_admin_1@test.novacure` | NovaCare Pharmacy Bole | admin |
| `pharmacy_staff_1@test.novacure` | NovaCare Pharmacy Bole | staff |
| `pharmacy_admin_2@test.novacure` | NovaCare Pharmacy Kazanchis | admin |
| `pharmacy_staff_2@test.novacure` | NovaCare Pharmacy Kazanchis | staff |

---

## Reseed

```bash
cd backend
npm run seed
```

Full reset:

```bash
cd backend
npm run db:fresh
```

---

## Existing demo data

The ophthalmology demo accounts (`@ophthalmology.demo`) and sample patients (`@patient.demo.novacure`) remain available alongside these test users.
