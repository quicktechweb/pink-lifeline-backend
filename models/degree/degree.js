import mongoose from 'mongoose';

const degreeSchema = new mongoose.Schema(
  {
    degreeName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Degree = mongoose.model('Degree', degreeSchema);

export default Degree;
