import mongoose from "mongoose";

const backupRoleSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true,
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

const BackupRole = mongoose.model("BackupRole", backupRoleSchema);

export default BackupRole;