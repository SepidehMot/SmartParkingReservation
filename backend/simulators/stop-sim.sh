#!/bin/bash
# Stop all simulator processes using saved PIDs

PID_FILE="sim-pids.txt"

if [ ! -f "$PID_FILE" ]; then
  echo "No PID file found."
  exit 1
fi

while read -r pid; do
  if kill -0 "$pid" 2>/dev/null; then
    echo "Killing process $pid"
    kill -9 "$pid"
  fi
done < "$PID_FILE"

rm -f "$PID_FILE"
echo "All simulator processes stopped."


