import mongoose from "mongoose";

/* =========================
   ANSWER SCHEMA
========================= */

const selfTestAnswerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    score: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    _id: true,
  },
);

/* =========================
   QUESTION SCHEMA
========================= */

const selfTestQuestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    answers: [selfTestAnswerSchema],
  },
  {
    _id: true,
  },
);

/* =========================
   STEP SCHEMA
========================= */

const selfTestStepSchema = new mongoose.Schema(
  {
    stepNo: {
      type: Number,
      required: true,
      unique: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    videoURL: {
      type: String,
      required: true,
      trim: true,
    },

    questions: [selfTestQuestionSchema],
  },
  {
    timestamps: true,
  },
);

export const SelfTestStep = mongoose.model("SelfTestStep", selfTestStepSchema);
