import mongoose from "mongoose";












// 🔹 Bleeding Schema
const bleedingSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      enum: [0, 1],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    flowLevel: {
      type: Number,
      enum: [0, 1, 2, 3],
      required: false,
    },
  },
  { _id: true }
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

    isRecent: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
  },
  { _id: true }
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
  { _id: true }
);


























// 🔹 Period Schema
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
    
  },
  { _id: true }
);























// 🔹 Main Period Tracker Schema
const periodTrackerSchema = new mongoose.Schema(
  {
    userId:{
      type:String,
      required:true
    },
    isStart:{
      type:Number,require:false
    },
    isEnd:{
      type:Number,require:false
    },
    startDate: {
      type: Date,
      required: false,
    },
    currentDate:{
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
    },
    period: {
      type: [periodSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "PeriodTracker",
  periodTrackerSchema
);