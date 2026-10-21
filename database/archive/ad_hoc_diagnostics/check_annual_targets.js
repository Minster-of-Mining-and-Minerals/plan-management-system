const { PlanNode } = require('./backend/models');
async function run() {
  const nodes = await PlanNode.findAll({ where: { plan_version_id: '0b0de3df-0581-4327-ab60-b0c0941b7386' } });
  const annual_targets = nodes.map(n => Number(n.annual_target) || 0);
  console.log('Sum of annual_targets: ' + annual_targets.reduce((a,b)=>a+b, 0));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
