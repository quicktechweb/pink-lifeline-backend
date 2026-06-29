import cron from "node-cron";
import Notification from "../models/Notification/NotificationModel.js";
import { sendNotificationToUser } from "./notificationService.js";

// import { sendPushNotification } from "../firebase-admin.js";

const getTodayDateString = () => new Date().toISOString().split("T")[0];

// Builds today's Date object set to the notification's HH:mm (local time)
const buildSendDateTime = (notificationSendTime) => {
  const [hours, minutes] = notificationSendTime.split(":").map(Number);
  const sendDateTime = new Date();
  sendDateTime.setHours(hours, minutes, 0, 0);
  return sendDateTime;
};

const getNextNotificationDate = (type, currentDateStr) => {
  // currentDateStr is "YYYY-MM-DD"
  const [year, month, day] = currentDateStr.split("-").map(Number);

  // Use UTC to avoid timezone shifting the date by ±1 day
  const date = new Date(Date.UTC(year, month - 1, day));

  if (type === "periodDateStart") {
    date.setUTCDate(date.getUTCDate() + 2);
  } else if (type === "periodDateEnd") {
    date.setUTCDate(date.getUTCDate() + 1);
  } else {
    // other types: no date shift
    return currentDateStr;
  }

  const newYear = date.getUTCFullYear();
  const newMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const newDay = String(date.getUTCDate()).padStart(2, "0");

  return `${newYear}-${newMonth}-${newDay}`;
};

const dispatchNotification = async (notification) => {
  const notificationStatus = await sendNotificationToUser({
    title: notification.title,
    body: notification.body,
    type: notification.type,
    userId: notification.userId,
  });

  let updatedNotification = null;

  if (notificationStatus.success) {
    // Step 1: decrement the reminder limit (only if still > 0)
    const decremented = await Notification.findOneAndUpdate(
      {
        _id: notification._id,
        autoReminderLimit: { $gt: 0 },
      },
      {
        $inc: { autoReminderLimit: -1 },
      },
      { new: true },
    );

    if (decremented) {
      if (decremented.autoReminderLimit > 0) {
        // Still has reminders left -> bump the send date forward
        const nextDate = getNextNotificationDate(decremented.type, decremented.notificationSendDate);

        updatedNotification = await Notification.findByIdAndUpdate(decremented._id, { notificationSendDate: nextDate }, { new: true });
      } else {
        // Limit just hit zero -> mark as sent, stop reminders
        updatedNotification = await Notification.findByIdAndUpdate(decremented._id, { isSent: true }, { new: true });
      }
    }
  }

  console.log(`🔔 [${new Date().toLocaleString()}] | User: ${notification.userId} | Status: ${notificationStatus.success ? "✅ Success" : "❌ Failed"} | Remaining Reminders: ${updatedNotification ? updatedNotification.autoReminderLimit : "null"}`);

  if (!notificationStatus.success) {
    console.error(`🚨 [${new Date().toLocaleString()}] | User: ${notification.userId} | Notification Status: ${notificationStatus.status} | Notification: ${notificationStatus.message}`);
  }
};

// Fetches today's notifications and schedules each at its exact send time
const scheduleTodaysNotifications = async () => {
  const today = getTodayDateString();
  const now = new Date();

  console.log("📅 Fetching today's notifications...", today);

  try {
      const notifications = await Notification.find({
        notificationSendDate: today,
        isSent: false,
        fcmTokens: { $exists: true, $ne: [] },
      });

    for (const notification of notifications) {
      const sendDateTime = buildSendDateTime(notification.notificationSendTime);

      // Already past for today — skip
      if (sendDateTime.getTime() <= now.getTime()) {
        console.log(`Skipping notification for user ${notification.userId} — send time ${notification.notificationSendTime} already passed.`);
        continue;
      }

      const delayMs = sendDateTime.getTime() - now.getTime();

      setTimeout(() => {
        dispatchNotification(notification);
      }, delayMs);

      console.log(`Scheduled notification for user ${notification.userId} at ${notification.notificationSendTime} (in ${Math.round(delayMs / 1000)}s)`);
    }

    console.log(`Scheduler set up ${notifications.length} notification(s) for today.`);
  } catch (err) {
    console.error("Scheduler Error:", err);
  }
};


const startNotificationScheduler = () => {
  console.log("✅ Notification Scheduler Started");

  // Run immediately on startup
  scheduleTodaysNotifications();

  // Run every 1 minutes
  cron.schedule("0 1 * * *", () => {
    console.log("⏰ Running notification scheduler...", new Date());
    scheduleTodaysNotifications();
  });
};

export default startNotificationScheduler;
