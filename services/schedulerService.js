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

const dispatchNotification = async (notification) => {
  const notificationStatus = await sendNotificationToUser({
    title: notification.title,
    body: notification.body,
    type: notification.type,
    userId: notification.userId,
  });
 
  let updatedNotification = null;

  if (notificationStatus.success) {
    updatedNotification = await Notification.findOneAndUpdate(
      { userId: notification.userId },
      {
        $set: {
          success: true,
        },
      },
      { new: true },
    );
  }

  console.log(`🔔 [${new Date().toLocaleString()}] | User: ${notification.userId} | Status: ${notificationStatus.success ? "✅ Success" : "❌ Failed"} | Remaining Reminders: ${updatedNotification.autoReminderLimit !== null ? updatedNotification.autoReminderLimit : "null"}`);
  if (notification.success == false) {
    console.error(`🚨 [${new Date().toLocaleString()}] | User: ${notification.userId} | Notification Status: ${notification.status} | Notification: ${notification.message}`);
  }

  // Schedule next reminder after 2 minutes
  if (updatedNotification.autoReminderLimit > 0) {
    console.log(`⏳ Next reminder for ${notification.userId} in 20 seconds...`);

    setTimeout(
      async () => {
        // Fetch latest document in case it was changed/deleted
        const latestNotification = await Notification.findById(notification._id);

        if (!latestNotification || latestNotification.autoReminderLimit <= 0) {
          return;
        }

        await dispatchNotification(latestNotification);
      },
      1 * 60 * 1000,
    ); // 2 minutes
  } else {
    console.log(`🏁 [${new Date().toLocaleString()}] | User: ${notification.userId} | Reminder limit reached.`);
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

  // On boot, schedule whatever's left for today — covers mid-day server restarts
  scheduleTodaysNotifications();

  // Every midnight, fetch and schedule the day's notifications
  cron.schedule("0 0 * * *", () => {
    console.log("⏰ Running daily notification scheduler...", new Date());
    scheduleTodaysNotifications();
  });
};

export default startNotificationScheduler;
