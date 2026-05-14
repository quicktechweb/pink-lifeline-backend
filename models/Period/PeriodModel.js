import mongoose from "mongoose";

/* =========================================================
   🔹 Reusable Schemas
========================================================= */

// 🔹 Bleeding Schema
const bleedingSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      enum: [0, 1, 2, 3],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    flowLevel: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: 0,
    },

    // 🔹 Added from DailyLog schema
    isSpotting: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true },
);

// 🔹 Symptoms Schema
const symptomSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: false,
    },

    id: {
      type: Number,
      required: false,
    },

    // // 🔹 Added from DailyLog schema
    // severity: {
    //   type: Number,
    //   enum: [1, 2, 3],
    //   required: false,
    // },

    isRecent: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
  },
  { _id: true },
);

// 🔹 Spotting Schema
const spottingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: false,
    },

    id: {
      type: Number,
      required: false,
    },
  },
  { _id: true },
);

/* =========================================================
   🔹 Period Day Schema
========================================================= */

const periodSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },

    bleeding: {
      type: bleedingSchema,
      required: false,
    },

    symptoms: {
      type: [symptomSchema],
      default: [],
    },

    spotting: {
      type: [spottingSchema],
      default: [],
    },

    // 🔹 Added from DailyLog schema
    notes: {
      type: String,
      maxLength: 500,
      default: "",
    },
  },
  { _id: true },
);

/* =========================================================
   🔹 Main Period Tracker Schema
========================================================= */

const periodTrackerSchema = new mongoose.Schema(
  {
    userId: {
      required: true,
      type: String,
    },

    period: {
      type: [periodSchema],
      default: [],
    },
  },
  { timestamps: true },
);

/* =========================================================
   🔹 Export Model
========================================================= */

export default mongoose.model("PeriodTracker", periodTrackerSchema);
