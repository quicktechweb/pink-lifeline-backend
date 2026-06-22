import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    // ── Who ──────────────────────────────────────────────────────────────────
    userId: {
      type: String,
      required: true,
      index: true,
    },

    doctorUserId: {
      type: String,
      required: true,
      index: true,
    },

    // ── When ─────────────────────────────────────────────────────────────────
    appointmentDate: {
      type: String,           // "YYYY-MM-DD"  e.g. "2026-06-15"
      required: true,
      index: true,
    },

    startTime: {
      type: String,           // "HH:MM"  e.g. "09:00"
      required: true,
    },

    endTime: {
      type: String,           // "HH:MM"  e.g. "10:00"
      required: true,
    },

    // ── Status ───────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
      index: true,
    },

    cancelledBy: {
      type: String,
      enum: ["user", "doctor", "admin", null],
      default: null,
    },

    // ── Extra ─────────────────────────────────────────────────────────────────
    note: {
      type: String,
      default: "",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  },
);

// ── Compound indexes ──────────────────────────────────────────────────────────
appointmentSchema.index({ doctorUserId: 1, appointmentDate: 1 });
appointmentSchema.index({ userId: 1, appointmentDate: 1 });

export const 
Appointment = mongoose.model("Appointment", appointmentSchema);