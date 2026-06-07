import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },

    slotRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    doctorId: {
      type: String,
      required: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    note: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      // pending -> when user booked an appointment but not confirmed by admin
      // confirmed -> when admin confirmed the appointment
      // cancelled -> when admin/doctor cancelled the appointment
      // completed -> when user completed the appointment
      default: "pending",
    },
  },

  {
    timestamps: true,
  },
);

export default mongoose.model("Appointment", appointmentSchema);
