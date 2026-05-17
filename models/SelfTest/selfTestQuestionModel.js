import mongoose from "mongoose";

/* =========================
   QUESTION SCHEMA
========================= */

const selfTestQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: Number,
      required: true,
      unique: true,
    },

    title: {
      type: String,
      required: true,
    },

    stepId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SelfTestStep",
      required: true,
    },

    serial: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const SelfTestQuestion = mongoose.model("SelfTestQuestion", selfTestQuestionSchema);
