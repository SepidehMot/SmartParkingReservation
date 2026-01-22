#!/bin/bash
# start all gateways + locks and save their process IDs to sim-pids.txt(we use this file to kill them later)

PID_FILE="sim-pids.txt"
> "$PID_FILE" 
for gw in {1,2,4}; do
  gwId="GW_$gw"
  echo "Gateway $gwId started..."
  GW_ID=$gwId GW_LOCKS="L1:S1,L2:S2,L3:S3" node gateway.js &
  echo $! >> "$PID_FILE"
  for lock in {1..3}; do
    lockId="L$lock"
    slotId="S$lock"
    echo "Starting Lock $lockId ($slotId) for $gwId..."
    GW_ID=$gwId LOCK_ID=$lockId SLOT_ID=$slotId node lock.js &
    echo $! >> "$PID_FILE"
  done
done

echo "All gateways and locks started"