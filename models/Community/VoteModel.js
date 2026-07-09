import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
      index: true,
    },

    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: ['upvote', 'downvote'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// POST VOTE
voteSchema.index(
  { userId: 1, postId: 1 },
  {
    // unique: true,
    partialFilterExpression: {
      postId: { $exists: true },
    },
  }
);

// COMMENT VOTE
voteSchema.index(
  { userId: 1, commentId: 1 },
  {
    // unique: true,
    partialFilterExpression: {
      commentId: { $exists: true },
    },
  }
);

export const Vote = mongoose.model('Vote', voteSchema);
