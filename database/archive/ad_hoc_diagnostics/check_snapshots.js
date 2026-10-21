const { PlanVersion } = require('./backend/models');
async function run() {
  const plans = await PlanVersion.findAll({ where: { version_kind: 'master' } });
  console.log(plans.map(p => ({ id: p.plan_version_id, process_started_at: p.process_started_at, snapshot: p.active_execution_snapshot_id })));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
