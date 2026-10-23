require('dotenv').config();
const bcrypt = require('bcrypt');
const {
  sequelize,
  Company,
  CompanyStructure,
  CompanyBrandingSetting,
  User,
  Role,
  RolePermission,
  Permission,
} = require('../models');

async function main() {
  await sequelize.authenticate();
  console.log('Connected to DB');

  // 1. Create or find demo company
  let company = await Company.findOne({ where: { code: 'DEMO-MINING' } });
  if (!company) {
    company = await Company.create({
      name: 'Midroc Gold Mining Corp',
      code: 'DEMO-MINING',
      is_active: true,
      description: 'Primary corporate mining operations in Oromia & Shakiso concessions.',
    });
    console.log('Created company:', company.company_id);
  } else {
    console.log('Found company:', company.company_id);
  }

  const companyId = company.company_id;

  // 2. Ensure branding
  await CompanyBrandingSetting.findOrCreate({
    where: { company_id: companyId },
    defaults: {
      company_id: companyId,
      primary_color: '#059669',
      secondary_color: '#10b981',
      system_name_full: 'Midroc Gold Operations Portal',
      system_name_short: 'Midroc Portal',
      system_tagline: 'Enterprise Mining Management & Concession Workspace',
    },
  });

  // 3. Ensure root & child departments
  let rootDept = await CompanyStructure.findOne({
    where: { company_id: companyId, parent_id: null },
  });
  if (!rootDept) {
    rootDept = await CompanyStructure.create({
      company_id: companyId,
      name: 'Corporate Executive Directorate',
      code: 'EXEC-HQ',
      level: 1,
      is_active: true,
    });
  }

  let childDept = await CompanyStructure.findOne({
    where: { company_id: companyId, parent_id: rootDept.company_structure_id },
  });
  if (!childDept) {
    childDept = await CompanyStructure.create({
      company_id: companyId,
      parent_id: rootDept.company_structure_id,
      name: 'Shakiso Extraction Operations',
      code: 'SHAKISO-MINE',
      level: 2,
      is_active: true,
    });
  }

  // 4. Create company role with all company permissions
  let companyRole = await Role.findOne({
    where: { name: 'Company Executive Admin', scope: 'company', company_id: companyId },
  });
  if (!companyRole) {
    companyRole = await Role.create({
      name: 'Company Executive Admin',
      description: 'Full administrative authority for Midroc Gold',
      scope: 'company',
      company_id: companyId,
      is_active: true,
    });
  }

  // Find all company permissions
  const companyPerms = await Permission.findAll({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('resource')),
      {
        [sequelize.Sequelize.Op.or]: [
          { [sequelize.Sequelize.Op.like]: 'company%' },
          { [sequelize.Sequelize.Op.eq]: 'companies' },
        ],
      }
    ),
  });

  for (const perm of companyPerms) {
    await RolePermission.findOrCreate({
      where: {
        role_id: companyRole.role_id,
        permission_id: perm.permission_id,
      },
      defaults: {
        role_id: companyRole.role_id,
        permission_id: perm.permission_id,
        is_active: true,
      },
    });
  }
  console.log(`Assigned ${companyPerms.length} company permissions to role.`);

  // 5. Create or update company user
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  let user = await User.findOne({ where: { email: 'midroc_admin@midroc.com' } });
  if (!user) {
    user = await User.create({
      full_name: 'Ato Daniel Gemeda',
      email: 'midroc_admin@midroc.com',
      password: hashedPassword,
      is_active: true,
      is_first_logged_in: false,
      company_id: companyId,
      company_structure_id: rootDept.company_structure_id,
    });
    console.log('Created company user:', user.user_id);
  } else {
    await user.update({
      password: hashedPassword,
      company_id: companyId,
      company_structure_id: rootDept.company_structure_id,
      is_active: true,
      is_first_logged_in: false,
    });
    console.log('Updated company user:', user.user_id);
  }

  // Assign role to user
  await user.setRoles([companyRole]);

  console.log('\n=== Demo Company User Ready ===');
  console.log('Email: midroc_admin@midroc.com');
  console.log('Password: Password123!');
  console.log('Company ID:', companyId);
  console.log('Target Workspace URL: /en/companies/' + companyId);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
