import UserFCMToken from "../models/Notification/FCMModel.js";

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
