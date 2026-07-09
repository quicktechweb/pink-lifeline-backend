import mongoose from 'mongoose';

/* =========================
   SELF TEST ANSWER LOG
========================= */

const selfTestItemSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'SelfTestQuestion',
    },
    answerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    answerScore: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

/* =========================
   MAIN USER SUBMISSION
========================= */

const userSelfTestSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    currentDate: {
      type: Date,
      default: Date.now,
    },

    score: {
      type: Number,
      default: 0,
    },

    // selfTest: {
    //   type: [selfTestItemSchema],
    //   default: [],
    // },
  },
  {
    timestamps: true,
  }
);

export const UserSelfTest = mongoose.model('UserSelfTest', userSelfTestSchema);
