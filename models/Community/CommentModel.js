import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },


    isUpvotedByUser: {
      type: Boolean,
      default: false,
    },


    isDownvotedByUser: {
      type: Boolean,
      default: false,
    },



    name: {
      type: String,
      required: true,
    },

    profilePhoto: {
      type: String,
      default: null,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * null = root comment
     * otherwise reply to another comment
     */
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    /**
     * optional but VERY useful
     */
    // depth: {
    //   type: Number,
    //   default: 0,
    // },

    upvote: {
      type: Number,
      default: 0,
    },

    downvote: {
      type: Number,
      default: 0,
    },

    totalReplies: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.virtual("netvote").get(function () {
  return this.upvote - this.downvote;
});

commentSchema.set("toJSON", { virtuals: true });
commentSchema.set("toObject", { virtuals: true });

export const Comment = mongoose.model("Comment", commentSchema);