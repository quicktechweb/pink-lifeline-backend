import mongoose from "mongoose";
import { bleedingSchema } from "../Dropdowns/bleedingDropdownModel.js";
import { symptomSchema } from "../Dropdowns/symptomsDropdownModel.js";
import { spottingSchema } from "../Dropdowns/spottingDropdownModel.js";

/* =========================================================
   🔹 Reusable Schemas
========================================================= */

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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

periodTrackerSchema.virtual("periodDuration").get(function () {
  if (!this.startDate || !this.endDate) {
    return undefined; // won't appear in JSON
  }

  const diffInDays =
    Math.floor(
      (new Date(this.endDate) - new Date(this.startDate)) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  return diffInDays;
});

/* =========================================================
   🔹 Export Model
========================================================= */

export default mongoose.model("PeriodTracker", periodTrackerSchema);
