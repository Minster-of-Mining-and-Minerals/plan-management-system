const { PlanVersion } = require('./backend/models');
async function run() {
  const annuals = await PlanVersion.findAll({ where: { parent_plan_version_id: '0b0de3df-0581-4327-ab60-b0c0941b7386' } });
  console.log('Annuals count: ' + annuals.length);
  for (const annual of annuals) {
    const periods = await PlanVersion.findAll({ where: { parent_plan_version_id: annual.plan_version_id } });
    console.log('Periods for annual ' + annual.plan_version_id + ': ' + periods.length);
  }
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
