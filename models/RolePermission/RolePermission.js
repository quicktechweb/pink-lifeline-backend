import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: [
        'superadmin',
        'admin',
        'communitymodarator',
        'appointmentmanager',
        'doctormanager',
      ],
    },
    routeJSON: {
      type: String,
      required: true,
      default: '[]',
    },
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.model('Role', roleSchema);

export default Role;
