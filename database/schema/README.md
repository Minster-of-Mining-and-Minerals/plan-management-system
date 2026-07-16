# Schema

- `baseline_schema.sql` — canonical PostgreSQL schema for the single Sequelize baseline migration `20260901000001-baseline-full-schema.js`.

Generated from a live DB via:

```bash
node scripts/db-snapshot.js schema
node scripts/clean-baseline-schema.js
```

Do not hand-edit casually; prefer regenerating after intentional schema changes, or add a **new** forward migration instead of rewriting this file on shared environments.
