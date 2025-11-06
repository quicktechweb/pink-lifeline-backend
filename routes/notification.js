import express from "express";
import admin from "../firebase-admin.js";
import Notification from "../models/Notification.js";
import FcmToken from "../models/FcmToken.js";
const router = express.Router();



// Save FCM token
router.post("/save-token", async (req, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken)
    return res.status(400).json({ success: false, message: "Missing data" });

  try {
    await FcmToken.findOneAndUpdate(
      { userId },
      { token: fcmToken },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: "Token saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Create notification & send
 router.post("/create", async (req, res) => {
  try {
    const { userId, title, message } = req.body;
    if (!userId || !title || !message)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    // Save notification in DB
    const notification = await Notification.create({ userId, title, message });

    // Fetch only FCM tokens of the target user
    const tokensDocs = await FcmToken.find({ userId });
    const fcmTokens = tokensDocs.map(doc => doc.token).filter(Boolean);

    if (fcmTokens.length > 0) {
      const multicastMessage = {
        notification: { title, body: message },
        tokens: fcmTokens,
      };

      // Check sendMulticast exists
      if (typeof admin.messaging().sendMulticast !== "function") {
        console.error("sendMulticast function not found!");
      } else {
        const response = await admin.messaging().sendMulticast(multicastMessage);
        console.log(`Notifications sent: ${response.successCount}/${fcmTokens.length}`);
      }
    } else {
      console.log("No valid FCM tokens found for this user");
    }

    res.json({ success: true, notification });
  } catch (err) {
    console.error("Error sending notification:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



// Get all notifications for a user
router.get("/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark as read
router.put("/read/:id", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
