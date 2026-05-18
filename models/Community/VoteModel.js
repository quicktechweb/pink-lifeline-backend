import mongoose from "mongoose";

const voteSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["upvote", "downvote"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 🔥 prevent duplicate vote per user per post
voteSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const Vote = mongoose.model("Vote", voteSchema);