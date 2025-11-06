import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve("./firebase-service-account.json"), "utf-8")
);

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const messaging = admin.messaging();

// ✅ Export admin directly
export { messaging };
export default admin;
