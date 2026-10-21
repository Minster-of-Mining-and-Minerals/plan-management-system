const { v4: uuidv4 } = require("uuid");

async function ensurePermission(queryInterface, perm, now) {
  const [results] = await queryInterface.sequelize.query(
    `SELECT permission_id FROM permissions WHERE resource = '${perm.resource}' AND action = '${perm.action}'`
  );
  if (results.length > 0) return results[0].permission_id;

  const permissionId = uuidv4();
  await queryInterface.sequelize.query(
    `INSERT INTO permissions (permission_id, resource, action, created_at, updated_at) VALUES ('${permissionId}', '${perm.resource}', '${perm.action}', '${now.toISOString()}', '${now.toISOString()}')`
  );
  return permissionId;
}

async function ensureRolePermission(queryInterface, roleId, permissionId, now) {
  const [results] = await queryInterface.sequelize.query(
    `SELECT * FROM role_permissions WHERE role_id = '${roleId}' AND permission_id = '${permissionId}'`
  );
  if (results.length > 0) return;

  const rolePermissionId = uuidv4();
  await queryInterface.sequelize.query(
    `INSERT INTO role_permissions (role_permission_id, role_id, permission_id, created_at, updated_at) VALUES ('${rolePermissionId}', '${roleId}', '${permissionId}', '${now.toISOString()}', '${now.toISOString()}')`
  );
}

async function dedupePermissions(queryInterface) {
  const [duplicates] = await queryInterface.sequelize.query(`
    SELECT lower(resource) as res, lower(action) as act, array_agg(permission_id) as ids
    FROM permissions
    GROUP BY lower(resource), lower(action)
    HAVING count(*) > 1
  `);

  for (const dup of duplicates) {
    const keepId = dup.ids[0];
    const deleteIds = dup.ids.slice(1);
    
    await queryInterface.sequelize.query(`
      UPDATE role_permissions
      SET permission_id = '${keepId}'
      WHERE permission_id IN ('${deleteIds.join("','")}')
    `);

    await queryInterface.sequelize.query(`
      UPDATE permission_group_permissions
      SET permission_id = '${keepId}'
      WHERE permission_id IN ('${deleteIds.join("','")}')
    `);
    
    await queryInterface.sequelize.query(`
      DELETE FROM permissions
      WHERE permission_id IN ('${deleteIds.join("','")}')
    `);
  }
}

module.exports = { ensurePermission, ensureRolePermission, dedupePermissions };
