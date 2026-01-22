const { fork } = require('child_process');
const path = require('path');


const configurations = [
  { gwId: 'GW_1', locks: "L1:S1,L2:S2,L3:S3" },
  { gwId: 'GW_2', locks: "L1:S1,L2:S2,L3:S3" },
  { gwId: 'GW_4', locks: "L1:S1,L2:S2,L3:S3" }
];

configurations.forEach(cfg => {
  fork(path.join(__dirname, 'gateway.js'), [], {
    env: { ...process.env, GW_ID: cfg.gwId, GW_LOCKS: cfg.locks }
  });

  const lockList = cfg.locks.split(',');
  lockList.forEach(l => {
    const [lockId, slotId] = l.split(':');
    fork(path.join(__dirname, 'lock.js'), [], {
      env: { ...process.env, GW_ID: cfg.gwId, LOCK_ID: lockId, SLOT_ID: slotId }
    });
  });
});
console.log("All Simulators Launched and logging to Render console...");