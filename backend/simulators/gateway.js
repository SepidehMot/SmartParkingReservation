// Gateway Simulator
if (process.env.NODE_ENV !== 'production') {
    require("dotenv").config(); 
}
const mqtt = require("mqtt");

const url = process.env.MQTT_URL;

// const username = process.env.MQTT_USERNAME;
// const password = process.env.MQTT_PASSWORD;

const gwId = process.env.GW_ID;

const locksEnv = process.env.GW_LOCKS.split(",");
const locks = locksEnv.map((s) => {
  const [lockId, slotId] = s.split(":");
  return {
    lockId: lockId,
    slotId: slotId,
    lockStatus: "unknown",
    battery: null,
    armPosition: "unknown",
    sensor: "unknown",
    ts: Date.now(),
  };
});

const client = mqtt.connect(url);

client.on("connect", () => {
  client.subscribe(`/${gwId}/down_link`);
  client.subscribe(`/${gwId}/+/status`);
  client.subscribe(`/${gwId}/+/heartbeat`);
  setInterval(sendGatewayHeartbeat, 60000);
});

client.on("message", (topic, buf) => {
  const msg = buf.toString();
  try {
    const data = JSON.parse(msg);

    // lock
    if (topic === `/${gwId}/down_link`) {
      const target = locks.find((l) => l.slotId === data.slotId);
      if (!target) return console.log("Unknown slot", data.slotId);
      client.publish(`/${gwId}/${target.lockId}/cmd`, JSON.stringify(data));
      client.publish(
        `/${gwId}/down_link_ack`,
        JSON.stringify({
          type: "ACK",
          for: data.type,
          slotId: data.slotId,
          reservationId: data.reservationId || null,
          ok: true,
          ts: Date.now(),
          publisherId: `${gwId}:${process.pid}:${Math.random()
            .toString(16)
            .slice(2)}`,
        })
      );
    }

    // lock status
    else if (topic.includes("/status")) {
      client.publish(`/${gwId}/up_link`, JSON.stringify(data));
      const l = locks.find((l) => l.slotId === data.slotId);
      if (l) {
        l.lockStatus = data.lockStatus;
        l.armPosition = data.armPosition;
        l.ts = data.ts || Date.now();
        l.battery = data.battery;
        l.sensor = data.sensor;
      }
    }

    // heartbeat
    else if (topic.includes("/heartbeat")) {
      const l = locks.find((l) => l.lockId === data.lockId);
      if (l) {
        l.lockStatus = data.lockStatus;
        l.armPosition = data.armPosition;
        l.battery = data.battery;
        l.ts = data.ts;
        l.sensor = data.sensor;
      }
    }
  } catch (err) {}
});

function sendGatewayHeartbeat() {
  const hb = {
    type: "HEARTBEAT",
    gwId,
    ts:Date.now(),
    locks: locks.map((l) => ({
      lockId: l.lockId,
      slotId: l.slotId,
      lockStatus: l.lockStatus,
      armPosition: l.armPosition,
      sensor: l.sensor,
      battery: l.battery,
      ts: l.ts,
    })),
  };
  client.publish(`/${gwId}/heartbeat`, JSON.stringify(hb));
}

["SIGINT", "SIGTERM"].forEach((sig) => {
  process.on(sig, () => {
    client.end(true, () => process.exit(0));
  });
});
