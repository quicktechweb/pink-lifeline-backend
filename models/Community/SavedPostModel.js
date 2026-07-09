import mongoose from 'mongoose';

const savedPostSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },

    postOwnerId: {
      type: String,
      default: null,
      trim: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

savedPostSchema.index(
  {
    userId: 1,
    postId: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model('SavedPost', savedPostSchema);
