import mongoose from 'mongoose';

const periodDayNoteSchema = new mongoose.Schema(
  {
    userId: {
      required: true,
      type: String,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    time: {
      type: String,
      default: () =>
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
    },

    note: {
      type: String,
      maxLength: 1000,
      default: '',
    },
  },
  { timestamps: true }
);
/* =========================================================
   🔹 Export Model
========================================================= */

export default mongoose.model('PeriodDateNote', periodDayNoteSchema);
