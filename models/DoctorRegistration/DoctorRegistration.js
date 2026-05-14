import mongoose from "mongoose";

// 🔹 Qualification Schema
const qualificationSchema = new mongoose.Schema({
  degree: {
    type: [String], // ["MBBS", "MD"] / ["BDS"]
    required: true,
  },
  institutionName: {
    type: String,
    required: true,
  },
  passingYear: {
    type: Number,
    required: true,
  },
});

// 🔹 Main User Schema
const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
    },


    type: {
      type: Number,
      enum: [1, 0],
      required: true,
    }, //type 1 is doctor and 0 is user

    fullName: {
      type: String,
      required: true,
    },
    isDoctor: { type: Number, default: 0 }, 
    isUser: { type: Number, default: 0 }, 
    email: {
      type: String,
      required: true,
    },
    doctorIdCard: {
      url: {
        type: String,
        default: "",
      },
      deleteUrl: {
        type: String,
        default: "",
      },
    },

    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // 🔥 Doctor-only fields
    doctorRegistrationNumber: {
      type: String,
      required: function () {
        return this.type === "doctor";
      },
    },

    currentWorkplace: {
      type: String,
      required: function () {
        return this.type === "doctor";
      },
    },

    currentDesignation: {
      type: String,
      required: function () {
        return this.type === "doctor";
      },
    },

    aboutMe: {
      type: String,
    },

    qualifications: {
      type: [qualificationSchema],
      default: [],
    },

    doctorIdCard: {
      url: String,
      publicId: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Doctor", userSchema);
