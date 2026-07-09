import mongoose from 'mongoose';

/* =========================
   SPOTTING SCHEMA
========================= */

export const spottingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: false,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   MODEL
========================= */

export const Spotting = mongoose.model('Spotting', spottingSchema);
