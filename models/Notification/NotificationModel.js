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

    postId:{
      type: String,
    },

    commentId: {
      type: String,
    },

    appointmentId: {
      type: String,
    },

    data: {
      type: String,
    },

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

    isSent: {
      type: Boolean,
      default: false,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "periodDateStart", // it will redirect to period start page
        "periodDateEnd",  // it will redirect to period end page
        "missedSelfTest", // it will redirect to self test page
        "accountVerified", // it will redirect to profile page

        "post", // it will redirect to post page using postId
        "doctorAppointment", // it will redirect to doctor appointment page using appointmentId
        "patientAppointment" // it will redirect to patient appointment page using appointmentId

      ],
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    autoReminderLimit: {
      type: Number,
      default: 3,
      min: 0,
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
