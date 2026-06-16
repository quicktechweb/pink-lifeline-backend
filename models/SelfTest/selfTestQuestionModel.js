import mongoose from "mongoose";


const selfTestQuestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    stepId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SelfTestStep",
      required: true,
    },

    stepNo: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);


export const SelfTestQuestion = mongoose.model("SelfTestQuestion", selfTestQuestionSchema);
