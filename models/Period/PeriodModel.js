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
    hadFlow: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true },
);

bleedingSchema.pre("save", function (next) {
  this.hadFlow = this.flowLevel !== 0;
  next();
});

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
    currentDate: {
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

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    currentDate: {
      type: Date,
      required: true,
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
