const { PlanVersion } = require('./backend/models');
async function run() {
  const plans = await PlanVersion.findAll({ where: { version_kind: 'master' } });
  console.log(plans.map(p => ({ id: p.plan_version_id, draft_name: p.draft_name, status: p.status, process_started_at: p.process_started_at })));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
