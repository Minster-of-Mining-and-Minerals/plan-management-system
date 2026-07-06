# Ophthalmology Clinical Demo Walkthrough

End-to-end demo path for the NovaCure ophthalmology clinic workflow. All demo staff use password **`password`**.

## Prerequisites

```bash
cd backend
npm run migrate
npm run seed
```

This seeds departments, staff, sample patients, the ophthalmology diagnosis template, lab report template, and **today's admitted demo visit** for Amanuel Tadesse.

Re-run seeds anytime to refresh the demo visit date:

```bash
npx sequelize-cli db:seed --seed 20260706000002-seed-ophthalmology-demo-appointment.js
```

## Demo accounts

| Role | Email | Primary screen |
|------|-------|----------------|
| Reception | `reception@ophthalmology.demo` | Patient scheduling → admit |
| Nurse | `nurse@ophthalmology.demo` | Appointments → workflow |
| Ophthalmologist | `ophthalmologist@ophthalmology.demo` | Appointments → workflow |
| Laboratory | `laboratory@ophthalmology.demo` | Workflow inbox |
| Imaging | `imaging@ophthalmology.demo` | Workflow inbox |
| Optometrist | `optometrist@ophthalmology.demo` | Workflow inbox |
| Pharmacist | `pharmacist@ophthalmology.demo` | Prescriptions (when prescribed) |
| Patient (record) | `amanuel.tadesse@patient.demo.novacure` | Patient portal `/patient/dashboard` |

## Patient portal (Phase 4)

Login as **`amanuel.tadesse@patient.demo.novacure`** / **`password`** to open the patient portal.

| Route | Live data |
|-------|-----------|
| `/patient/dashboard` | Next appointment, prescriptions, notifications |
| `/patient/appointments` | Book, reschedule, cancel visits |
| `/patient/medical-history` | Workflow timeline (read-only summaries) |
| `/patient/prescriptions` | Prescription list from visits |
| `/patient/notifications` | In-app notifications |
| `/patient/profile` | Phone, insurance, emergency contacts, language |

After seeding, Amanuel sees **today's admitted ophthalmology visit** on the dashboard and in medical history (nursing assessment + workflow events).

Vitals, lab results, billing, telemedicine, and AI sections remain demo placeholders until later phases.

## Seeded demo state

After seeding, **Amanuel Tadesse** has an **admitted** visit **today** assigned to the ophthalmologist, with:

1. **Nursing assessment** already submitted (timeline entry)
2. **Forward to laboratory** with pending inbox task for `laboratory@ophthalmology.demo`

## Walkthrough (recommended order)

### 1. Reception — schedule & admit (optional)

Login: `reception@ophthalmology.demo`

- **Patients** → register or find patients
- **Patient scheduling** → book slot (Mon–Sat, 07:30–17:00, 5‑min slots)
- On the appointment date, change status to **Admitted** (creates staff appointment)

*Skip if using the seeded admitted visit.*

### 2. Ophthalmologist — today's appointments

Login: `ophthalmologist@ophthalmology.demo`

- Open **Appointments** — summary cards show today's visits and active workflows
- Open **Amanuel Tadesse** — view nursing assessment in the workflow timeline
- Continue examination using **Ophthalmology Comprehensive Examination** form
- **Forward** to optometrist, imaging, or lab as needed

### 3. Laboratory — inbox task

Login: `laboratory@ophthalmology.demo`

- Open **Workflow inbox** — pending task: *Lab investigations — diabetic eye screening*
- Open the appointment → complete **Laboratory & Investigation Report** (HbA1c, FBS, ESR, CRP, etc.)
- **Return** to ophthalmologist when done

### 4. Optometrist / Imaging (optional)

Login: `optometrist@ophthalmology.demo` or `imaging@ophthalmology.demo`

- Process forwarded tasks from inbox
- Submit refraction or imaging report → return to ophthalmologist

### 5. Ophthalmologist — prescribe & complete

- Review returned reports in the timeline
- **Prescribe** (medication, glasses, or procedure templates)
- **Complete** workflow when the visit is finished

## Key routes

| Route | Purpose |
|-------|---------|
| `/appointments` | Staff admitted visits (date filter defaults to today) |
| `/appointments/[id]` | Full workflow panel for one visit |
| `/workflow-inbox` | Pending forwarded tasks |
| `/patients/scheduling` | Book and admit patients |
| `/clinical-suggestions` | Admin — manage autocomplete suggestions |

## Templates used

### Form engine v2 (Phase 3)

The ophthalmology template demonstrates:

- **Conditional fields** — toggle *Cataract present*, *Requires surgery*, or *Chronic disease* to reveal related sections
- **Searchable select** — ICD-10 multi-select with type-to-filter
- **Repeater** — *Medications* rows (drug, dose, frequency, duration)

Re-assign the template to staff configs after upgrading migrations to refresh copied forms.

| Staff | Form |
|-------|------|
| Ophthalmologist | Ophthalmology Comprehensive Examination |
| Nurse | Ophthalmic Nursing Assessment |
| Laboratory | Laboratory & Investigation Report (ophthalmology lab fields) |
| Imaging | Ophthalmic Imaging Report |
| Optometrist | Refraction & Visual Assessment |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No patient on Appointments today | Re-run demo appointment seeder (refreshes `schedule_date` to today) |
| Lab form missing new fields | Run migrations, then demo seeder (recopies lab config from template) |
| Empty inbox for lab tech | Login as `laboratory@ophthalmology.demo`; ensure demo workflow seed ran |
