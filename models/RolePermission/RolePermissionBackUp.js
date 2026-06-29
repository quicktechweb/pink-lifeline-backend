import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "superadmin",
        "admin", 
        "communitymodarator",
        "appointmentmanager",
        "doctormanager",
      ],
    },
    routeJSON: {
      type: String,
      required: true,
      default: "[]",
    },
  },
  {
    timestamps: true,
  }
);

const RoleBackup = mongoose.model("RoleBackup", roleSchema);

export default RoleBackup;