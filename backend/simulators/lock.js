// Lock Simulator(for each slot)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const mqtt = require("mqtt");

const url = process.env.MQTT_URL;
// const username = process.env.MQTT_USERNAME;
// const password = process.env.MQTT_PASSWORD;

const gwId = process.env.GW_ID;
const lockId = process.env.LOCK_ID;
const slotId = process.env.SLOT_ID;

let lockStatus = "free";
let battery = 15;
let armPosition = "lowered";
let magneticSensor = false;
let proximitySensor = false;
let pendingArrive = null;
let sensor = "clear";
const client = mqtt.connect(url);

function drainBattery() {
  if (battery >= 1) {
    battery -= 1;
    if (battery <= 1) {
      lockStatus = "out_of_order";
      publishStatus();
    }
  }
}
function publishStatus() {
  const carPresent = isRealCarPresent();
  sensor = carPresent ? "car_present" : "clear";

  client.publish(
    `/${gwId}/${lockId}/status`,
    JSON.stringify({
      type: "STATUS",
      slotId,
      lockId,
      battery,
      lockStatus,
      armPosition,
      magnetic: magneticSensor,
      proximity: proximitySensor,
      sensor,
    })
  );
}

function isRealCarPresent() {
  return magneticSensor === true && proximitySensor === true;
}
client.on("connect", () => {
  client.subscribe(`/${gwId}/${lockId}/cmd`, (err) => {
    if (err) console.log("Subscribe error:", err.message);
  });

  // Send heartbeat
  setInterval(() => {
    client.publish(
      `/${gwId}/${lockId}/heartbeat`,
      JSON.stringify({
        type: "HEARTBEAT",
        gwId,
        lockId,
        lockStatus,
        armPosition,
        battery,
        sensor,
        ts: Date.now(),
      })
    );
  }, 60000);
});

client.on("message", (topic, buf) => {
  const msg = JSON.parse(buf.toString());

  if (msg.type === "RESERVE" && msg.slotId === slotId) {
    lockStatus = "reserved";
    armPosition = "raised";
    drainBattery();
    publishStatus();
    return;
  }

  if (msg.type === "ARRIVE" && msg.slotId === slotId) {
    if (lockStatus !== "reserved") {
      return;
    }
    if (!isRealCarPresent()) {
      pendingArrive = {
        reservationId: msg.reservationId || null,
        slotId: msg.slotId,
      };
      return;
    }

    lockStatus = "occupied";
    armPosition = "lowered";

    drainBattery();
    publishStatus();
    pendingArrive = null;

    return;
  }
  if (msg.type === "SIM_OBJECT" && msg.slotId === slotId) {
    magneticSensor = msg.magnetic;
    proximitySensor = msg.proximity;
    if (pendingArrive && isRealCarPresent()) {
      if (lockStatus !== "occupied") {
        lockStatus = "occupied";
        armPosition = "lowered";
        pendingArrive = null;
        drainBattery();
        publishStatus();
      } else {
        pendingArrive = null;
      }
    } else if (!pendingArrive && !isRealCarPresent()) {
      if (lockStatus !== "out_of_order") {
        lockStatus = "free";
      }
      publishStatus();
    }
    return;
  }
  if (
    (msg.type === "CANCEL" || msg.type === "EXPIRED") &&
    msg.slotId === slotId
  ) {
    if (lockStatus === "reserved") {
      drainBattery();
      magneticSensor = false;
      sensor = "clear";
      proximitySensor = false;
    }
    if (lockStatus !== "out_of_order") {
      lockStatus = "free";
    }
    armPosition = "lowered";
    pendingArrive = null;

    publishStatus();
    return;
  }
  if (msg.type === "LEAVE" && msg.slotId === slotId) {
    if (lockStatus !== "out_of_order") {
      lockStatus = "free";
    }
    armPosition = "lowered";
    magneticSensor = false;
    proximitySensor = false;
    pendingArrive = null;
    sensor = "clear";
    publishStatus();
    return;
  }
  if (msg.type === "OUT_OF_ORDER") {
    lockStatus = "out_of_order";
    publishStatus();
    return;
  }
});
