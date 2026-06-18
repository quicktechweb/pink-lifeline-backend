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

    password: {
      type: String,
      trim: true,
    },

    // Custom User ID
    score: {
      type: Number,
      required: true,
      default: 10,
    },
    profilePhoto: {
      type: String,
      default: null,
    },

    /**
     * type:
     * 0 = normal user
     * 1 = doctor
     * 2 = admin
     */
    type: {
      type: Number,
      enum: [0, 1,2],
      required: true,
    },

    role: {
      type: String,
      trim: true,
      enum: [
        "admin", 
        "superadmin",
        "communitymodarator",
        "appointmentmanager",
        "doctormanager",
      ],
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
      type: Number,
      default: 3,
      min: 1,
      max: 5,
    },

    notificationPreferenceTime: {
      type: String,
      default: "09:00",
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

notificationPreferenceDate: {
  type: Number,
  default: 0,
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

    doctorWishList: {
      type: [String],
      default: [],
    },


    adminStatus:{
      type: String,
      enum: ['pending', 'suspended', 'active'] // Allowed values
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

    specialties: {
      type: [String],
      default: [],
    },

    location: {
      type: String,
      trim: true,
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
