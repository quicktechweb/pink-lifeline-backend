import mongoose from "mongoose";

// 🔹 Qualification Schema
const qualificationSchema = new mongoose.Schema(
  {
    degree: {
      type: [String], // Example: ["MBBS", "MD"]
      required: true,
    },

    institutionName: {
      type: String,
      required: true,
      trim: true,
    },

    passingYear: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

// 🔹 Main User / Doctor Schema
const userSchema = new mongoose.Schema(
  {
    // Custom User ID
    userId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    /**
     * type:
     * 0 = normal user
     * 1 = doctor
     */
    type: {
      type: Number,
      enum: [0, 1],
      required: true,
    },

    isDoctor: {
      type: Number,
      default: 0,
    },

    isUser: {
      type: Number,
      default: 0,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    isVerified:{
      type:Boolean,
      default:false
    },

    phoneNumber: {
      type: String,
      unique: true,
      sparse: true, // prevents duplicate null issue
      trim: true,
    },

    aboutMe: {
      type: String,
      default: "",
      trim: true,
    },

    // 🔥 Doctor-only fields

    doctorRegistrationNumber: {
      type: String,
      trim: true,
    },

    currentWorkplace: {
      type: String,
      trim: true,
    },

    currentDesignation: {
      type: String,
      trim: true,
    },

    qualifications: {
      type: [qualificationSchema],
      default: [],
    },

    doctorIdCard: {
      url: {
        type: String,
        default: "",
      },

      publicId: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Doctor", userSchema);