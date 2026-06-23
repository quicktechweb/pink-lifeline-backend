import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    fcmTokens: [
      {
        type: String,
      },
    ],

    notificationSendTime: {
      type: String,
      required: true,
      index: true,
    },

    notificationSendDate: {
      type: String,
      required: true,
      index: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["periodDate", "missedSelfTest", "post", "doctorAppointment", "patientAppointment"],
      index: true,
    },

    autoReminderLimit: {
      type: Number,
      default: 3,
      min: 1,
      max: 5,
    },
  },

  {
    timestamps: true,
    versionKey: false,
  },
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
