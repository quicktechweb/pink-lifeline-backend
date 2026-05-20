import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    profilePhoto: {
      type: String,
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    hashtags: {
      type: [String],
      default: [],
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    photo: {
      type: String,
      default: null,
    },

    upvote: {
      type: Number,
      default: 0,
    },

    downvote: {
      type: Number,
      default: 0,
    },

    isUpvotedByUser: {
      type: Boolean,
      default: false,
    },

    isDownvotedByUser: {
      type: Boolean,
      default: false,
    },

    type: {
      type: Number,
      enum: [0, 1],
      required: true,
    },

    isSavedByUser: {
      type: Boolean,
      default: false,
    },

    totalComments: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

postSchema.virtual("netvote").get(function () {
  return this.upvote - this.downvote;
});

postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

export const Post = mongoose.model("Post", postSchema);
