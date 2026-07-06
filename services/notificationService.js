import admin from "../firebase-admin.js";
import UserFCMToken from "../models/Notification/FCMModel.js";
import { writeFile } from "node:fs/promises";


const messaging = admin.messaging();

export const createOrUpdateFCMToken = async ({ userId, email, fcmToken }) => {
  return await UserFCMToken.findOneAndUpdate(
    { userId },
    {
      $set: {
        email,
      },
      $addToSet: {
        fcmTokens: fcmToken,
      },
    },
    {
      new: true,
      upsert: true,
    },
  );
};



















export const sendNotificationToUser = async ({ userId, title, body, type, data = {}, postId, commentId, appointmentId }) => {
  try {
    // 1. Get user's FCM tokens
    const user = await UserFCMToken.findOne({ userId });
    console.log("🚀 ~ notificationService.js:46 ~ sendNotificationToUser ~ user:", user)


    if (!user || !user.fcmTokens?.length) {
      // process.exit(0)
      return {
        success: false,
        message: "No FCM tokens found for user",
      };
    }



    // 2. Build Firebase-compatible data payload (ALL STRINGS)
    const formattedData = {
      type,
      postId: postId ? String(postId) : "",
      commentId: commentId ? String(commentId) : "",
      appointmentId: appointmentId ? String(appointmentId) : "",
      // ...Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
    };

    // 3. Build multicast message

    const message = {
      tokens: user.fcmTokens,

      notification: {
        title,
        body,
      },

      data: formattedData,
    };

    // 4. Send notification
    const response = await messaging.sendEachForMulticast(message);
    console.log("🚀 ~ notificationService.js:83 ~ sendNotificationToUser ~ response:", response)

    const data = JSON.stringify(response, null, 2);

console.log(
  "🚀 ~ notificationService.js:83 ~ sendNotificationToUser ~ response:",
  response
);

try {
  await writeFile(
    "./notification-response.json",
    JSON.stringify(response, null, 2),
    "utf8"
  );

  console.log("Response written to notification-response.json");
} catch (error) {
  console.error("Failed to write response:", error);
}


    // 5. Optional: cleanup invalid tokens
    // if (response.failureCount > 0) {
    //   const invalidTokens = [];

    //   response.responses.forEach((res, index) => {
    //     if (!res.success) {
    //       invalidTokens.push(user.fcmTokens[index]);
    //     }
    //   });

    //   if (invalidTokens.length) {
    //     await UserFCMToken.updateOne(
    //       { userId },
    //       {
    //         $pull: {
    //           fcmTokens: { $in: invalidTokens },
    //         },
    //       },
    //     );
    //   }
    // }

    return {  
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error("Notification Error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
};
