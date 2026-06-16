import mongoose from "mongoose";

// 🔹 Symptoms Schema
export const symptomSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: false,
      unique: true,
      trim: true,
    },

    isRecent: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
  },
  { _id: true },
);

export const Symptom = mongoose.model("Symptom", symptomSchema);
