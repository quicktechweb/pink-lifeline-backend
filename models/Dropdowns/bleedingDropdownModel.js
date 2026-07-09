import mongoose from 'mongoose';

// 🔹 Bleeding Schema
export const bleedingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: false,
      unique: true,
      trim: true,
    },
    flowLevel: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: 0,
    },

    // 🔹 Added from DailyLog schema
    hadFlow: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

bleedingSchema.pre('save', function (next) {
  const allowedFlowLevels = [0, 1, 2, 3];

  if (!allowedFlowLevels.includes(this.flowLevel)) {
    return next(new Error('flowLevel must be 0, 1, 2, or 3'));
  }

  next();
});

bleedingSchema.pre('save', function (next) {
  this.hadFlow = this.flowLevel !== 0;
  next();
});

export const Bleeding = mongoose.model('Bleeding', bleedingSchema);
