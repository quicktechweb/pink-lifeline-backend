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

    isVerified: {
      type: Boolean,
      default: false,
    },

    phoneNumber: {
      type: String,
      unique: true,
      sparse: true, // prevents duplicate null issue
      trim: true,
      default: null,
    },





    //? user-specific fields

    autoReminderLimit: {
      type:Number,
      default: 3,
      min: 1,
      max: 5,
    },

    
    notificationPreferenceTime: {
      type: String,
      default: "09:00",
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },


    dateOfBirth: {
    type: Date,
    default: null,
    validate: {
      validator: function (value) {
        return !value || value <= new Date();
      },
      message: "Date of birth cannot be in the future.",
    },
  },














    //? Doctor-specific fields

    aboutMe: {
      type: String,
      default: "",
      trim: true,
    },

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

    isRemoved: {
      type: Boolean,
      default: false,
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
