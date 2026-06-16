import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    notificationSendTime: {
      type: Date,
      required: true,
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
      enum: ["periodDate", "missedSelfTest", "post", "doctorAppointment", "patientAppointment"],
      index: true,
    },

    notificationPingCount: {
      type: Number,
      default: 1,
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



