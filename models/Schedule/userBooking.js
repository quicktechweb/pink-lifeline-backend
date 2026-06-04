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

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "confirmed",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Appointment", appointmentSchema);
