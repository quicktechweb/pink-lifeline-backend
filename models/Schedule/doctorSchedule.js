import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true,
  },

  endTime: {
    type: String,
    required: true,
  },
  maxAppointments: {
    type: Number,
    required: true,
    default: 20,
  },
});

const daySchema = new mongoose.Schema({
  isEnable: {
    type: Boolean,
    default: false,
  },

  time: {
    type: [timeSlotSchema],
    default: [],
  },
});

const weeklyDaysSchema = new mongoose.Schema(
  {
    doctorUserId: {
      type: String,
      required: true,
    },
    mon: {
      type: daySchema,
      default: () => ({}),
    },

    tue: {
      type: daySchema,
      default: () => ({}),
    },

    wed: {
      type: daySchema,
      default: () => ({}),
    },

    thu: {
      type: daySchema,
      default: () => ({}),
    },

    fri: {
      type: daySchema,
      default: () => ({}),
    },

    sat: {
      type: daySchema,
      default: () => ({}),
    },

    sun: {
      type: daySchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

export const WeeklyDays = mongoose.model('WeeklyDays', weeklyDaysSchema);

const exceptionalDaySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    doctorUserId: {
      type: String,
      required: true,
    },

    isEnable: {
      type: Boolean,
      default: true,
    },

    time: {
      type: [timeSlotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const ExceptionalDays = mongoose.model(
  'ExceptionalDays',
  exceptionalDaySchema
);
