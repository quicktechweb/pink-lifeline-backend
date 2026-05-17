/* =========================
   ANSWER SCHEMA
========================= */

import mongoose from "mongoose";

const selfTestAnswerSchema = new mongoose.Schema(
  {
    answerId: {
      type: Number,
      required: true,
      unique: true,
    },

    title: {
      type: String,
      required: true,
    },

    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SelfTestQuestion",
      required: true,
    },

    score: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const SelfTestAnswer = mongoose.model("SelfTestAnswer", selfTestAnswerSchema);
