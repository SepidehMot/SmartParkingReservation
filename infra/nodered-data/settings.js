const admin = require("firebase-admin");
const fs = require("fs");

function loadServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT env var");
    return null;
  }

  const trimmed = raw.trim();


  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }


  const jsonText = fs.readFileSync(trimmed, "utf8");
  return JSON.parse(jsonText);
}

module.exports = {
  flowFile: "flows.json",
  credentialSecret: process.env.NODE_RED_CREDENTIAL_SECRET,

  functionGlobalContext: {
    firebase_admin: (() => {
      try {
        const serviceAccount = loadServiceAccountFromEnv();
        if (!serviceAccount || !serviceAccount.project_id) {
          console.error("Invalid service account (missing project_id)");
          return null;
        }

        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }

        console.log("Firebase Admin initialized:", serviceAccount.project_id);
        return admin;
      } catch (err) {
        console.error("Firebase Admin init failed:", err.message);
        return null;
      }
    })(),
  },

  flowFilePretty: true,
  uiHost: "0.0.0.0",
  uiPort: process.env.PORT || 1880,

  diagnostics: { enabled: true, ui: true },

  logging: {
    console: { level: "info", metrics: false, audit: false },
  },

  globalFunctionTimeout: 0,
  functionTimeout: 0,
};
