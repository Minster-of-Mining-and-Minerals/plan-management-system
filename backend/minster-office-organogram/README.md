# Ministry of Mines — Alternative Organogram

Source document: `MoM organogram.docx` (Ministry of Mines Alternative Institutional Structure 2016 E.C.)

## Structure in the system

| Item | Value |
|------|--------|
| Sector name | **Alternative Minister of Mines** |
| Root department | **Minister** (all units nest under this node) |
| Sector ID | `10000000-0000-4000-8000-000000000004` |
| Seeder | `backend/seeders/20260616000001-seed-alternative-minister-of-mines-structure.js` |

**Excluded** (not in this structure): Ethiopian Geological Institute, Mining Industry Development Institute.

## Apply / refresh

```bash
cd backend
npm run seed:alt-mom
```

Re-running replaces departments for this sector with the latest tree (idempotent sync).

## Department hierarchy

```
Alternative Minister of Mines (sector)
└── Minister
    ├── Ministry Advisors
    ├── Chief Executive Officer
    │   ├── Institutional Transformation Executive Officer
    │   ├── Planning, Monitoring and Evaluation Executive Officer
    │   ├── Women and Social Affairs Mainstreaming Executive Officer
    │   ├── Capacity and Human Resource Development Executive Officer
    │   ├── Information Communication Technology Executive Officer
    │   ├── Procurement and Finance Executive Officer
    │   └── Basic Services Executive Officer
    ├── State Minister, Mineral Resources Development Sector
    │   ├── Executive Lead, Mining Operations, Processing License and Administration
    │   │   ├── License Operations Administration Desk
    │   │   └── Mining License Operations Desk
    │   ├── Ministry Deputy Advisor
    │   ├── Environment and Community Development Desk
    │   ├── Executive Lead, Mining Mega Projects
    │   │   ├── Head, Mega Project Monitoring and Support Desk (1)
    │   │   ├── Head, Mega Projects Desk
    │   │   └── Head, Mega Project Monitoring and Support Desk (2)
    │   └── Executive Lead, Mining Trade and Artisanal Mining Operations
    │       ├── Artisanal Mining Operations Desk
    │       └── Mining Trade Operations Desk
    ├── State Minister, Petroleum and Geothermal Resources Sector
    │   ├── Head, Promotion Desk
    │   ├── Executive Officer, Petroleum License and Administration
    │   ├── Executive Lead, Petroleum Mega Projects
    │   │   ├── Head, Mega Projects Desk
    │   │   ├── Head, Mega Project Monitoring and Support Desk (2)
    │   │   └── Head, Mega Project Monitoring and Support Desk (1)
    │   ├── Executive Officer, Geothermal License and Administration
    │   └── Ministry Deputy Advisor
    └── Minister's Office
        ├── Ethics and Anti-Corruption Executive Officer
        ├── Internal Audit Executive Officer
        ├── Public Relations and Communication Executive Officer
        └── Legal Affairs Executive Officer
```
