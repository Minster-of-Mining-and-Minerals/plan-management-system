"use strict";

const { sequelize } = require("../models");
const {
  getStructureEffectivePermissionIdSet,
  getStructureAssignablePermissionIdSet,
  assertPermissionIdsFitLinkedStructureHierarchies,
  assertPermissionGroupFitsStructureHierarchy,
} = require("../utils/structureEffectivePermissionsUtils");

async function main() {
  const structures = await sequelize.query(
    `SELECT government_structure_id, name, parent_id, level
     FROM government_structures
     WHERE is_active = true
     ORDER BY level, name`,
    { type: sequelize.QueryTypes.SELECT }
  );

  console.log("=== Structures (effective vs assignable) ===\n");
  for (const s of structures) {
    const eff = await getStructureEffectivePermissionIdSet(s.government_structure_id);
    const assign = await getStructureAssignablePermissionIdSet(s.government_structure_id);
    console.log(
      `${s.name.padEnd(42)} eff=${String(eff.size).padStart(3)} assignable=${String(assign.size).padStart(3)} parent=${s.parent_id || "ROOT"}`
    );
  }

  const links = await sequelize.query(
    `SELECT gs.government_structure_id, gs.name AS structure, pg.permission_group_id, pg.name AS group_name,
            (SELECT COUNT(*)::int FROM permission_group_permissions pgp
             WHERE pgp.permission_group_id = pg.permission_group_id) AS perm_count
     FROM government_structure_permission_groups gspg
     JOIN government_structures gs ON gs.government_structure_id = gspg.government_structure_id
     JOIN permission_groups pg ON pg.permission_group_id = gspg.permission_group_id
     ORDER BY gs.name, pg.name`,
    { type: sequelize.QueryTypes.SELECT }
  );

  console.log("\n=== Structure ↔ Permission Group links ===\n");
  for (const row of links) {
    console.log(`  ${row.structure} ← ${row.group_name} (${row.perm_count} perms)`);
  }

  const groups = await sequelize.query(
    `SELECT pg.permission_group_id, pg.name, pg.group_kind,
            (SELECT COUNT(*)::int FROM permission_group_permissions pgp
             WHERE pgp.permission_group_id = pg.permission_group_id) AS perm_count,
            (SELECT COUNT(*)::int FROM government_structure_permission_groups gspg
             WHERE gspg.permission_group_id = pg.permission_group_id) AS structure_links
     FROM permission_groups pg
     ORDER BY pg.name`,
    { type: sequelize.QueryTypes.SELECT }
  );

  console.log("\n=== All permission groups ===\n");
  for (const g of groups) {
    console.log(
      `  ${g.name.padEnd(40)} kind=${g.group_kind} perms=${g.perm_count} structures=${g.structure_links}`
    );
  }

  // Simulate subset group scenario on Alternative MoM if it has groups
  const altMom = structures.find((s) => s.name === "Alternative Minister of Mines");
  if (altMom) {
    const eff = await getStructureEffectivePermissionIdSet(altMom.government_structure_id);
    const assign = await getStructureAssignablePermissionIdSet(altMom.government_structure_id);
    const subset = [...assign].slice(0, Math.min(5, assign.size));

    console.log("\n=== Subset simulation on Alternative Minister of Mines ===\n");
    console.log(`  Effective: ${eff.size}, Assignable: ${assign.size}`);
    console.log(`  Testing subset of ${subset.length} permission ids from assignable set...`);

    if (subset.length > 0) {
      // Find an unlinked group or use first group
      const unlinked = groups.find((g) => Number(g.structure_links) === 0 && Number(g.perm_count) > 0);
      if (unlinked) {
        try {
          await assertPermissionGroupFitsStructureHierarchy(
            unlinked.permission_group_id,
            altMom.government_structure_id
          );
          console.log(`  Link check for "${unlinked.name}" → PASS (group as-is)`);
        } catch (e) {
          console.log(`  Link check for "${unlinked.name}" → FAIL: ${e.message}`);
        }

        try {
          await assertPermissionIdsFitLinkedStructureHierarchies(
            unlinked.permission_group_id,
            subset
          );
          console.log(`  Update subset on unlinked group (no structure links) → PASS (skipped)`);
        } catch (e) {
          console.log(`  Update subset → FAIL: ${e.message}`);
        }
      }

      const linkedGroup = links.find((l) => l.structure === altMom.name);
      if (linkedGroup) {
        try {
          await assertPermissionIdsFitLinkedStructureHierarchies(
            linkedGroup.permission_group_id,
            subset
          );
          console.log(`  Update subset on linked group "${linkedGroup.group_name}" → PASS`);
        } catch (e) {
          console.log(`  Update subset on linked group "${linkedGroup.group_name}" → FAIL: ${e.message}`);
          if (e.unauthorizedPermissionIds) {
            console.log(`    unauthorized ids (first 5): ${e.unauthorizedPermissionIds.slice(0, 5).join(", ")}`);
          }
        }
      }
    } else {
      console.log("  SKIP: no assignable permissions on Alternative MoM");
    }
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
